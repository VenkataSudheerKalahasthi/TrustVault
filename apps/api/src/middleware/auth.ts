import { Request, Response, NextFunction } from 'express';
import { prisma, User, UserRole } from '@trustvault/database';
import { verifyToken } from '@clerk/backend';
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
    let clerkId: string | null = null;
    try {
      // Method A: Direct verifyToken on Bearer JWT token
      try {
        const payload = await verifyToken(token, {
          secretKey: env.CLERK_SECRET_KEY,
        });
        if (payload && typeof payload.sub === 'string') {
          clerkId = payload.sub;
        }
      } catch (jwtErr) {
        // Fallback to authenticateRequest if verifyToken encounters format issue
      }

      // Method B: authenticateRequest with valid standard Request URL
      if (!clerkId) {
        const protocol = req.protocol || 'http';
        const host = req.get('host') || 'localhost:5001';
        const fullUrl = `${protocol}://${host}${req.originalUrl || req.url}`;
        const standardHeaders = new globalThis.Headers();
        for (const [k, v] of Object.entries(req.headers)) {
          if (v) {
            standardHeaders.set(k, Array.isArray(v) ? v.join(', ') : v);
          }
        }
        const standardReq = new globalThis.Request(fullUrl, {
          method: req.method,
          headers: standardHeaders,
        });

        const verified = await clerkClient.authenticateRequest(standardReq);
        const auth = verified.toAuth();
        if (verified.isSignedIn && auth?.userId) {
          clerkId = auth.userId;
        }
      }

      if (!clerkId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Session is invalid or has expired',
          },
        });
      }
    } catch (e: any) {
      console.error('[AUTH_VERIFICATION_ERROR]', e);
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

    const adminEmails = (env.BOOTSTRAP_ADMIN_EMAIL || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (!user) {
      // Fetch details from Clerk and auto-provision in database
      const clerkUser = await clerkClient.users.getUser(clerkId);
      const email = clerkUser.emailAddresses[0]?.emailAddress || `${clerkId}@trustvault.user`;
      const isBootstrapAdmin = adminEmails.includes(email.toLowerCase());

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
    } else {
      // If user is designated as bootstrap admin, ensure role is ADMIN
      if (adminEmails.includes(user.email.toLowerCase()) && user.role !== UserRole.ADMIN) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: UserRole.ADMIN },
        });
      }
    }

    req.user = user;
    return next();
  } catch (error: any) {
    return next(error);
  }
}
