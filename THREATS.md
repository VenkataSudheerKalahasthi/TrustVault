# TrustVault Threat Model and Security Architecture (THREATS.md)

## 1. Executive Security Overview
TrustVault is built on the **Zero Trust Architecture** principles to satisfy the **RISE** (Robust Identity, Storage, and Execution) specification for confidential enterprise document sharing:
1. **Unauthorized Document Access & IDOR**: Direct document leakage via parameter manipulation or hidden UI reliance.
2. **Missing or Tamperable Audit Evidence**: Lack of verifiable, unalterable access and modification logs.
3. **Delayed or Incomplete Access Revocation**: Time-of-check to time-of-use (TOCTOU) windows where revoked users retain access through cached sessions, valid signed URLs, or background sync.

---

## 2. Identified Threat Matrix & Attack Vectors

| Threat ID | Threat Category | Threat Description & Attack Scenario | Impact | Mitigation Strategy | Verification Automated Test |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TV-THREAT-01** | Insecure Direct Object Reference (IDOR) | Attacker alters document UUID in `/api/v1/documents/:id` or `/api/v1/documents/:id/download` to access another tenant's confidential document. | **CRITICAL**: Confidential data breach across organization boundaries. | Centralized document-level authorization middleware (`requireDocumentPermission`). Validates document ownership or explicit active grant on every request. | Scenario 1, Scenario 4 (`documents.test.ts`) |
| **TV-THREAT-02** | Stale / Cached Access After Revocation | Document owner revokes access, but viewer retains an active tab, pre-issued CDN/S3 URL, or client-cached token to continue downloading files. | **CRITICAL**: Revocation bypass and unauthorized document exfiltration. | No long-lived signed URLs. Files are strictly authorized and streamed through Express backend. Transactional permission revocation marks status immediately in database and invalidates all further requests. | Scenario 3 (`permissions.test.ts`) |
| **TV-THREAT-03** | Privilege Escalation (Role Manipulation) | Normal viewer or owner submits `PATCH /api/v1/users/:id/role` with `role: "ADMIN"` or manipulates client JWT payload to gain administrative oversight. | **HIGH**: Administrative takeover and monitoring evasion. | Strict backend role enforcement. User roles are stored in application PostgreSQL, never trusted from client metadata. Role modifications require verified `ADMIN` role. Self-promotion is explicitly blocked. | Scenario 6 (`users.test.ts`) |
| **TV-THREAT-04** | Administrative Content Snooping (Excessive Privilege) | System Administrator attempts to preview, download, or edit confidential file contents of arbitrary users without explicit document owner sharing. | **HIGH**: Insider threat and violation of least privilege. | Separation of administrative duties: Admins have metadata and audit monitoring rights, but **zero automatic content access**. Content endpoints enforce document ownership/grant checks even for Admins. | Scenario 7 (`admin.test.ts`) |
| **TV-THREAT-05** | Audit Record Tampering / Repudiation | Rogue user or malicious administrator executes updates or deletions on `AuditLog` records to erase footprints of illicit document viewing or downloading. | **CRITICAL**: Complete loss of forensic non-repudiation. | Append-only audit architecture. Strict API restrictions (no `UPDATE` or `DELETE` endpoints for audit). Cryptographic SHA-256 hash chaining linking each event to the previous record hash. | Scenario 7 (`audit.test.ts`) |
| **TV-THREAT-06** | File Signature & Extension Spoofing | Malicious actor uploads an executable or HTML/SVG script disguised with a `.pdf` or `.png` extension to trigger stored XSS or RCE. | **HIGH**: Cross-site scripting (XSS), malware distribution to viewers. | Strict MIME-type checking, extension allowlisting, and magic-number signature verification. Strict `Content-Disposition: attachment` headers with sanitized filenames on download. | Scenario 8 (`upload.test.ts`) |
| **TV-THREAT-07** | Deactivated Account Session Persistence | A compromised or terminated employee's account is marked deactivated, but existing sessions continue issuing authorized API requests. | **HIGH**: Unauthorized access during offboarding. | Every protected API request passes through `requireActiveUser` middleware, verifying the real-time `isActive: true` database flag on every turn. | Scenario 9 (`auth.test.ts`) |
| **TV-THREAT-08** | Race Conditions in Concurrent Permissions | Two users or owners simultaneously grant and revoke access, causing an inconsistent or orphaned state. | **MEDIUM**: Inconsistent permissions or duplicate grants. | PostgreSQL ACID transactions (`prisma.$transaction`) with row locking and composite unique active constraint checks. | Scenario 10 (`concurrency.test.ts`) |
| **TV-THREAT-09** | AI Hallucination & Autonomous Access Granting | AI access suggestion model autonomously grants document access or exposes file contents to suggested users without owner consent. | **HIGH**: Accidental data leakage due to automated logic. | Human-in-the-loop requirement: AI suggestions only recommend users based on permitted metadata; explicit owner confirmation with permission selection is mandatory before any grant is executed. | AI Suggestion Tests (`aiSuggestions.test.ts`) |
| **TV-THREAT-10** | Storage Path Traversal & Direct Bucket Probing | Attacker probes Supabase Storage URLs directly or injects `../` path traversal strings in document filenames. | **HIGH**: Arbitrary file overwrite or unauthorized bucket read. | Private storage buckets (`public: false`). Storage paths are randomly generated UUIDs, isolated per tenant. All binary transfers pass through backend authorization streams. | Storage Tests (`storage.test.ts`) |

---

## 3. Cryptographic Audit Hash Chaining (Tamper Evidence)

Each `AuditLog` entry in TrustVault computes a cryptographic SHA-256 fingerprint:
$$\text{currentHash} = \text{SHA256}(\text{sequenceNumber} \parallel \text{previousHash} \parallel \text{action} \parallel \text{result} \parallel \text{actorId} \parallel \text{documentId} \parallel \text{timestamp})$$

- If an adversary attempts to modify any past row in the database, the hash chain breaks from that sequence number forward.
- The verification endpoint `/api/v1/audit-logs/verify` re-computes the chain from genesis and alerts on any discrepancy or missing sequence number.

### Security Limitations of Hash Chaining
While cryptographic hash chaining detects unauthorized database alterations, it relies on the root database state. In extreme zero-trust threat models, a compromised database superuser could theoretically re-hash a modified chain. For complete protection against superuser collusion, external anchoring to an external append-only ledger or RFC 3161 timestamping authority is recommended.

---

## 4. Verification & Testing Coverage

All 10 mandatory adversarial scenarios defined in the Master Development Prompt are implemented as automated test suites in `apps/api/tests/` running against the PostgreSQL database and Supertest API harness.

