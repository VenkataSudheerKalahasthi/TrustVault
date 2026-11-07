import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole } from '@trustvault/database';
import { CategoryCreateSchema, CategoryUpdateSchema } from '@trustvault/shared';

export class CategoriesController {
  static async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { documents: { where: { isDeleted: false } } },
          },
        },
      });

      return res.json({
        success: true,
        data: categories.map((c) => ({
          ...c,
          documentCount: c._count.documents,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = CategoryCreateSchema.parse(req.body);
      const category = await prisma.category.create({
        data: validated,
      });

      return res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = CategoryUpdateSchema.parse(req.body);
      const updated = await prisma.category.update({
        where: { id: req.params.id },
        data: validated,
      });

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
      if (req.user!.role !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only administrators can delete categories.' },
        });
      }

      await prisma.category.delete({
        where: { id: req.params.id },
      });

      return res.json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
