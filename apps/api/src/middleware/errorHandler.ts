import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const correlationId = (req.headers['x-correlation-id'] as string) || req.id || 'N/A';
  const statusCode = err.statusCode || (err instanceof ZodError ? 400 : 500);

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload or parameters',
        issues: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        correlationId,
      },
    });
  }

  // Safe error logging
  if (statusCode >= 500) {
    console.error(`[Error] [${correlationId}] ${err.name}: ${err.message}`, err.stack);
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 403 ? 'FORBIDDEN' : statusCode === 401 ? 'UNAUTHORIZED' : 'INTERNAL_SERVER_ERROR'),
      message: err.message || 'An unexpected error occurred',
      correlationId,
      ...(process.env.NODE_ENV === 'development' && statusCode >= 500 ? { stack: err.stack } : {}),
    },
  });
}
