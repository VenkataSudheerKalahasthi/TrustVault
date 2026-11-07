-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "trustvault";

-- CreateEnum
CREATE TYPE "trustvault"."UserRole" AS ENUM ('ADMIN', 'DOCUMENT_OWNER', 'VIEWER');

-- CreateEnum
CREATE TYPE "trustvault"."PermissionType" AS ENUM ('READ', 'EDIT', 'OWNER');

-- CreateEnum
CREATE TYPE "trustvault"."AuditActionType" AS ENUM ('DOCUMENT_UPLOADED', 'DOCUMENT_VIEWED', 'DOCUMENT_DOWNLOADED', 'DOCUMENT_UPDATED', 'DOCUMENT_DELETED', 'DOCUMENT_PERMISSION_GRANTED', 'DOCUMENT_PERMISSION_REVOKED', 'ACCESS_DENIED', 'LOGIN_SECURITY_EVENT', 'ROLE_CHANGED', 'USER_ACCESS_DISABLED', 'AI_SUGGESTION_GENERATED', 'AI_SUGGESTION_DECISION');

-- CreateEnum
CREATE TYPE "trustvault"."AuditResult" AS ENUM ('SUCCESS', 'DENIED', 'FAILURE');

-- CreateEnum
CREATE TYPE "trustvault"."AISuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE IF NOT EXISTS "trustvault"."User" (
    "id" UUID NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "imageUrl" TEXT,
    "role" "trustvault"."UserRole" NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "trustvault"."Category" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#475569',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "trustvault"."Document" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" UUID NOT NULL,
    "categoryId" UUID,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "storagePath" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileHash" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "trustvault"."DocumentVersion" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileHash" TEXT NOT NULL,
    "changeSummary" TEXT,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "trustvault"."DocumentPermission" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "permission" "trustvault"."PermissionType" NOT NULL,
    "canDownload" BOOLEAN NOT NULL DEFAULT true,
    "grantedById" UUID NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokedById" UUID,
    "revocationReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "trustvault"."DownloadRecord" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "userId" UUID NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DownloadRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "trustvault"."AuditLog" (
    "id" UUID NOT NULL,
    "action" "trustvault"."AuditActionType" NOT NULL,
    "result" "trustvault"."AuditResult" NOT NULL DEFAULT 'SUCCESS',
    "actorId" UUID,
    "actorClerkId" TEXT,
    "actorEmail" TEXT,
    "actorRole" TEXT,
    "targetUserId" UUID,
    "documentId" UUID,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "correlationId" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB,
    "sequenceNumber" BIGSERIAL NOT NULL,
    "previousHash" TEXT,
    "currentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "trustvault"."AISuggestion" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "suggestedPermission" "trustvault"."PermissionType" NOT NULL DEFAULT 'READ',
    "reason" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "status" "trustvault"."AISuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" UUID,
    "decisionReason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AISuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_clerkId_key" ON "trustvault"."User"("clerkId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "trustvault"."User"("email");
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "trustvault"."User"("role");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "trustvault"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "trustvault"."Category"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Document_ownerId_idx" ON "trustvault"."Document"("ownerId");
CREATE INDEX IF NOT EXISTS "Document_categoryId_idx" ON "trustvault"."Document"("categoryId");
CREATE INDEX IF NOT EXISTS "Document_isArchived_isDeleted_idx" ON "trustvault"."Document"("isArchived", "isDeleted");
CREATE INDEX IF NOT EXISTS "Document_createdAt_idx" ON "trustvault"."Document"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentVersion_documentId_versionNumber_key" ON "trustvault"."DocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DocumentPermission_documentId_userId_isRevoked_idx" ON "trustvault"."DocumentPermission"("documentId", "userId", "isRevoked");
CREATE INDEX IF NOT EXISTS "DocumentPermission_userId_isRevoked_idx" ON "trustvault"."DocumentPermission"("userId", "isRevoked");
CREATE INDEX IF NOT EXISTS "DocumentPermission_documentId_isRevoked_idx" ON "trustvault"."DocumentPermission"("documentId", "isRevoked");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DownloadRecord_documentId_idx" ON "trustvault"."DownloadRecord"("documentId");
CREATE INDEX IF NOT EXISTS "DownloadRecord_userId_idx" ON "trustvault"."DownloadRecord"("userId");
CREATE INDEX IF NOT EXISTS "DownloadRecord_downloadedAt_idx" ON "trustvault"."DownloadRecord"("downloadedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "trustvault"."AuditLog"("actorId");
CREATE INDEX IF NOT EXISTS "AuditLog_documentId_idx" ON "trustvault"."AuditLog"("documentId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "trustvault"."AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_result_idx" ON "trustvault"."AuditLog"("result");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "trustvault"."AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_sequenceNumber_idx" ON "trustvault"."AuditLog"("sequenceNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AISuggestion_documentId_status_idx" ON "trustvault"."AISuggestion"("documentId", "status");
CREATE INDEX IF NOT EXISTS "AISuggestion_targetUserId_idx" ON "trustvault"."AISuggestion"("targetUserId");

-- Foreign Keys (using DO blocks to prevent failure if constraint already exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Document_ownerId_fkey') THEN
        ALTER TABLE "trustvault"."Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "trustvault"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Document_categoryId_fkey') THEN
        ALTER TABLE "trustvault"."Document" ADD CONSTRAINT "Document_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "trustvault"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocumentVersion_documentId_fkey') THEN
        ALTER TABLE "trustvault"."DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "trustvault"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocumentVersion_uploadedById_fkey') THEN
        ALTER TABLE "trustvault"."DocumentVersion" ADD CONSTRAINT "DocumentVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "trustvault"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocumentPermission_documentId_fkey') THEN
        ALTER TABLE "trustvault"."DocumentPermission" ADD CONSTRAINT "DocumentPermission_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "trustvault"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocumentPermission_userId_fkey') THEN
        ALTER TABLE "trustvault"."DocumentPermission" ADD CONSTRAINT "DocumentPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "trustvault"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocumentPermission_grantedById_fkey') THEN
        ALTER TABLE "trustvault"."DocumentPermission" ADD CONSTRAINT "DocumentPermission_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "trustvault"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocumentPermission_revokedById_fkey') THEN
        ALTER TABLE "trustvault"."DocumentPermission" ADD CONSTRAINT "DocumentPermission_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "trustvault"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DownloadRecord_documentId_fkey') THEN
        ALTER TABLE "trustvault"."DownloadRecord" ADD CONSTRAINT "DownloadRecord_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "trustvault"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DownloadRecord_userId_fkey') THEN
        ALTER TABLE "trustvault"."DownloadRecord" ADD CONSTRAINT "DownloadRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "trustvault"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_actorId_fkey') THEN
        ALTER TABLE "trustvault"."AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "trustvault"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_targetUserId_fkey') THEN
        ALTER TABLE "trustvault"."AuditLog" ADD CONSTRAINT "AuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "trustvault"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_documentId_fkey') THEN
        ALTER TABLE "trustvault"."AuditLog" ADD CONSTRAINT "AuditLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "trustvault"."Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AISuggestion_documentId_fkey') THEN
        ALTER TABLE "trustvault"."AISuggestion" ADD CONSTRAINT "AISuggestion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "trustvault"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AISuggestion_targetUserId_fkey') THEN
        ALTER TABLE "trustvault"."AISuggestion" ADD CONSTRAINT "AISuggestion_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "trustvault"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AISuggestion_decidedById_fkey') THEN
        ALTER TABLE "trustvault"."AISuggestion" ADD CONSTRAINT "AISuggestion_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "trustvault"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
