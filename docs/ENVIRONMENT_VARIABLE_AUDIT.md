# TrustVault Environment Variable Audit

**Date:** 2026-11-07  
**Scope:** Complete repository audit across all workspaces (`apps/api`, `apps/web`, `apps/admin`, `packages/database`, `packages/shared`).

---

## 1. Master Environment Variable Inventory

| Variable | Application / Package | Required? | Secret / Public | Configuration Location | Status | Purpose & Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | `packages/database`<br>`apps/api` | **YES** | **Secret** | `packages/database/.env`<br>`apps/api/.env` | Placeholder Configured | PostgreSQL connection string with session pooler (`:5432`) and `schema=trustvault`. |
| `DIRECT_URL` | `packages/database` | **Optional / Recommended** | **Secret** | `packages/database/.env` | Placeholder Configured | Direct connection string for Prisma migrations when bypassing connection pooler. |
| `CLERK_SECRET_KEY` | `apps/api` | **YES** | **Secret** | `apps/api/.env` | Placeholder Configured | Backend secret key (`sk_test_...`) used to verify Clerk JWTs and access Clerk Backend SDK. |
| `CLERK_PUBLISHABLE_KEY` | `apps/api` | **YES** | **Public** | `apps/api/.env` | Placeholder Configured | Clerk frontend publishable key (`pk_test_...`) used for initial token validation. |
| `CLERK_WEBHOOK_SECRET` | `apps/api` | Optional | **Secret** | `apps/api/.env` | Placeholder Configured | Webhook secret (`whsec_...`) for Svix signature verification of Clerk user sync events. |
| `SUPABASE_URL` | `apps/api` | **YES** | **Public** | `apps/api/.env` | Placeholder Configured | Supabase project endpoint (`https://YOUR_PROJECT_ID.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | `apps/api` | **YES** | **Secret** | `apps/api/.env` | Placeholder Configured | High-privilege secret key for server-side private storage bucket operations (`trustvault-docs`). Never expose to frontend. |
| `SUPABASE_STORAGE_BUCKET` | `apps/api` | **YES** | **Public** | `apps/api/.env` | Defaulted (`trustvault-docs`) | Name of the private Supabase Storage bucket holding encrypted document versions. |
| `VITE_CLERK_PUBLISHABLE_KEY` | `apps/web`<br>`apps/admin` | **YES** | **Public** | `apps/web/.env`<br>`apps/admin/.env` | Placeholder Configured | Browser-accessible publishable key (`pk_test_...`) powering Clerk React authentication components. |
| `VITE_API_BASE_URL` | `apps/web`<br>`apps/admin` | **YES** | **Public** | `apps/web/.env`<br>`apps/admin/.env` | Configured (`/api/v1`) | REST API base route used by browser fetch client (proxied through Vite dev server). |
| `PORT` | `apps/api` | Optional | Public | `apps/api/.env` | Defaulted (`5001`) | Backend HTTP port for Express.js. |
| `HOST` | `apps/api` | Optional | Public | `apps/api/.env` | Defaulted (`0.0.0.0`) | Network bind host for Express.js. |
| `CORS_ORIGIN` | `apps/api` | Optional | Public | `apps/api/.env` | Defaulted (`http://localhost:5173`) | Allowed origin for Cross-Origin Resource Sharing. |
| `BOOTSTRAP_ADMIN_EMAIL` | `apps/api` | Optional | Public | `apps/api/.env` | Configured | Email address automatically granted `ADMIN` role on initial sign-up. |
| `AI_API_KEY` | `apps/api` | Optional | **Secret** | `apps/api/.env` | Optional (Empty) | API key for optional LLM permission recommendation assistant. |

---

## 2. Security Analysis & Leakage Prevention

1. **Frontend Isolation:**
   - No backend secrets (`CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`) are referenced in `apps/web` or `apps/admin`.
   - Only `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_BASE_URL` are bundled into client assets.
2. **Repository Cleanliness:**
   - Git history contains no committed real secrets or passwords.
   - All `.env` files are strictly excluded by `.gitignore`.
   - All example templates (`.env.example`) contain explicit dummy placeholders.

