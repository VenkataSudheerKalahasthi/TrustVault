import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { Shield, Lock, FileCheck, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-sky-600 text-white shadow-card mb-3">
          <Shield className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">TrustVault</h1>
        <p className="mt-1 text-xs text-slate-400 font-mono">
          Enterprise Document Security & Verifiable Audit Trail
        </p>
      </div>

      {/* Main Sign In Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-elevated sm:rounded-lg sm:px-10 border border-slate-200">
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/signup"
            appearance={{
              elements: {
                formButtonPrimary:
                  'bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-sm transition-colors py-2.5',
                card: 'shadow-none p-0',
                headerTitle: 'text-base font-bold text-slate-900',
                headerSubtitle: 'text-xs text-slate-500',
                formFieldLabel: 'text-xs font-medium text-slate-700',
                formFieldInput:
                  'text-xs rounded-md border-slate-300 focus:ring-1 focus:ring-sky-500 focus:border-sky-500',
                footerActionLink: 'text-xs font-semibold text-sky-600 hover:text-sky-700',
              },
            }}
          />

          {/* Security Features List */}
          <div className="mt-6 pt-6 border-t border-slate-100 space-y-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Zero-Trust document-level access control</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Instant permission revocation across all links</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Cryptographically sealed SHA-256 audit trail</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
