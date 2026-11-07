import React from 'react';
import { Shield, Lock, FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Vault</span>
      </Link>

      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2.5 mb-2">
          <Shield className="w-6 h-6 text-sky-600" />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Privacy Policy</h1>
        </div>
        <p className="text-xs text-slate-500 font-mono">
          Effective Date: November 2026 &bull; TrustVault Zero-Trust Data Governance
        </p>
      </div>

      <div className="prose prose-slate max-w-none text-xs text-slate-700 leading-relaxed space-y-6">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">1. Introduction</h2>
          <p>
            TrustVault is committed to safeguarding organizational confidential information through zero-trust architecture. This Privacy Policy details our technical and operational practices regarding the collection, processing, authorization, and cryptographic retention of data within the TrustVault document security platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">2. Information Collected</h2>
          <p>
            We process only the minimum necessary information required to enforce role-based access control and maintain a non-repudiable audit trail:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Identity & Account Data:</strong> Name, work email address, and external identity references managed securely through Clerk authentication.</li>
            <li><strong>Document Metadata:</strong> Document title, user-supplied descriptions, MIME types, file sizes, and cryptographic SHA-256 binary digests.</li>
            <li><strong>Access Telemetry:</strong> IP addresses, user agent headers, request correlation IDs, and timestamps for all authorization decisions.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">3. Document Content Storage & Confidentiality</h2>
          <p>
            Document binaries are held in private, non-public storage buckets. File contents are never indexed into public search engines or made accessible via direct URLs. Access to document payloads is granted strictly through authenticated backend streaming after real-time verification of active permissions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">4. Cryptographic Audit Trail & Retention</h2>
          <p>
            In accordance with the RISE security specification, all operations including document uploads, views, downloads, permission grants, access revocations, and access denials are recorded in an append-only audit trail protected by SHA-256 hash chaining. Audit evidence is preserved to maintain non-repudiation and forensic accountability.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">5. Access Revocation Guarantees</h2>
          <p>
            When a document owner revokes a user's access, the revocation takes effect immediately across all application interfaces, APIs, and streaming links. We do not issue long-lived signed storage links that would allow unauthorized data retention following revocation.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">6. Contact & Data Rights</h2>
          <p>
            For privacy inquiries or compliance verification, please contact your designated organization administrator or the security officer configured for your TrustVault deployment.
          </p>
        </section>
      </div>
    </div>
  );
};
