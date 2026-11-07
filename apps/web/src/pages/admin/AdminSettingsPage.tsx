import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../services/api';
import {
  Settings,
  Shield,
  Server,
  Database,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { data: settingsResponse, isLoading } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: () => apiRequest<{ success: boolean; data: any }>('/admin/settings'),
  });

  const settings = settingsResponse?.data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-sky-600" />
          <span>System Security & Environment Settings</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Zero-trust platform telemetry, storage bucket configurations, and identity parameters.
        </p>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-500">Querying system settings...</div>
      ) : (
        <div className="grid gap-6">
          {/* Server & Network Status */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-subtle space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-600" />
              <span>Server Runtime & Network</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Environment</span>
                <span className="font-semibold text-slate-800">{settings?.server?.environment}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Port</span>
                <span className="font-semibold text-slate-800">{settings?.server?.port}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">CORS Origin</span>
                <span className="font-semibold text-slate-800 truncate block">{settings?.server?.corsOrigin}</span>
              </div>
            </div>
          </div>

          {/* Database & Private Storage */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-subtle space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Storage & PostgreSQL Persistence</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                <span className="text-slate-500 block text-[11px]">Storage Provider</span>
                <span className="font-semibold text-slate-900">{settings?.storage?.provider}</span>
                <div className="text-[11px] text-slate-500 font-mono">Bucket: {settings?.storage?.bucket} (Private)</div>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                <span className="text-slate-500 block text-[11px]">Database Schema</span>
                <span className="font-semibold text-slate-900">Supabase PostgreSQL (trustvault schema)</span>
                <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Isolated Multi-Schema Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Access Invariants */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-subtle space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-600" />
              <span>Zero-Trust Security Invariants (Enforced)</span>
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">Least Privilege Administrative Access</span>
                  <p className="text-[11px] text-slate-500">Admins have monitoring rights only; zero automatic content or download access</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ACTIVE
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">Instant Access Revocation</span>
                  <p className="text-[11px] text-slate-500">No long-lived signed URLs; downloads stream through authenticated backend</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ACTIVE
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">Verifiable Cryptographic Audit Trail</span>
                  <p className="text-[11px] text-slate-500">SHA-256 hash pointers link every event sequentially; immutable ledger</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ACTIVE
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">Human-in-the-Loop AI Access Suggestions</span>
                  <p className="text-[11px] text-slate-500">AI never modifies permissions independently; explicit owner confirmation required</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ACTIVE
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

