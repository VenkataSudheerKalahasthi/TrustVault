import { Router, Request, Response } from 'express';
import { prisma } from '@trustvault/database';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  return res.json({
    status: 'UP',
    service: 'TrustVault REST API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.get('/health/database', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: 'UP',
      database: 'Supabase PostgreSQL',
      schema: 'trustvault',
      connected: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(503).json({
      status: 'DOWN',
      database: 'Supabase PostgreSQL',
      connected: false,
      error: error.message,
    });
  }
});

export default router;

