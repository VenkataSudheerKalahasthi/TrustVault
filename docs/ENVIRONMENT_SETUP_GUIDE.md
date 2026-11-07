# TrustVault: Environment Setup Guide

This guide maps each application to its local environment file, detailing which variables must be set once fresh credentials are ready.

---

## 1. Application-to-File Mapping

```text
Trustvault/
├── packages/
│   └── database/
│       └── .env          <-- Prisma ORM & PostgreSQL connection
├── apps/
│   ├── api/
│   │   └── .env          <-- Express Backend, Supabase Storage, Clerk Backend
│   ├── web/
│   │   └── .env          <-- Client Document Vault (React/Vite - Port 5173)
│   └── admin/
│       └── .env          <-- Standalone Admin Portal (React/Vite - Port 5174)
```

---

## 2. File-by-File Configuration Reference

### File 1: `packages/database/.env`
```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[POOLER-HOST]:5432/postgres?schema=trustvault"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[POOLER-HOST]:5432/postgres?schema=trustvault"
```
- **Who uses it:** Prisma CLI when generating clients and pushing schemas/migrations.
- **Where to get it:** Supabase Dashboard > Settings > Database > Connection string (Session Mode URI, Port 5432).

---

### File 2: `apps/api/.env`
```env
NODE_ENV=development
PORT=5001
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173

DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[POOLER-HOST]:5432/postgres?schema=trustvault"

CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
SUPABASE_STORAGE_BUCKET=trustvault-docs

BOOTSTRAP_ADMIN_EMAIL=admin@trustvault.security
AI_API_KEY=
```
- **Who uses it:** Express backend for database queries, token validation, and storage operations.
- **Where to get it:**
  - `DATABASE_URL`: Same as `packages/database/.env`.
  - `CLERK_SECRET_KEY` & `CLERK_PUBLISHABLE_KEY`: Clerk Dashboard > API Keys.
  - `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard > Settings > API.

---

### File 3: `apps/web/.env`
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_BASE_URL=/api/v1
```
- **Who uses it:** Client Document Vault frontend application (`apps/web`).
- **Where to get it:** Clerk Dashboard > API Keys (Publishable key only).

---

### File 4: `apps/admin/.env`
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_BASE_URL=/api/v1
```
- **Who uses it:** Standalone Security Governance Admin Portal (`apps/admin`).
- **Where to get it:** Clerk Dashboard > API Keys (Publishable key only).

---

## 3. Safe Verification Workflow

Once you have filled in your fresh keys:

1. **Test Database Schema Push:**
   ```powershell
   npm run prisma:push
   ```
2. **Start Backend Server:**
   ```powershell
   npm run dev:api
   ```
3. **Start Client Document Vault:**
   ```powershell
   npm run dev:web
   ```
4. **Start Admin Portal:**
   ```powershell
   npm run dev:admin
   ```
