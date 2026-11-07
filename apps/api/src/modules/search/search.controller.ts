import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole, PermissionType } from '@trustvault/database';
import { DocumentSearchQuerySchema } from '@trustvault/shared';

export class SearchController {
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const query = DocumentSearchQuerySchema.parse(req.query);
      const skip = (query.page - 1) * query.limit;

      const whereClause: any = { isDeleted: false };

      if (query.search) {
        whereClause.OR = [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { originalFileName: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      if (query.categoryId) {
        whereClause.categoryId = query.categoryId;
      }

      if (query.dateFrom || query.dateTo) {
        whereClause.createdAt = {};
        if (query.dateFrom) whereClause.createdAt.gte = new Date(query.dateFrom);
        if (query.dateTo) whereClause.createdAt.lte = new Date(query.dateTo);
      }

      // Authorization scoping (Mandatory RISE requirement: Never return unauthorized documents in search)
      if (req.user!.role === UserRole.ADMIN) {
        if (query.ownerId) {
          whereClause.ownerId = query.ownerId;
        }
      } else if (req.user!.role === UserRole.DOCUMENT_OWNER) {
        whereClause.AND = [
          {
            OR: [
              { ownerId: req.user!.id },
              {
                permissions: {
                  some: {
                    userId: req.user!.id,
                    isRevoked: false,
                    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                  },
                },
              },
            ],
          },
        ];
      } else {
        whereClause.permissions = {
          some: {
            userId: req.user!.id,
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
          take: query.limit,
          orderBy: { createdAt: 'desc' },
          include: {
            owner: { select: { id: true, email: true, firstName: true, lastName: true } },
            category: true,
            permissions: {
              where: {
                userId: req.user!.id,
                isRevoked: false,
              },
              select: { permission: true, canDownload: true },
            },
          },
        }),
      ]);

      return res.json({
        success: true,
        data: documents.map((doc) => ({
          ...doc,
          isOwner: doc.ownerId === req.user!.id,
          userPermission: doc.ownerId === req.user!.id ? PermissionType.OWNER : doc.permissions[0]?.permission || null,
          canDownload: doc.ownerId === req.user!.id ? true : doc.permissions[0]?.canDownload ?? false,
        })),
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
