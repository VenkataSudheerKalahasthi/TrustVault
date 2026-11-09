import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole } from '@trustvault/database';
import { getAdminEmailAllowlist } from '../../config/env';

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

  /**
   * Synchronize authenticated user profile and handle safe initial role assignment
   */
  static async syncProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const { requestedRole } = req.body || {};
      const adminAllowlist = getAdminEmailAllowlist();
      const isAllowlistedAdmin = adminAllowlist.includes(req.user.email.toLowerCase());

      // Privilege escalation prevention: never allow ADMIN unless verified in allowlist
      if (requestedRole === 'ADMIN' && !isAllowlistedAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Administrative privileges can only be granted to authorized accounts.',
          },
        });
      }

      let updatedRole = req.user.role;

      if (isAllowlistedAdmin) {
        updatedRole = UserRole.ADMIN;
      } else if (requestedRole === 'DOCUMENT_OWNER') {
        updatedRole = UserRole.DOCUMENT_OWNER;
      } else if (requestedRole === 'VIEWER') {
        // Only allow switching to VIEWER if not an admin
        if (req.user.role !== UserRole.ADMIN) {
          updatedRole = UserRole.VIEWER;
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: { role: updatedRole },
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
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }
}

