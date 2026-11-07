import React from 'react';
import { SignUp } from '@clerk/clerk-react';
import { Shield } from 'lucide-react';

export const SignUpPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-sky-600 text-white shadow-card mb-3">
          <Shield className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">TrustVault</h1>
        <p className="mt-1 text-xs text-slate-400 font-mono">
          Create an Enterprise Vault Account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-elevated sm:rounded-lg sm:px-10 border border-slate-200">
          <SignUp
            routing="path"
            path="/signup"
            signInUrl="/login"
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
        </div>
      </div>
    </div>
  );
};

