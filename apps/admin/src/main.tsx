import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import './index.css';
import { ShieldAlert } from 'lucide-react';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
    },
  },
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find root element');
}

if (!CLERK_PUBLISHABLE_KEY || CLERK_PUBLISHABLE_KEY.includes('REPLACE_WITH_')) {
  ReactDOM.createRoot(rootElement).render(
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white font-sans">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-lg border border-slate-700 shadow-elevated text-center space-y-4">
        <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-lg flex items-center justify-center mx-auto border border-rose-500/30">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold tracking-tight">TrustVault Admin Configuration Required</h1>
        <p className="text-xs text-slate-300 leading-relaxed text-left">
          The Clerk authentication publishable key is not yet configured for the admin portal.
        </p>
        <div className="p-3 bg-slate-950 rounded text-left font-mono text-[11px] text-slate-400 space-y-1">
          <div>1. Ensure <span className="text-rose-400">apps/admin/.env</span> exists</div>
          <div>2. Set <span className="text-emerald-400">VITE_CLERK_PUBLISHABLE_KEY</span>=pk_test_...</div>
          <div>3. Restart the development server.</div>
        </div>
      </div>
    </div>
  );
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ClerkProvider>
    </React.StrictMode>
  );
}

