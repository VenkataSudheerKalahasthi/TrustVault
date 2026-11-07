import { prisma, User, Document, UserRole, PermissionType, AuditActionType, AuditResult } from '@trustvault/database';
import { StorageService } from '../storage/storage.service';
import { validateFileSignature } from './documents.upload';
import { calculateFileHash } from '../../utils/hash';
import { logAuditEvent } from '../audit/audit.service';
import crypto from 'crypto';

export class DocumentsService {
  /**
   * Upload a new confidential document and create initial version v1
   */
  static async uploadDocument(params: {
    file: Express.Multer.File;
    title: string;
    description?: string;
    categoryId?: string;
    user: User;
    ipAddress?: string;
    userAgent?: string;
    correlationId?: string;
  }) {
    // 1. Signature validation
    const signatureCheck = validateFileSignature(params.file.buffer, params.file.originalname, params.file.mimetype);
    if (!signatureCheck.isValid) {
      await logAuditEvent({
        action: AuditActionType.DOCUMENT_UPLOADED,
        result: AuditResult.FAILURE,
        actor: params.user,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        correlationId: params.correlationId,
        failureReason: signatureCheck.error,
      });
      throw new Error(`File validation rejected: ${signatureCheck.error}`);
    }

    const documentId = crypto.randomUUID();
    const fileHash = calculateFileHash(params.file.buffer);
    const storagePath = StorageService.generateStoragePath(documentId, 1, params.file.originalname);

    // 2. Upload file to private storage
    await StorageService.uploadFile(storagePath, params.file.buffer, params.file.mimetype);

    // 3. Persist document & initial version transactionally
    const result = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          id: documentId,
          title: params.title,
          description: params.description,
          ownerId: params.user.id,
          categoryId: params.categoryId || null,
          currentVersion: 1,
          storagePath,
          originalFileName: params.file.originalname,
          mimeType: params.file.mimetype,
          fileSize: params.file.size,
          fileHash,
        },
        include: {
          owner: { select: { id: true, email: true, firstName: true, lastName: true } },
          category: true,
        },
      });

      await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: 1,
          storagePath,
          originalFileName: params.file.originalname,
          mimeType: params.file.mimetype,
          fileSize: params.file.size,
          fileHash,
          changeSummary: 'Initial document upload',
          uploadedById: params.user.id,
        },
      });

      return doc;
    }, { timeout: 15000, maxWait: 10000 });

    // 4. Record audit event
    await logAuditEvent({
      action: AuditActionType.DOCUMENT_UPLOADED,
      result: AuditResult.SUCCESS,
      actor: params.user,
      documentId: result.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      correlationId: params.correlationId,
      metadata: {
        fileName: params.file.originalname,
        fileSize: params.file.size,
        mimeType: params.file.mimetype,
        fileHash,
      },
    });

    return result;
  }

  /**
   * List documents based on user's authorization boundary
   */
  static async listDocuments(params: {
    user: User;
    page: number;
    limit: number;
    search?: string;
    categoryId?: string;
    ownerId?: string;
  }) {
    const skip = (params.page - 1) * params.limit;
    const whereClause: any = { isDeleted: false };

    if (params.categoryId) {
      whereClause.categoryId = params.categoryId;
    }

    if (params.search) {
      whereClause.title = { contains: params.search, mode: 'insensitive' };
    }

    // Role-based visibility isolation
    if (params.user.role === UserRole.ADMIN) {
      // Admin sees metadata of all non-deleted documents
      if (params.ownerId) {
        whereClause.ownerId = params.ownerId;
      }
    } else if (params.user.role === UserRole.DOCUMENT_OWNER) {
      // Owner sees owned documents AND documents shared with them
      whereClause.OR = [
        { ownerId: params.user.id },
        {
          permissions: {
            some: {
              userId: params.user.id,
              isRevoked: false,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          },
        },
      ];
    } else {
      // Viewer sees ONLY explicitly shared, active documents
      whereClause.permissions = {
        some: {
          userId: params.user.id,
          isRevoked: false,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      };
    }

    const [total, documents] = await Promise.all([
      prisma.document.count({ where: whereClause }),
      prisma.document.findMany({
        where: whereClause,
        skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, email: true, firstName: true, lastName: true } },
          category: true,
          permissions: {
            where: {
              userId: params.user.id,
              isRevoked: false,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            select: { permission: true, canDownload: true },
          },
        },
      }),
    ]);

    return {
      documents: documents.map((doc) => ({
        ...doc,
        isOwner: doc.ownerId === params.user.id,
        userPermission: doc.ownerId === params.user.id ? PermissionType.OWNER : doc.permissions[0]?.permission || null,
        canDownload: doc.ownerId === params.user.id ? true : doc.permissions[0]?.canDownload ?? false,
      })),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  /**
   * Get document metadata and version history
   */
  static async getDocumentById(id: string, user: User) {
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
        category: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          select: {
            id: true,
            versionNumber: true,
            originalFileName: true,
            fileSize: true,
            fileHash: true,
            changeSummary: true,
            createdAt: true,
          },
        },
        permissions: {
          where: { isRevoked: false },
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
            grantedBy: { select: { id: true, email: true } },
          },
        },
      },
    });

    if (!document || document.isDeleted) {
      throw new Error('Document not found');
    }

    await logAuditEvent({
      action: AuditActionType.DOCUMENT_VIEWED,
      result: AuditResult.SUCCESS,
      actor: user,
      documentId: document.id,
      metadata: { action: 'METADATA_VIEW' },
    });

    return document;
  }

  /**
   * Update document metadata
   */
  static async updateDocument(
    id: string,
    data: { title?: string; description?: string; categoryId?: string | null },
    user: User
  ) {
    const updated = await prisma.document.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      },
      include: { category: true },
    });

    await logAuditEvent({
      action: AuditActionType.DOCUMENT_UPDATED,
      result: AuditResult.SUCCESS,
      actor: user,
      documentId: updated.id,
      metadata: { updatedFields: Object.keys(data) },
    });

    return updated;
  }

  /**
   * Replace document content and create a new version
   */
  static async createNewVersion(
    id: string,
    file: Express.Multer.File,
    changeSummary: string,
    user: User
  ) {
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document || document.isDeleted) throw new Error('Document not found');

    const signatureCheck = validateFileSignature(file.buffer, file.originalname, file.mimetype);
    if (!signatureCheck.isValid) throw new Error(`Validation failed: ${signatureCheck.error}`);

    const newVersionNumber = document.currentVersion + 1;
    const fileHash = calculateFileHash(file.buffer);
    const storagePath = StorageService.generateStoragePath(document.id, newVersionNumber, file.originalname);

    await StorageService.uploadFile(storagePath, file.buffer, file.mimetype);

    const result = await prisma.$transaction(async (tx) => {
      const updatedDoc = await tx.document.update({
        where: { id },
        data: {
          currentVersion: newVersionNumber,
          storagePath,
          originalFileName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          fileHash,
        },
      });

      await tx.documentVersion.create({
        data: {
          documentId: id,
          versionNumber: newVersionNumber,
          storagePath,
          originalFileName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          fileHash,
          changeSummary: changeSummary || `Version ${newVersionNumber} upload`,
          uploadedById: user.id,
        },
      });

      return updatedDoc;
    }, { timeout: 15000, maxWait: 10000 });

    await logAuditEvent({
      action: AuditActionType.DOCUMENT_UPDATED,
      result: AuditResult.SUCCESS,
      actor: user,
      documentId: id,
      metadata: {
        newVersion: newVersionNumber,
        fileHash,
        fileName: file.originalname,
      },
    });

    return result;
  }

  /**
   * Soft-delete document and retain historical audit trail
   */
  static async deleteDocument(id: string, user: User) {
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document || document.isDeleted) throw new Error('Document not found');

    const deleted = await prisma.document.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await logAuditEvent({
      action: AuditActionType.DOCUMENT_DELETED,
      result: AuditResult.SUCCESS,
      actor: user,
      documentId: id,
      metadata: { title: document.title, originalFileName: document.originalFileName },
    });

    return deleted;
  }

  /**
   * Stream document binary for authorized preview
   */
  static async streamDocumentContent(id: string, user: User) {
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document || document.isDeleted) throw new Error('Document not found');

    const buffer = await StorageService.downloadFile(document.storagePath);

    await logAuditEvent({
      action: AuditActionType.DOCUMENT_VIEWED,
      result: AuditResult.SUCCESS,
      actor: user,
      documentId: document.id,
      metadata: { preview: true },
    });

    return {
      buffer,
      mimeType: document.mimeType,
      originalFileName: document.originalFileName,
    };
  }

  /**
   * Stream document binary for authorized download
   */
  static async streamDocumentDownload(
    id: string,
    user: User,
    ipAddress?: string,
    userAgent?: string
  ) {
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document || document.isDeleted) throw new Error('Document not found');

    const buffer = await StorageService.downloadFile(document.storagePath);

    // Record Download Record
    await prisma.downloadRecord.create({
      data: {
        documentId: document.id,
        versionNumber: document.currentVersion,
        userId: user.id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    // Record Audit Event
    await logAuditEvent({
      action: AuditActionType.DOCUMENT_DOWNLOADED,
      result: AuditResult.SUCCESS,
      actor: user,
      documentId: document.id,
      ipAddress,
      userAgent,
      metadata: {
        version: document.currentVersion,
        fileSize: document.fileSize,
        fileHash: document.fileHash,
      },
    });

    return {
      buffer,
      mimeType: document.mimeType,
      originalFileName: document.originalFileName,
    };
  }
}

