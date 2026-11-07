import { Request, Response, NextFunction } from 'express';
import { prisma, User, UserRole } from '@trustvault/database';
import { clerkClient, isClerkConfigured } from '../config/clerk';
import { env } from '../config/env';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      id?: string;
    }
  }
}

export async function requireAuthentication(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const testUserId = req.headers['x-test-user-id'] as string;

    // Test environment harness support for automated adversarial test scenarios
    if ((process.env.NODE_ENV === 'test' || process.env.ENABLE_TEST_HARNESS === 'true') && testUserId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testUserId);
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            ...(isUuid ? [{ id: testUserId }] : []),
            { clerkId: testUserId },
            { email: testUserId },
          ],
        },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Test authentication user not found',
          },
        });
      }

      req.user = user;
      return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token is missing. Please provide a valid Bearer token.',
        },
      });
    }

    const token = authHeader.split(' ')[1];

    if (!isClerkConfigured || !clerkClient) {
      // In development / demo mode when Clerk credentials are not yet configured
      // Fallback to decode or bootstrap user
      const user = await prisma.user.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      if (user) {
        req.user = user;
        return next();
      }

      return res.status(503).json({
        success: false,
        error: {
          code: 'CLERK_NOT_CONFIGURED',
          message: 'Clerk authentication keys are not configured. Please set CLERK_SECRET_KEY in apps/api/.env',
        },
      });
    }

    // Verify token with Clerk SDK
    let clerkId: string;
    try {
      const verified = await clerkClient.authenticateRequest(req as any);
      const auth = verified.toAuth();
      if (!verified.isSignedIn || !auth?.userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Session is invalid or has expired',
          },
        });
      }
      clerkId = auth.userId;
    } catch (e: any) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_VERIFICATION_FAILED',
          message: 'Failed to verify authentication token with identity provider',
        },
      });
    }

    // Synchronize or retrieve user from TrustVault database
    let user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      // Fetch details from Clerk and auto-provision in database
      const clerkUser = await clerkClient.users.getUser(clerkId);
      const email = clerkUser.emailAddresses[0]?.emailAddress || `${clerkId}@trustvault.user`;
      const isBootstrapAdmin = env.BOOTSTRAP_ADMIN_EMAIL && email.toLowerCase() === env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

      user = await prisma.user.create({
        data: {
          clerkId,
          email,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
          role: isBootstrapAdmin ? UserRole.ADMIN : UserRole.VIEWER,
          isActive: true,
        },
      });
    }

    req.user = user;
    return next();
  } catch (error: any) {
    return next(error);
  }
}
