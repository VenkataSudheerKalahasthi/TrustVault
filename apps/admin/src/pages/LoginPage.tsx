import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { Shield, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-rose-600 text-white shadow-card mb-3">
          <Shield className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">TrustVault Admin</h1>
        <p className="mt-1 text-xs text-rose-400 font-mono">
          Security Officer & Governance Authentication
        </p>
      </div>

      {/* Main Sign In Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-elevated sm:rounded-lg sm:px-10 border border-slate-200">
          <SignIn
            routing="path"
            path="/login"
            appearance={{
              elements: {
                formButtonPrimary:
                  'bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors py-2.5',
                card: 'shadow-none p-0',
                headerTitle: 'text-base font-bold text-slate-900',
                headerSubtitle: 'text-xs text-slate-500',
                formFieldLabel: 'text-xs font-medium text-slate-700',
                formFieldInput:
                  'text-xs rounded-md border-slate-300 focus:ring-1 focus:ring-rose-500 focus:border-rose-500',
                footerActionLink: 'text-xs font-semibold text-rose-600 hover:text-rose-700',
              },
            }}
          />

          <div className="mt-6 pt-6 border-t border-slate-100 space-y-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Strict least-privilege administrative access</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Immutable cryptographic audit logging</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

