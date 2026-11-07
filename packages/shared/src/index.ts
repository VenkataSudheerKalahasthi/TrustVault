import { z } from 'zod';

export enum UserRole {
  ADMIN = 'ADMIN',
  DOCUMENT_OWNER = 'DOCUMENT_OWNER',
  VIEWER = 'VIEWER',
}

export enum PermissionType {
  READ = 'READ',
  EDIT = 'EDIT',
  OWNER = 'OWNER',
}

export enum AuditActionType {
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_VIEWED = 'DOCUMENT_VIEWED',
  DOCUMENT_DOWNLOADED = 'DOCUMENT_DOWNLOADED',
  DOCUMENT_UPDATED = 'DOCUMENT_UPDATED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',
  DOCUMENT_PERMISSION_GRANTED = 'DOCUMENT_PERMISSION_GRANTED',
  DOCUMENT_PERMISSION_REVOKED = 'DOCUMENT_PERMISSION_REVOKED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  LOGIN_SECURITY_EVENT = 'LOGIN_SECURITY_EVENT',
  ROLE_CHANGED = 'ROLE_CHANGED',
  USER_ACCESS_DISABLED = 'USER_ACCESS_DISABLED',
  AI_SUGGESTION_GENERATED = 'AI_SUGGESTION_GENERATED',
  AI_SUGGESTION_DECISION = 'AI_SUGGESTION_DECISION',
}

export enum AuditResult {
  SUCCESS = 'SUCCESS',
  DENIED = 'DENIED',
  FAILURE = 'FAILURE',
}

export enum AISuggestionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// Zod Validation Schemas
export const UserRoleUpdateSchema = z.object({
  role: z.nativeEnum(UserRole),
});

export const UserStatusUpdateSchema = z.object({
  isActive: z.boolean(),
});

export const DocumentCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000).optional(),
  categoryId: z.string().uuid('Invalid category ID').optional(),
});

export const DocumentUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  categoryId: z.string().uuid().nullable().optional(),
});

export const GrantPermissionSchema = z.object({
  targetUserId: z.string().uuid('Valid user ID required'),
  permission: z.enum([PermissionType.READ, PermissionType.EDIT]),
  canDownload: z.boolean().default(true),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const RevokePermissionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const CategoryCreateSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code').optional().default('#475569'),
});

export const CategoryUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const AISuggestionDecisionSchema = z.object({
  decision: z.enum([AISuggestionStatus.APPROVED, AISuggestionStatus.REJECTED]),
  permission: z.enum([PermissionType.READ, PermissionType.EDIT]).optional(),
  canDownload: z.boolean().optional().default(true),
});

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const DocumentSearchQuerySchema = PaginationQuerySchema.extend({
  categoryId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const AuditLogQuerySchema = PaginationQuerySchema.extend({
  action: z.nativeEnum(AuditActionType).optional(),
  result: z.nativeEnum(AuditResult).optional(),
  actorId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

