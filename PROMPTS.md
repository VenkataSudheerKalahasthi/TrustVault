# TrustVault AI Prompt History & Architectural Audit (PROMPTS.md)

## Record 1: Database Architecture & Multi-Schema Isolation
- **Date**: 2026-11-07
- **Prompt**: "Design a PostgreSQL schema with Prisma ORM for TrustVault supporting User, Document, DocumentVersion, DocumentPermission, DownloadRecord, AuditLog, and AISuggestion, ensuring multi-tenant safety and complete isolation."
- **AI Output Summary**: Recommended placing all TrustVault tables into the default schema with standard names.
- **Issues Discovered**: Inspection of standard PostgreSQL environments often reveals existing shared databases where default schemas contain colliding tables. Multi-schema isolation is necessary to guarantee absolute independence.
- **Corrections Made**: Configured PostgreSQL multi-schema support with `schemas = ["trustvault"]` and `previewFeatures = ["multiSchema"]`. All models and enums are cleanly isolated under `@@schema("trustvault")`.
- **Related Reference / Commit**: Git initial setup & database schema design.

---

## Record 2: Security & Immediate Access Revocation (Security Entry 1)
- **Date**: 2026-11-07
- **Prompt**: "Implement document sharing and instant access revocation for TrustVault. How should pre-signed S3/Supabase storage URLs be handled when access is revoked?"
- **AI Output Summary**: Suggested generating 15-minute signed URLs on demand and invalidating them on the client upon revocation.
- **Issues Discovered**: Client-side invalidation does not prevent an adversary or compromised viewer from continuing to download via the previously issued signed URL during the 15-minute window. This directly violates the core RISE requirement: "When document access is revoked, the user must immediately lose access, including through previously used document links."
- **Corrections Made**: Prohibited direct client issuance of signed storage URLs. Implemented backend-authorized binary streaming (`/api/v1/documents/:id/download`). Every download chunk and preview request queries PostgreSQL in real time to verify that the requesting user's permission is still active (`isRevoked: false`, not expired, account active). Revocation takes effect in the exact millisecond the database row updates.
- **Related Reference / Commit**: Implementation of `requireDocumentPermission` and authenticated streaming.

---

## Record 3: Audit Trail Integrity & Tamper Evidence (Security Entry 2)
- **Date**: 2026-11-07
- **Prompt**: "Implement the audit logging system for document viewing, downloads, permissions, and administrative oversight."
- **AI Output Summary**: Provided standard CRUD endpoints allowing Administrators to view and purge old audit logs after 90 days.
- **Issues Discovered**: Allowing administrative deletion or updates of audit logs violates the non-repudiation requirement. Malicious or compromised administrators could cover their tracks after illicitly viewing or downloading sensitive files.
- **Corrections Made**:
  1. Removed all `UPDATE` and `DELETE` endpoints for audit logs.
  2. Implemented append-only SHA-256 cryptographic hash chaining linking each event to its chronological predecessor ($H_n = \text{SHA256}(n \parallel H_{n-1} \parallel \text{action} \parallel \text{actor} \parallel \text{data})$).
  3. Added an audit verification engine (`/api/v1/audit-logs/verify`) that recalculates the entire hash chain and flags any missing or tampered events.
- **Related Reference / Commit**: Implementation of `AuditLog` service with hash chaining.

---

## Record 4: Least Privilege for System Administrators (Security Entry 3)
- **Date**: 2026-11-07
- **Prompt**: "Create the authorization middleware matrix for Admin, Document Owner, and Viewer roles."
- **AI Output Summary**: Suggested that the `ADMIN` role should have global wildcard access to all routes, including document download and preview.
- **Issues Discovered**: Giving Admins unrestricted access to confidential document contents violates the Principle of Least Privilege and the project specification: "Admin monitoring privileges do not automatically mean unrestricted access to confidential document contents."
- **Corrections Made**: Explicitly decoupled application roles from document-level content permissions. Admins have access to user management, system activity, and audit logs, but attempting to view or download a confidential file without an explicit grant returns `403 Forbidden` and logs an `ACCESS_DENIED` audit event.
- **Related Reference / Commit**: Centralized RBAC middleware `requireDocumentPermission`.

---

## Record 5: AI-Assisted Access Suggestions Guardrails
- **Date**: 2026-11-07
- **Prompt**: "Implement AI document access suggestions using LLM to automatically grant permissions to team members based on document content."
- **AI Output Summary**: Suggested an automated webhook that parses uploaded PDF text, prompts an LLM for suggested emails, and automatically inserts active rows into `DocumentPermission`.
- **Issues Discovered**: Automated permission grants by an AI introduce severe security risks: hallucinations could expose trade secrets or customer PII without human review.
- **Corrections Made**: Implemented strict Human-in-the-Loop (HITL) architecture:
  1. AI analyzes only permitted document metadata (title, category, description) - never confidential body contents without explicit consent.
  2. Suggestions are saved with status `PENDING`.
  3. Only the verified Document Owner can review, approve, reject, and explicitly select permission level (`READ` or `EDIT`).
  4. If external AI API keys are not configured, the service provides an informative status rather than simulating fake suggestions.
- **Related Reference / Commit**: Implementation of `aiSuggestions` module.

