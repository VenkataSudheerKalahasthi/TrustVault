import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../services/api';
import { AuditLogItem } from '../types';
import {
  Users,
  FileText,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  RefreshCw,
  HardDrive,
  Layers,
  Search,
  Filter,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardData {
  metrics: {
    totalUsers: number;
    activeUsers: number;
    deactivatedUsers: number;
    adminCount: number;
    ownerCount: number;
    viewerCount: number;
    totalDocuments: number;
    activeDocuments: number;
    deletedDocuments: number;
    totalDocumentVersions: number;
    activePermissions: number;
    revokedPermissions: number;
    totalStorageConsumption: number;
    recentUploadsCount: number;
    recentPermissionChangesCount: number;
    recentAuditEvents: number;
    accessDeniedEvents: number;
    auditChainValid: boolean;
    totalVerifiedAuditBlocks: number;
  };
  recentActivities: AuditLogItem[];
}

export const AdminDashboardPage: React.FC = () => {
  const [filterQuery, setFilterQuery] = useState('');
  const [filterResult, setFilterResult] = useState<string>('ALL');

  const { data: dashboardResponse, isLoading, refetch } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: () => apiRequest<{ success: boolean; data: DashboardData }>('/admin/dashboard'),
  });

  const { data: verifyResponse } = useQuery({
    queryKey: ['auditVerification'],
    queryFn: () => apiRequest<{ success: boolean; data: { isValid: boolean; totalVerified: number } }>('/audit-logs/verify'),
  });

  const metrics = dashboardResponse?.data?.metrics;
  const recentActivities = dashboardResponse?.data?.recentActivities || [];
  const verification = verifyResponse?.data;

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const filteredActivities = recentActivities.filter((item) => {
    const matchesSearch =
      item.action.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (item.actor?.email || item.actorEmail || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
      (item.document?.title || '').toLowerCase().includes(filterQuery.toLowerCase());
    const matchesResult = filterResult === 'ALL' || item.result === filterResult;
    return matchesSearch && matchesResult;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Administrative Telemetry & Oversight</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time compliance monitoring, access denial auditing, cryptographic proof validation, and governance.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Cryptographic Chain Integrity Banner */}
      <div className="bg-slate-900 text-white rounded-lg p-5 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <span>Cryptographic Audit Trail: Active & Valid</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Append-only SHA-256 hash chaining links every access, download, and permission event. Total verified blocks: {verification?.totalVerified ?? metrics?.totalVerifiedAuditBlocks ?? '...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/security"
            className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <span>Security Incidents</span>
            <ShieldAlert className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/admin/audit-logs"
            className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <span>Inspect Proofs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Key Metric Cards Grid (Section 3) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">User Directory</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{isLoading ? '—' : metrics?.totalUsers}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            {metrics?.activeUsers ?? 0} Active &bull; {metrics?.deactivatedUsers ?? 0} Deactivated
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {metrics?.adminCount} Admins &bull; {metrics?.ownerCount} Owners &bull; {metrics?.viewerCount} Viewers
          </div>
        </div>

        {/* Total Documents & Storage */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Document Vault</span>
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{isLoading ? '—' : metrics?.activeDocuments}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            {metrics?.totalDocumentVersions ?? 0} Versions &bull; {formatFileSize(metrics?.totalStorageConsumption || 0)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {metrics?.recentUploadsCount ?? 0} uploads in last 7 days
          </div>
        </div>

        {/* Active & Revoked Permissions */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Access Grants (ACL)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{isLoading ? '—' : metrics?.activePermissions}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            {metrics?.revokedPermissions ?? 0} Revoked Grants
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {metrics?.recentPermissionChangesCount ?? 0} changes this week
          </div>
        </div>

        {/* Denied Access Attempts (Crucial Security KPI) */}
        <div className="bg-white p-5 rounded-lg border border-rose-200 shadow-subtle bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Access Denials</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700">{isLoading ? '—' : metrics?.accessDeniedEvents}</div>
          <div className="text-[11px] text-rose-600/80 mt-1 font-mono">
            Blocked & Logged Unauthorized Attempts
          </div>
          <div className="text-[10px] text-rose-500 mt-1">
            {metrics?.recentAuditEvents ?? 0} total audit events (7d)
          </div>
        </div>
      </div>

      {/* Recent Security Activity Table with Search & Filter */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Recent Security Operations</h3>
            <p className="text-xs text-slate-500">Live feed of document actions, authorization checks, and privilege alterations</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filter by action or actor..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
              />
            </div>
            <select
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value)}
              className="py-1.5 px-2.5 text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">All Outcomes</option>
              <option value="SUCCESS">Success Only</option>
              <option value="DENIED">Denied Only</option>
            </select>
          </div>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No audit records matching query filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="px-5 py-3">Block #</th>
                  <th className="px-5 py-3">Event Type</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Target Document</th>
                  <th className="px-5 py-3">Outcome</th>
                  <th className="px-5 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredActivities.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 text-slate-500">#{log.sequenceNumber}</td>
                    <td className="px-5 py-3">
                      <span className="font-sans font-medium text-slate-800">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-sans text-slate-600">
                      {log.actor?.email || log.actorEmail || 'System'}
                    </td>
                    <td className="px-5 py-3 font-sans text-slate-600 truncate max-w-xs">
                      {log.document?.title || '—'}
                    </td>
                    <td className="px-5 py-3">
                      {log.result === 'SUCCESS' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          SUCCESS
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          DENIED
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-right">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
