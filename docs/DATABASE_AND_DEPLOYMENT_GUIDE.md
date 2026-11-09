# TrustVault — Database Schema, Setup Scripts & Clean-Clone Deployment Guide

## 1. Architectural Overview & Workspaces

TrustVault is an enterprise zero-trust document security platform organized as an npm workspace monorepo. It enforces strict Role-Based Access Control (RBAC), private storage authorization, and a tamper-evident SHA-256 cryptographic audit chain.

```
TrustVault/
├── backend/            # Express REST API & Serverless Handler (Port 5001)
├── admin/              # Standalone Admin Governance Portal (Vite + React, Port 5174)
├── main-portal/        # Client Document Vault for Owners & Viewers (Vite + React, Port 5173)
├── packages/
│   ├── database/       # Prisma ORM, Schema, Migrations & Database Client
│   └── shared/         # Shared TypeScript interfaces & Zod validation schemas
├── api/
│   └── index.js        # Bundled Serverless Function for Vercel Backend Hosting
├── vercel.json         # Vercel Deployment & Routing Configuration
└── package.json        # Root Workspace Definitions & Orchestration Scripts
```

---

## 2. PostgreSQL Database Schema (Prisma ORM)

All database tables reside inside the dedicated PostgreSQL schema `trustvault`.

### 2.1 Enumerations

```prisma
enum UserRole {
  ADMIN
  DOCUMENT_OWNER
  VIEWER
}

enum PermissionType {
  READ
  EDIT
  OWNER
}

enum AuditActionType {
  DOCUMENT_UPLOADED
  DOCUMENT_VIEWED
  DOCUMENT_DOWNLOADED
  DOCUMENT_UPDATED
  DOCUMENT_DELETED
  DOCUMENT_PERMISSION_GRANTED
  DOCUMENT_PERMISSION_REVOKED
  ACCESS_DENIED
  LOGIN_SECURITY_EVENT
  ROLE_CHANGED
  USER_ACCESS_DISABLED
  AI_SUGGESTION_GENERATED
  AI_SUGGESTION_DECISION
}

enum AuditResult {
  SUCCESS
  DENIED
  FAILURE
}

enum SuggestionStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### 2.2 Relational Entities

#### `User` (`trustvault.users`)
Stores synchronized identity records authenticated via Clerk.
* `id` (String, UUID, Primary Key)
* `clerkId` (String, Unique) — External subject ID from Clerk JWT.
* `email` (String, Unique, Indexed) — Normalized lowercase email.
* `firstName` (String, Nullable)
* `lastName` (String, Nullable)
* `role` (`UserRole`, Default: `VIEWER`) — Assigned authorization tier.
* `isActive` (Boolean, Default: `true`) — Immediate account suspension flag.
* `createdAt` / `updatedAt` (DateTime)

#### `Document` (`trustvault.documents`)
Core metadata and storage pointer for uploaded documents.
* `id` (String, UUID, Primary Key)
* `title` (String) — Document display title.
* `description` (String, Nullable)
* `originalFileName` (String) — Original file name with extension.
* `mimeType` (String) — Strict verified MIME type (`application/pdf`, etc.).
* `fileSize` (Int) — File size in bytes (max 25 MB).
* `fileHash` (String) — SHA-256 digest of original binary content.
* `storagePath` (String) — Relative object key in private Supabase bucket.
* `currentVersion` (Int, Default: 1)
* `isArchived` (Boolean, Default: false)
* `isDeleted` (Boolean, Default: false) — Soft deletion flag.
* `ownerId` (String, Foreign Key &rarr; `User.id`)
* `categoryId` (String, Nullable, Foreign Key &rarr; `Category.id`)
* `createdAt` / `updatedAt` (DateTime)

#### `DocumentVersion` (`trustvault.document_versions`)
Immutable historical revisions for versioned documents.
* `id` (String, UUID, Primary Key)
* `documentId` (String, Foreign Key &rarr; `Document.id`, Cascade Delete)
* `versionNumber` (Int)
* `storagePath` (String) — Unique private storage key for this specific revision.
* `fileHash` (String) — SHA-256 content digest of this version.
* `fileSize` (Int) — Version size in bytes.
* `mimeType` (String)
* `changeSummary` (String, Nullable)
* `uploadedById` (String, Foreign Key &rarr; `User.id`)
* `createdAt` (DateTime)

#### `Permission` (`trustvault.permissions`)
Explicit Access Control List (ACL) entries.
* `id` (String, UUID, Primary Key)
* `documentId` (String, Foreign Key &rarr; `Document.id`, Cascade Delete)
* `userId` (String, Foreign Key &rarr; `User.id`)
* `permissionType` (`PermissionType`: `READ` or `EDIT`)
* `canDownload` (Boolean, Default: true) — Granular view-only vs download switch.
* `grantedById` (String, Foreign Key &rarr; `User.id`)
* `isRevoked` (Boolean, Default: false) — Immediate revocation status.
* `revokedAt` (DateTime, Nullable)
* `revokedById` (String, Nullable)
* `createdAt` / `updatedAt` (DateTime)
* Unique Constraint: `(documentId, userId)` where `isRevoked = false`.

#### `Category` (`trustvault.categories`)
Classification taxonomy for vault documents.
* `id` (String, UUID, Primary Key)
* `name` (String, Unique)
* `description` (String, Nullable)
* `color` (String, Nullable, Hex code)
* `createdById` (String, Foreign Key &rarr; `User.id`)
* `createdAt` / `updatedAt` (DateTime)

#### `AuditLog` (`trustvault.audit_logs`)
Append-only cryptographically verifiable hash chain.
* `id` (String, UUID, Primary Key)
* `sequenceNumber` (BigInt, Unique, Autoincrement) — Strictly monotonic index.
* `action` (`AuditActionType`)
* `result` (`AuditResult`)
* `actorId` (String, Nullable) — Authenticated user ID or null for system events.
* `actorEmail` (String, Nullable)
* `targetResourceId` (String, Nullable) — UUID of document, user, or category.
* `targetResourceType` (String, Nullable)
* `previousHash` (String) — 64-character SHA-256 hex digest of previous block.
* `currentHash` (String) — SHA-256 HMAC digest covering all block fields.
* `ipAddress` (String, Nullable)
* `userAgent` (String, Nullable)
* `metadata` (JSONB)
* `timestamp` (DateTime)

#### `AISuggestion` (`trustvault.ai_suggestions`)
Human-in-the-loop deterministic permission access proposals.
* `id` (String, UUID, Primary Key)
* `documentId` (String, Foreign Key &rarr; `Document.id`, Cascade Delete)
* `suggestedUserId` (String, Foreign Key &rarr; `User.id`)
* `reason` (String)
* `confidenceScore` (Float) — Algorithmic relevance rating (0.00 – 1.00).
* `suggestedPermission` (`PermissionType`)
* `status` (`SuggestionStatus`: `PENDING`, `APPROVED`, `REJECTED`)
* `reviewedById` (String, Nullable)
* `reviewedAt` (DateTime, Nullable)
* `createdAt` / `updatedAt` (DateTime)

---

## 3. Clean-Clone Setup Scripts (Step-by-Step)

Follow these exact commands to initialize and run the complete repository on a clean machine.

### 3.1 Prerequisites
* **Node.js**: `v20.x` or `v22.x` (LTS recommended)
* **npm**: `v10.x` or higher
* **Git**: Installed and in PATH
* **Supabase Project**: Active PostgreSQL database and private Storage bucket.
* **Clerk Application**: Configured instance with Publishable Key & Secret Key.

### 3.2 Step 1 — Clone the Repository
```bash
git clone https://github.com/VenkataSudheerKalahasthi/TrustVault.git
cd TrustVault
```

### 3.3 Step 2 — Configure Environment Variables

Create the `.env` file in `backend/`:
```bash
cp backend/.env.example backend/.env
```
Populate `backend/.env` with your actual cloud credentials:
```env
NODE_ENV=development
PORT=5001
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173,http://localhost:5174

# Supabase PostgreSQL (Session/Transaction Pooler)
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?schema=trustvault"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?schema=trustvault"

# Clerk Authentication Keys
CLERK_SECRET_KEY="sk_test_..."
CLERK_PUBLISHABLE_KEY="pk_test_..."

# Supabase Storage Configuration
SUPABASE_URL="https://[REF].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
SUPABASE_STORAGE_BUCKET="trustvault-documents"

# Cryptographic Audit Secret
AUDIT_LOG_SECRET="trustvault-audit-secret-key-prod-2026"

# Bootstrap Admin Configuration
BOOTSTRAP_ADMIN_EMAIL="admin@trustvault.security"
ADMIN_EMAIL_ALLOWLIST="admin@trustvault.security"

# Browser-safe client keys
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
VITE_API_BASE_URL="http://localhost:5001/api/v1"
```

Configure `main-portal/.env`:
```bash
cp main-portal/.env.example main-portal/.env
```
```env
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
VITE_API_BASE_URL="http://localhost:5001/api/v1"
VITE_ADMIN_PORTAL_URL="http://localhost:5174"
```

Configure `admin/.env`:
```bash
cp admin/.env.example admin/.env
```
```env
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
VITE_API_BASE_URL="http://localhost:5001/api/v1"
```

### 3.4 Step 3 — Install Dependencies
From the repository root, install dependencies for all workspaces:
```bash
npm install
```

### 3.5 Step 4 — Run Database Migrations & Seed
Apply the Prisma schema to create tables in the `trustvault` PostgreSQL schema:
```bash
# Push Prisma schema to Supabase database
npm run prisma:push

# Generate Prisma Client with native and RHEL Linux binaries
npm run prisma:generate

# Seed initial categories and bootstrap entities
npm run prisma:seed
```

### 3.6 Step 5 — Run Local Development Servers
Run each service in separate terminal windows, or run backend and frontend concurrently:

```bash
# Terminal 1 — Backend Express API (Port 5001)
npm run dev:backend

# Terminal 2 — Main Portal for Owners & Viewers (Port 5173)
npm run dev:portal

# Terminal 3 — Standalone Admin Portal (Port 5174)
npm run dev:admin
```

### 3.7 Step 6 — Run Verification Test Suites
Verify all 38 unit, integration, and security adversarial test suites:
```bash
npm test
```

---

## 4. Production Deployment Instructions (Vercel)

The platform is designed to deploy to Vercel in two decoupled projects sharing the same scalable backend API.

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Project 1: trustvault-portal│       │   Project 2: trustvault-admin   │
│  - Main Portal (Vite React SPA) │       │ - Standalone Admin Portal (SPA) │
│  - Shared API (Serverless Node) │       │                                 │
│  Live URL: /                    │       │ Live URL: /                     │
│  Backend:  /api/v1/*            │◄──────┼─── Calls Shared API Base URL   │
└────────────────┬────────────────┘       └─────────────────────────────────┘
                 │
                 ▼
     ┌───────────────────────┐
     │  Supabase PostgreSQL  │
     │  & Private S3 Bucket  │
     └───────────────────────┘
```

### 4.1 Project 1 Deployment — Main Portal + Shared Backend API

1. Navigate to **Vercel Dashboard** &rarr; **Add New...** &rarr; **Project**.
2. Select the `TrustVault` repository and click **Import**.
3. Configure the deployment settings:
   * **Project Name**: `trustvault-portal`
   * **Root Directory**: `./` (Leave as repository root)
   * **Application Preset**: `Other` *(Vercel will use root `vercel.json`)*
   * **Build Command**: `npm run build:web`
   * **Output Directory**: `main-portal/dist`
4. Expand **Environment Variables** and upload `backend/.env` via the **Import .env** button, ensuring the following keys are populated:
   * `DATABASE_URL`
   * `DIRECT_URL`
   * `CLERK_SECRET_KEY`
   * `CLERK_PUBLISHABLE_KEY`
   * `SUPABASE_URL`
   * `SUPABASE_SERVICE_ROLE_KEY`
   * `SUPABASE_STORAGE_BUCKET`
   * `AUDIT_LOG_SECRET`
   * `NODE_ENV=production`
   * `VITE_CLERK_PUBLISHABLE_KEY`
   * `VITE_API_BASE_URL=/api/v1`
5. Click **Deploy**.
6. Verify deployment at: `https://[YOUR_PORTAL_DOMAIN].vercel.app/api/health`  
   Expected response:
   ```json
   {
     "status": "healthy",
     "service": "TrustVault Serverless API",
     "environment": "production"
   }
   ```

### 4.2 Project 2 Deployment — Standalone Admin Portal

1. Navigate to **Vercel Dashboard** &rarr; **Add New...** &rarr; **Project**.
2. Select the same `TrustVault` repository and click **Import**.
3. Configure the deployment settings:
   * **Project Name**: `trustvault-admin`
   * **Root Directory**: Click **Edit** &rarr; Select `admin` folder &rarr; Click **Continue**.
   * **Framework Preset**: `Vite` (Detected automatically)
   * **Build Command**: Toggle ON &rarr; `npm run build`
   * **Output Directory**: `dist`
4. Expand **Environment Variables** and configure:
   * `VITE_CLERK_PUBLISHABLE_KEY`: Same Clerk publishable key (`pk_test_...`)
   * `VITE_API_BASE_URL`: **`https://[YOUR_PORTAL_DOMAIN].vercel.app/api/v1`** *(The live Project 1 API endpoint)*
5. Click **Deploy**.

### 4.3 Supabase Private Storage Bucket Configuration

1. In the **Supabase Dashboard**, navigate to **Storage** &rarr; **Buckets**.
2. Ensure the bucket `trustvault-documents` exists and is marked **Private** (Public bucket = `false`).
3. Under Storage Policies, disable all anonymous/public read, list, and write access.
4. All binary access must flow exclusively through the backend API (`/api/v1/documents/:id/content` and `/api/v1/documents/:id/download`) via the `SUPABASE_SERVICE_ROLE_KEY`.

### 4.4 Clerk Authentication Whitelist Configuration

1. Open **Clerk Dashboard** &rarr; Select your application.
2. Under **Configure** &rarr; **Paths** & **Domains**, add the live production URLs to the Allowed Origins list:
   * `https://[YOUR_PORTAL_DOMAIN].vercel.app`
   * `https://[YOUR_ADMIN_DOMAIN].vercel.app`
3. Save changes. Users can now authenticate securely across both portals.

