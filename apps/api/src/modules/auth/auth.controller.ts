import { Request, Response, NextFunction } from 'express';
import { prisma } from '@trustvault/database';

export class AuthController {
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const userWithCounts = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          clerkId: true,
          email: true,
          firstName: true,
          lastName: true,
          imageUrl: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              ownedDocuments: { where: { isDeleted: false } },
              permissionsReceived: { where: { isRevoked: false } },
            },
          },
        },
      });

      return res.json({
        success: true,
        data: userWithCounts,
      });
    } catch (error) {
      next(error);
    }
  }
}

