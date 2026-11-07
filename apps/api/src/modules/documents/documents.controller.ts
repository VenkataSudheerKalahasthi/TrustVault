import { Request, Response, NextFunction } from 'express';
import { DocumentsService } from './documents.service';
import { DocumentCreateSchema, DocumentUpdateSchema, PaginationQuerySchema } from '@trustvault/shared';

export class DocumentsController {
  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: 'FILE_REQUIRED', message: 'Please attach a document file to upload.' },
        });
      }

      const validated = DocumentCreateSchema.parse(req.body);
      const document = await DocumentsService.uploadDocument({
        file: req.file,
        title: validated.title,
        description: validated.description,
        categoryId: validated.categoryId,
        user: req.user!,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        correlationId: (req.headers['x-correlation-id'] as string) || req.id,
      });

      return res.status(201).json({
        success: true,
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = PaginationQuerySchema.parse(req.query);
      const result = await DocumentsService.listDocuments({
        user: req.user!,
        page: query.page,
        limit: query.limit,
        search: query.search,
        categoryId: req.query.categoryId as string,
        ownerId: req.query.ownerId as string,
      });

      return res.json({
        success: true,
        data: result.documents,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const document = await DocumentsService.getDocumentById(req.params.id, req.user!);
      return res.json({
        success: true,
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = DocumentUpdateSchema.parse(req.body);
      const updated = await DocumentsService.updateDocument(req.params.id, validated, req.user!);
      return res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createVersion(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: 'FILE_REQUIRED', message: 'Replacement document binary is required.' },
        });
      }

      const changeSummary = req.body.changeSummary || 'Uploaded replacement version';
      const updated = await DocumentsService.createNewVersion(req.params.id, req.file, changeSummary, req.user!);
      return res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await DocumentsService.deleteDocument(req.params.id, req.user!);
      return res.json({
        success: true,
        message: 'Document deleted successfully. Historical audit trail preserved.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async streamContent(req: Request, res: Response, next: NextFunction) {
    try {
      const stream = await DocumentsService.streamDocumentContent(req.params.id, req.user!);
      res.setHeader('Content-Type', stream.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(stream.originalFileName)}"`);
      return res.send(stream.buffer);
    } catch (error) {
      next(error);
    }
  }

  static async streamDownload(req: Request, res: Response, next: NextFunction) {
    try {
      const stream = await DocumentsService.streamDocumentDownload(
        req.params.id,
        req.user!,
        req.ip,
        req.headers['user-agent']
      );

      res.setHeader('Content-Type', stream.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(stream.originalFileName)}"`);
      return res.send(stream.buffer);
    } catch (error) {
      next(error);
    }
  }
}
