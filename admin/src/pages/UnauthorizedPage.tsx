import React from 'react';
import { ShieldAlert, ExternalLink, LogOut, RefreshCw } from 'lucide-react';
import { useClerk, useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useAppAuth } from '../context/AuthContext';

export const UnauthorizedPage: React.FC = () => {
  const { user, role, refetchUser } = useAppAuth();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const email = user?.email || clerkUser?.primaryEmailAddress?.emailAddress || 'User';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white font-sans">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-lg border border-slate-700 shadow-elevated text-center space-y-4">
        <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-lg flex items-center justify-center mx-auto border border-rose-500/30">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold tracking-tight">Access Restricted (HTTP 403)</h1>
        <p className="text-xs text-slate-300 leading-relaxed text-left">
          The signed-in account (<span className="text-white font-mono">{email}</span>) has role{' '}
          <span className="text-amber-400 font-mono font-bold">{role}</span>.
          Access to the TrustVault Admin Portal is strictly restricted to accounts with the <span className="text-rose-400 font-mono font-bold">ADMIN</span> role.
        </p>

        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={() => refetchUser()}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Verify Permissions Again</span>
          </button>
          <a
            href={import.meta.env.VITE_MAIN_PORTAL_URL || 'http://localhost:5173'}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
          >
            <span>Return to Document Vault</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-md transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign In with Different Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};

