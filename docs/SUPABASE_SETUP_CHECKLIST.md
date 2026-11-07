# TrustVault: Supabase Setup Checklist

Follow these exact steps when configuring your fresh Supabase project with TrustVault.

---

## Step 1: Gather Project Credentials from Supabase Dashboard

1. Log in to **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Select or create your TrustVault project.
3. Note your **Project Reference ID** (e.g., `abcdefghijklmnopqrst`).

### Database Connection String:
- Navigate to: **Settings > Database > Connection string**.
- Select **URI** tab.
- Choose **Mode: Session (Port 5432)**.
- Note your database password. *(If forgotten, use "Reset database password")*.
- Format:
  ```text
  postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@[POOLER-HOST]:5432/postgres?schema=trustvault
  ```

### Storage and API Keys:
- Navigate to: **Settings > API**.
- Copy:
  1. **Project URL**: `https://[PROJECT-REF].supabase.co`
  2. **Project API Keys > `service_role` (Secret)**: `sb_secret_...`

---

## Step 2: Configure Local `.env` Files

Update the following files with your real credentials:

### 1. `packages/database/.env`:
```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[POOLER-HOST]:5432/postgres?schema=trustvault"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[POOLER-HOST]:5432/postgres?schema=trustvault"
```

### 2. `apps/api/.env`:
```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[POOLER-HOST]:5432/postgres?schema=trustvault"
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
SUPABASE_STORAGE_BUCKET=trustvault-docs
```

---

## Step 3: Create Private Storage Bucket

1. In Supabase Dashboard, navigate to **Storage > New Bucket**.
2. Name: **`trustvault-docs`**
3. Access: **Private** (Make sure "Public bucket" is toggled **OFF**).
4. Allowed MIME types: Leave empty (handled by backend magic bytes validation) or restrict to:
   - `application/pdf`
   - `image/png`
   - `image/jpeg`
   - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
5. Maximum file size: **50 MB** (or desired limit).
6. Click **Save bucket**.

---

## Step 4: Apply Schema and Tables

Run the following command from the project root:

```powershell
npm run prisma:push
```

This will:
- Connect to your Supabase PostgreSQL database.
- Create the dedicated **`trustvault`** schema.
- Create all 8 application tables:
  1. `User`
  2. `Category`
  3. `Document`
  4. `DocumentVersion`
  5. `DocumentPermission`
  6. `DownloadRecord`
  7. `AuditLog`
  8. `AISuggestion`
- Create all required foreign keys, indexes, and unique constraints.

---

## Step 5: Verify Schema & Tables in Supabase Dashboard

> [!IMPORTANT]
> In the Supabase Dashboard **Table Editor**, the view defaults to the `public` schema!
> To see TrustVault tables:
> 1. Click the schema dropdown in the top-left corner of the **Table Editor** (where it says `public`).
> 2. Select **`trustvault`** from the list.
> 3. All 8 tables will be displayed.
> Alternatively, open the **SQL Editor** and run:
> ```sql
> SELECT table_name FROM information_schema.tables WHERE table_schema = 'trustvault';
> ```
