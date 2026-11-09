# TrustVault — REST API Specification & RBAC Authorization Matrix

## 1. Security Architecture & Authentication Protocol

The TrustVault REST API enforces a strict **Zero-Trust & Deny-by-Default** security model. Every inbound HTTP request passes through a sequence of security middleware before reaching business controllers.

### 1.1 Middleware Enforcement Order

```
[Inbound Request]
        │
        ▼
1. Helmet Security Headers (CSP, Frameguard: Deny, CORP: Cross-Origin)
        │
        ▼
2. Dynamic CORS Filter (Strict Origin Allowlist & *.vercel.app matching)
        │
        ▼
3. Correlation ID Generator (`X-Correlation-Id` UUIDv4 tracking)
        │
        ▼
4. Rate Limiter (IP-based sliding window: Standard 100/15min, Strict 20/15min)
        │
        ▼
5. Authentication Guard (`requireAuthentication` via Clerk JWT verification)
        │
        ▼
6. Account Status Guard (`requireActiveUser` - immediately rejects deactivated accounts)
        │
        ▼
7. Role Authorization (`requireRole` - checks ADMIN, DOCUMENT_OWNER, VIEWER)
        │
        ▼
8. Document ACL Guard (`requireDocumentPermission` - checks OWNER, EDIT, READ, DOWNLOAD)
        │
        ▼
[Target Controller Action]
```

### 1.2 Authentication Header
All protected endpoints require an HTTP `Authorization` header containing a verified Clerk Bearer token:
```http
Authorization: Bearer <clerk_jwt_session_token>
```

### 1.3 Standard Error Response Format
All errors return consistent, structured JSON with correlating tracking IDs:
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN | UNAUTHORIZED | NOT_FOUND | VALIDATION_ERROR | ACCOUNT_DEACTIVATED",
    "message": "Human-readable explanation of rejection.",
    "correlationId": "8881f537-6fc4-4429-b5a4-2b3d4283168e"
  }
}
```

---

## 2. Global Role-Based Access Control (RBAC) Matrix

The table below outlines the exact authorization boundaries across all system endpoints.

| Category | Endpoint | Method | Allowed Caller Roles | Explicit Access Preconditions |
| :--- | :--- | :---: | :--- | :--- |
| **Health** | `/api/health` | `GET` | **PUBLIC** (Anonymous) | None |
| **Health** | `/api/v1/health` | `GET` | **PUBLIC** (Anonymous) | None |
| **Health** | `/api/v1/health/database` | `GET` | **PUBLIC** (Anonymous) | Live DB ping |
| **Auth** | `/api/v1/auth/me` | `GET` | `ADMIN`, `DOCUMENT_OWNER`, `VIEWER` | Authenticated + Active |
| **Auth** | `/api/v1/auth/sync` | `POST` | `ADMIN`, `DOCUMENT_OWNER`, `VIEWER` | Authenticated + Active |
| **Users** | `/api/v1/users` | `GET` | `ADMIN`, `DOCUMENT_OWNER`, `VIEWER` | Authenticated + Active |
| **Users** | `/api/v1/users/:id` | `GET` | `ADMIN`, `DOCUMENT_OWNER`, `VIEWER` | Authenticated + Active |
| **Users** | `/api/v1/users/:id/role` | `PATCH` | **`ADMIN` ONLY** | Target user cannot self-promote to Admin without allowlist |
| **Users** | `/api/v1/users/:id/status` | `PATCH` | **`ADMIN` ONLY** | Cannot deactivate last active administrator |
| **Docs** | `/api/v1/documents` | `POST` | `ADMIN`, `DOCUMENT_OWNER` | Max 25MB, validated magic bytes signature |
| **Docs** | `/api/v1/documents` | `GET` | `ADMIN`, `DOCUMENT_OWNER`, `VIEWER` | Returns owned + granted documents |
| **Docs** | `/api/v1/documents/:id` | `GET` | `ADMIN`*, `DOCUMENT_OWNER`, `VIEWER` | Must hold `OWNER` or active `READ` grant |
| **Docs** | `/api/v1/documents/:id` | `PATCH` | `DOCUMENT_OWNER`, `VIEWER` with EDIT | Must hold `OWNER` or active `EDIT` grant |
| **Docs** | `/api/v1/documents/:id/versions` | `POST` | `DOCUMENT_OWNER`, `VIEWER` with EDIT | Must hold `OWNER` or active `EDIT` grant |
| **Docs** | `/api/v1/documents/:id` | `DELETE` | `DOCUMENT_OWNER` ONLY | Must be the actual document creator |
| **Docs** | `/api/v1/documents/:id/content` | `GET` | Caller with active `READ` | Streams binary in-memory; zero signed URLs |
| **Docs** | `/api/v1/documents/:id/download` | `GET` | Caller with `canDownload = true` | Denied if permission has `canDownload: false` |
| **ACL** | `/api/v1/documents/:id/permissions` | `POST` | `DOCUMENT_OWNER` ONLY | Must be document owner |
| **ACL** | `/api/v1/documents/:id/permissions` | `GET` | Caller with `READ` or `OWNER` | Access to permission list |
| **ACL** | `/api/v1/documents/:id/permissions/:pid` | `DELETE` | `DOCUMENT_OWNER` ONLY | Immediate ACL revocation & cache invalidate |
| **Categories** | `/api/v1/categories` | `GET` | `ADMIN`, `DOCUMENT_OWNER`, `VIEWER` | Authenticated + Active |
| **Categories** | `/api/v1/categories` | `POST` | `ADMIN`, `DOCUMENT_OWNER` | Unique category name required |
| **Categories** | `/api/v1/categories/:id` | `PATCH` | `ADMIN`, `DOCUMENT_OWNER` | Authenticated + Active |
| **Categories** | `/api/v1/categories/:id` | `DELETE` | **`ADMIN` ONLY** | Blocked if active documents reference category |
| **Audit** | `/api/v1/audit-logs` | `GET` | `ADMIN`, `DOCUMENT_OWNER` | Paginated append-only log view |
| **Audit** | `/api/v1/audit-logs/verify` | `GET` | **`ADMIN` ONLY** | Validates SHA-256 HMAC integrity from genesis |
| **Audit** | `/api/v1/audit-logs/:id` | `GET` | `ADMIN`, `DOCUMENT_OWNER` | Detailed log block inspection |
| **Audit** | `/api/v1/audit-logs/:id` | `PUT/PATCH/DELETE` | **NO ONE (IMMUTABLE)** | Strictly returns `403 AUDIT_IMMUTABLE` |
| **Admin** | `/api/v1/admin/dashboard` | `GET` | **`ADMIN` ONLY** | Real platform telemetry & active user counts |
| **Admin** | `/api/v1/admin/activity` | `GET` | **`ADMIN` ONLY** | Live streaming security event feed |
| **Admin** | `/api/v1/admin/documents` | `GET` | **`ADMIN` ONLY** | Global document metadata inventory |
| **Admin** | `/api/v1/admin/permissions` | `GET` | **`ADMIN` ONLY** | Global permission grant audit table |
| **Admin** | `/api/v1/admin/security` | `GET` | **`ADMIN` ONLY** | Failed access telemetry & incident history |
| **Admin** | `/api/v1/admin/settings` | `GET` | **`ADMIN` ONLY** | Platform security invariants & env configs |
| **Admin** | `/api/v1/admin/profile` | `GET/PATCH`| **`ADMIN` ONLY** | Administrator profile & preferences |
| **Search** | `/api/v1/search` | `GET` | `ADMIN`, `DOCUMENT_OWNER`, `VIEWER` | Scoped strictly to documents caller is permitted to read |
| **AI Access** | `/api/v1/documents/:id/ai-suggestions` | `POST` | `DOCUMENT_OWNER` ONLY | Generates metadata-driven proposals |
| **AI Access** | `/api/v1/documents/:id/ai-suggestions` | `GET` | `DOCUMENT_OWNER` ONLY | Lists pending access recommendations |
| **AI Access** | `/api/v1/ai-suggestions/:id/decision` | `POST` | `DOCUMENT_OWNER` ONLY | Human owner approves or rejects proposal |

*\*Note: Under TrustVault's Least-Privilege doctrine, Admins have full governance and telemetry over metadata, but cannot preview or download confidential file content without an explicit ACL grant.*

---

## 3. Detailed Endpoint Specifications

### 3.1 Health & Verification Endpoints

#### `GET /api/health`
* **Allowed Callers**: Anonymous / Public
* **Purpose**: Immediate load balancer and Vercel Serverless Function health check.
* **Success Response (200 OK)**:
  ```json
  {
    "status": "healthy",
    "service": "TrustVault Serverless API",
    "timestamp": "2026-11-09T01:49:00.951Z",
    "environment": "production"
  }
  ```

#### `GET /api/v1/health/database`
* **Allowed Callers**: Anonymous / Public
* **Purpose**: Performs a live `SELECT 1` ping against Supabase PostgreSQL.
* **Success Response (200 OK)**:
  ```json
  {
    "status": "UP",
    "database": "Supabase PostgreSQL",
    "schema": "trustvault",
    "connected": true,
    "timestamp": "2026-11-09T01:49:01.012Z"
  }
  ```

---

### 3.2 Authentication & User Synchronization

#### `GET /api/v1/auth/me`
* **Allowed Callers**: Authenticated Users (`ADMIN`, `DOCUMENT_OWNER`, `VIEWER`)
* **Purpose**: Resolves caller's validated identity, assigned role, and active status.
* **Headers**: `Authorization: Bearer <token>`
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "78a1bc44-59e2-45e3-8201-9876543210ab",
      "clerkId": "user_2test123456",
      "email": "owner@trustvault.security",
      "firstName": "Priya",
      "lastName": "Sharma",
      "role": "DOCUMENT_OWNER",
      "isActive": true,
      "createdAt": "2026-11-08T10:00:00.000Z"
    }
  }
  ```

#### `POST /api/v1/auth/sync`
* **Allowed Callers**: Authenticated Users
* **Purpose**: Idempotently provisions or synchronizes user profile upon login. Automatically validates email allowlist if requesting `ADMIN` elevation.
* **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "firstName": "Alex",
    "lastName": "Vance",
    "role": "DOCUMENT_OWNER"
  }
  ```

---

### 3.3 Document Lifecycle Management

#### `POST /api/v1/documents`
* **Allowed Callers**: `DOCUMENT_OWNER`, `ADMIN`
* **Rate Limit**: 20 uploads / 15 minutes
* **Request Format**: `multipart/form-data`
  * `file`: Binary file payload (PDF, DOCX, XLSX, TXT, PNG, JPEG).
  * `title`: String (1 – 255 characters).
  * `description`: String (Optional).
  * `categoryId`: UUID (Optional).
* **Validation Rules**:
  1. Enforces 25 MB size ceiling.
  2. Inspects magic bytes (e.g. `%PDF-` signature) to prevent extension spoofing.
  3. Computes SHA-256 digest prior to private Supabase upload.
  4. Appends a tamper-evident `DOCUMENT_UPLOADED` block to the cryptographic audit chain.

#### `GET /api/v1/documents`
* **Allowed Callers**: Authenticated Users
* **Query Parameters**:
  * `page` (default: 1), `limit` (default: 20)
  * `scope`: `owned` | `shared` | `all`
  * `categoryId`: UUID filter
* **Security Behavior**: Standard Viewers only receive documents where an active, unrevoked permission grant exists for their user ID.

#### `GET /api/v1/documents/:id/content`
* **Allowed Callers**: Caller must hold an active `READ` or `OWNER` grant.
* **Purpose**: Secure document preview streaming.
* **Security Architecture**:
  * Never generates or leaks public/signed URLs.
  * Streams raw encrypted buffer directly from private Supabase Storage through backend memory to client response.
  * Emits `DOCUMENT_VIEWED` audit entry.

#### `GET /api/v1/documents/:id/download`
* **Allowed Callers**: Caller must hold an active grant with `canDownload = true`.
* **Behavior on View-Only Grants**: If a permission was granted with `canDownload: false`, this endpoint immediately aborts with `403 FORBIDDEN: Download permissions have been restricted for this document`.

#### `DELETE /api/v1/documents/:id`
* **Allowed Callers**: Document Creator (`OWNER`) ONLY.
* **Purpose**: Performs a secure soft-delete, revokes all active permission grants, and records a `DOCUMENT_DELETED` audit event.

---

### 3.4 Access Control Lists & Permissions

#### `POST /api/v1/documents/:id/permissions`
* **Allowed Callers**: Document Creator (`OWNER`) ONLY.
* **Request Body**:
  ```json
  {
    "userId": "d9817cf2-7104-4c47-925f-22a83e018694",
    "permissionType": "READ",
    "canDownload": true
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "perm-uuid",
      "documentId": "doc-uuid",
      "userId": "d9817cf2-7104-4c47-925f-22a83e018694",
      "permissionType": "READ",
      "canDownload": true,
      "isRevoked": false,
      "createdAt": "2026-11-09T02:00:00.000Z"
    }
  }
  ```

#### `DELETE /api/v1/documents/:id/permissions/:permissionId`
* **Allowed Callers**: Document Creator (`OWNER`) ONLY.
* **Purpose**: **Immediate Access Revocation**. Marks `isRevoked = true` and records revocation timestamp. Any active stream or subsequent request from the target user is rejected immediately within zero propagation lag.

---

### 3.5 Tamper-Evident Cryptographic Audit Trail

#### `GET /api/v1/audit-logs`
* **Allowed Callers**: `ADMIN`, `DOCUMENT_OWNER`
* **Query Parameters**: `page`, `limit`, `action`, `result`
* **Returns**: Sequence-ordered list of append-only audit blocks with SHA-256 chaining.

#### `GET /api/v1/audit-logs/verify`
* **Allowed Callers**: **`ADMIN` ONLY**
* **Purpose**: Verifies full chain integrity from Genesis block (#1) to current head.
* **Verification Algorithm**:
  1. Computes `expectedHash = HMAC_SHA256(secret, sequenceNumber + action + result + previousHash + timestamp)`.
  2. Compares computed hash against stored `currentHash`.
  3. Verifies `block[N].previousHash == block[N-1].currentHash`.
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "isValid": true,
      "totalVerified": 458,
      "brokenAtSequence": null,
      "reason": null
    }
  }
  ```

#### `PUT / PATCH / DELETE /api/v1/audit-logs/:id`
* **Allowed Callers**: **NO ONE (SYSTEM INVARIANT)**
* **Behavior**: Always terminates with `403 AUDIT_IMMUTABLE`. Audit records cannot be altered or purged under any circumstances, even by system administrators.

---

### 3.6 Admin Governance & Telemetry

All endpoints prefixed with `/api/v1/admin/*` require the caller to possess the `ADMIN` role.

#### `GET /api/v1/admin/dashboard`
* **Allowed Callers**: `ADMIN` ONLY
* **Returns**: Total registered users, active vs deactivated count, total vault documents, active permissions count, and cryptographic chain health status.

#### `GET /api/v1/admin/security`
* **Allowed Callers**: `ADMIN` ONLY
* **Returns**: Telemetry on failed login attempts, `ACCESS_DENIED` security events, and unauthorized privilege escalation attempts.

#### `PATCH /api/v1/users/:id/status`
* **Allowed Callers**: `ADMIN` ONLY
* **Request Body**: `{ "isActive": false }`
* **Enforcement**: Deactivated accounts are blocked at the middleware layer on their next HTTP request, even if their Clerk session JWT is still valid.
