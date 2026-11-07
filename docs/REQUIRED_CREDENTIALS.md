# TrustVault: Required Credentials and Environment Configuration

This document provides the complete, authoritative checklist of environment variables required by TrustVault.

---

## 1. Summary of Required Configuration Files

| Path | Purpose | Mandatory? |
| :--- | :--- | :--- |
| `packages/database/.env` | Prisma ORM PostgreSQL connection for migrations and database access | **YES** |
| `apps/api/.env` | Express backend server, Clerk verification, Supabase Storage | **YES** |
| `apps/web/.env` | Client Document Vault (React/Vite) | **YES** |
| `apps/admin/.env` | Standalone Admin Portal (React/Vite) | **YES** |

> [!IMPORTANT]
> Never commit `.env` files to source control. They are strictly ignored by `.gitignore`.

---

## 2. Supabase Configuration (Database & Storage)

### Target Supabase Project: `whiiixyungnfiajnfpaq`

To connect to your actual Supabase project where your `trustvault-docs` storage bucket is hosted:

### Variables for `packages/database/.env` and `apps/api/.env`:

```env
# Supabase Connection Pooler (Session mode, Port 5432)
DATABASE_URL="postgresql://postgres.whiiixyungnfiajnfpaq:[YOUR-DATABASE-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?schema=trustvault"

# Direct Connection URL (Used by Prisma for migrations if needed)
DIRECT_URL="postgresql://postgres.whiiixyungnfiajnfpaq:[YOUR-DATABASE-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?schema=trustvault"
```

### Where to obtain from your Supabase Dashboard:
1. Open your browser and navigate to:
   `https://supabase.com/dashboard/project/whiiixyungnfiajnfpaq/settings/database`
2. Scroll to the **Connection string** section.
3. Select **URI** and choose **Mode: Session** (Port `5432`).
4. Replace `[YOUR-PASSWORD]` with the database password you created when setting up the project.
   *(If you don't remember the password, click "Reset database password" on that page).*

---

### Variables for `apps/api/.env` (Storage & Administration):

```env
SUPABASE_URL=https://whiiixyungnfiajnfpaq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
SUPABASE_STORAGE_BUCKET=trustvault-docs
```

### Where to obtain from your Supabase Dashboard:
1. Navigate to:
   `https://supabase.com/dashboard/project/whiiixyungnfiajnfpaq/settings/api`
2. Under **Project API keys**:
   - Copy the **`service_role` (secret)** key.
   - Paste it into `SUPABASE_SERVICE_ROLE_KEY` in `apps/api/.env`.
3. Under **Storage**:
   - The bucket `trustvault-docs` is already created and verified as private.

---

## 3. Clerk Authentication Configuration

TrustVault exclusively uses Clerk for identity and authentication.

### Variables for `apps/api/.env`:

```env
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_WEBHOOK_SECRET=whsec_... # (Optional for local development)
```

### Variables for `apps/web/.env` and `apps/admin/.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_BASE_URL=/api/v1
```

### Where to obtain from your Clerk Dashboard:
1. Navigate to: `https://dashboard.clerk.com`
2. Select your Clerk application (`TrustVault`).
3. Click **API Keys** in the left sidebar.
4. Copy:
   - **Publishable key** (`pk_test_...`) -> for `apps/web/.env`, `apps/admin/.env`, and `apps/api/.env`
   - **Secret key** (`sk_test_...`) -> for `apps/api/.env`

---

## 4. Optional Integrations

### AI Access Suggestions (`apps/api/.env`):
```env
AI_API_KEY=
```
- **Purpose:** Analyzes document metadata to provide human-in-the-loop permission recommendations.
- **Provider:** Google Gemini API (`AIzaSy...`) or OpenAI API key (`sk-...`).
- **Status:** Optional. If empty, the feature is disabled gracefully without application errors.

### Initial Admin Provisioning (`apps/api/.env`):
```env
BOOTSTRAP_ADMIN_EMAIL=admin@trustvault.security
```
- **Purpose:** On first sign-in of this email, the account is automatically provisioned as `ADMIN`.

