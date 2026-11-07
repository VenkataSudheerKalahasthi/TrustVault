# TrustVault: Enterprise Document Sharing with a Verifiable Audit Trail

TrustVault is a secure document-sharing platform that allows organizations to upload, organize, share, preview, and manage confidential documents under strict zero-trust access control with real-time access revocation and a cryptographically verifiable audit trail (RISE specification).

---

## 1. Core Architecture & Monorepo Structure

```
trustvault/
├── apps/
│   ├── web/                        # React 18, Vite, TypeScript, Tailwind CSS, TanStack Query
│   └── api/                        # Express.js, TypeScript, Helmet, CORS, Rate Limit, Multer
├── packages/
│   ├── database/                   # Prisma ORM, PostgreSQL schema, migrations, seed
│   └── shared/                     # Shared Zod validation schemas, enums, DTOs
├── docs/                           # Architecture guides and API contracts
├── README.md                       # Comprehensive project setup and operations guide
├── THREATS.md                      # Threat model, attack vectors, mitigations, test mapping
├── PROMPTS.md                      # AI prompt records and architectural decisions audit
├── DEVELOPMENT_STATUS.md           # Granular feature and verification status tracker
└── .env.example                    # Global environment template
```

---

## 2. Key Capabilities

1. **Strict Role-Based & Document-Level Access Control (RBAC & ACL)**
   - Three distinct roles: **ADMIN**, **DOCUMENT_OWNER**, **VIEWER**.
   - Admin oversight does **not** grant automatic document content access (Least Privilege).
   - Document-level grants: **READ** (metadata & preview), **EDIT** (replacement & metadata), and policy-controlled **DOWNLOAD**.
2. **Instant Access Revocation**
   - Zero dependency on long-lived signed URLs.
   - All file downloads and previews stream through authenticated, backend-authorized endpoints.
   - Revocation in the database terminates access immediately on subsequent requests.
3. **Verifiable & Tamper-Evident Audit Trail**
   - Append-only event store capturing uploads, views, downloads, edits, deletions, permission changes, and access denials.
   - SHA-256 cryptographic hash chaining linking each event to the preceding record.
   - Audit verification endpoint to detect any retroactive tampering or deletion.
4. **Human-in-the-Loop AI Access Suggestions**
   - Contextual recommendation of registered users who may require document access.
   - Suggestions require explicit document owner review, permission selection, and confirmation.
   - Zero automatic access grants by AI.

---

## 3. Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Lucide React, React Router, React Hook Form, Zod, TanStack Query, Clerk React SDK.
- **Backend**: Node.js, Express.js, TypeScript, Zod, Helmet, CORS, Express Rate Limit, Multer, Clerk Backend SDK.
- **Database**: Supabase PostgreSQL, Prisma ORM (multi-schema isolated under `trustvault`).
- **Storage**: Supabase Storage (private bucket `trustvault-documents`, backend-authorized streaming).
- **Testing**: Vitest, Supertest, React Testing Library.

---

## 4. Environment Setup

### Prerequisites
- Node.js (v20+ or v24+)
- npm (v10+ or v11+)
- Supabase account with a PostgreSQL database and private Storage bucket
- Clerk account with application publishable and secret keys

### Step 1: Clone and Configure Environment Files
Copy the `.env.example` templates in each respective application folder:

```bash
# Frontend
cp apps/web/.env.example apps/web/.env

# Backend
cp apps/api/.env.example apps/api/.env

# Database
cp packages/database/.env.example packages/database/.env
```

Fill in your actual Clerk and Supabase credentials in `apps/api/.env` and `apps/web/.env`.

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Initialize Database Schema
```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema to Supabase PostgreSQL (trustvault schema)
npm run prisma:push

# Seed default categories and initial system administrator
npm run prisma:seed
```

### Step 4: Run Development Servers
```bash
# Run backend API (port 5001)
npm run dev:api

# In a separate terminal, run frontend (port 5173)
npm run dev:web
```

---

## 5. Automated Security Test Suite
TrustVault includes end-to-end automated security verification for all 10 mandatory adversarial scenarios:

```bash
npm run test
```

Tests cover:
- IDOR attempts
- Instant access revocation
- Unauthorized role escalation
- Deactivated user session rejection
- File signature validation
- Audit hash-chain verification
- Concurrent permission update safety

