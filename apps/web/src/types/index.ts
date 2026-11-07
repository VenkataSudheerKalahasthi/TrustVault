export {
  UserRole,
  PermissionType,
  AuditActionType,
  AuditResult,
  AISuggestionStatus,
} from '@trustvault/shared';

export interface ApplicationUser {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  role: 'ADMIN' | 'DOCUMENT_OWNER' | 'VIEWER';
  isActive: boolean;
  createdAt: string;
  _count?: {
    ownedDocuments?: number;
    permissionsReceived?: number;
  };
}

export interface DocumentCategory {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  createdAt: string;
  documentCount?: number;
}

export interface DocumentItem {
  id: string;
  title: string;
  description?: string | null;
  ownerId: string;
  categoryId?: string | null;
  currentVersion: number;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  fileHash: string;
  isArchived: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  category?: DocumentCategory | null;
  isOwner?: boolean;
  userPermission?: 'OWNER' | 'READ' | 'EDIT' | null;
  canDownload?: boolean;
  versions?: DocumentVersionItem[];
  permissions?: DocumentPermissionItem[];
}

export interface DocumentVersionItem {
  id: string;
  versionNumber: number;
  originalFileName: string;
  fileSize: number;
  fileHash: string;
  changeSummary?: string | null;
  createdAt: string;
}

export interface DocumentPermissionItem {
  id: string;
  documentId: string;
  userId: string;
  permission: 'READ' | 'EDIT';
  canDownload: boolean;
  grantedAt: string;
  isRevoked: boolean;
  revokedAt?: string | null;
  revocationReason?: string | null;
  expiresAt?: string | null;
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  grantedBy: {
    id: string;
    email: string;
  };
}

export interface AuditLogItem {
  id: string;
  action: string;
  result: 'SUCCESS' | 'DENIED' | 'FAILURE';
  actorId?: string | null;
  actorClerkId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  targetUserId?: string | null;
  documentId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
  failureReason?: string | null;
  metadata?: Record<string, any> | null;
  sequenceNumber: string;
  previousHash?: string | null;
  currentHash: string;
  createdAt: string;
  actor?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    role?: string | null;
  } | null;
  targetUser?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  document?: {
    id: string;
    title: string;
    originalFileName: string;
  } | null;
}

export interface AISuggestionItem {
  id: string;
  documentId: string;
  targetUserId: string;
  suggestedPermission: 'READ' | 'EDIT';
  reason: string;
  confidenceScore?: number | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  targetUser: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}

