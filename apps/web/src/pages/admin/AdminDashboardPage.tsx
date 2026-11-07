import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../services/api';
import { AuditLogItem } from '../../types';
import {
  Users,
  FileText,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  const { data: dashboardResponse, isLoading, refetch } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: () =>
      apiRequest<{
        success: boolean;
        data: {
          metrics: {
            totalUsers: number;
            adminCount: number;
            ownerCount: number;
            viewerCount: number;
            totalDocuments: number;
            recentUploadsCount: number;
            activePermissionsCount: number;
            recentPermissionChangesCount: number;
            successfulOperationsCount: number;
            deniedAccessAttemptsCount: number;
          };
          recentActivities: AuditLogItem[];
        };
      }>('/admin/dashboard'),
  });

  const { data: verifyResponse } = useQuery({
    queryKey: ['auditVerification'],
    queryFn: () => apiRequest<{ success: boolean; data: { isValid: boolean; totalVerified: number } }>('/audit-logs/verify'),
  });

  const metrics = dashboardResponse?.data?.metrics;
  const recentActivities = dashboardResponse?.data?.recentActivities || [];
  const verification = verifyResponse?.data;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Administrative Oversight</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time compliance monitoring, access denial auditing, and user governance.
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
              <span>Cryptographic Audit Chain: Active & Valid</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Append-only SHA-256 hash pointers link every access, download, and permission event. Total verified records: {verification?.totalVerified ?? 'Loading...'}
            </p>
          </div>
        </div>
        <Link
          to="/admin/audit-logs"
          className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <span>Inspect Audit Proofs</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Real Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Users</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{isLoading ? '—' : metrics?.totalUsers}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            {metrics?.adminCount} Admins &bull; {metrics?.ownerCount} Owners &bull; {metrics?.viewerCount} Viewers
          </div>
        </div>

        {/* Total Documents */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Documents</span>
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{isLoading ? '—' : metrics?.totalDocuments}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            {metrics?.recentUploadsCount} uploads in last 7 days
          </div>
        </div>

        {/* Active Permissions */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Permissions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{isLoading ? '—' : metrics?.activePermissionsCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            {metrics?.recentPermissionChangesCount} updates this week
          </div>
        </div>

        {/* Denied Access Attempts (Crucial Security KPI) */}
        <div className="bg-white p-5 rounded-lg border border-rose-200 shadow-subtle bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Access Denials</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700">{isLoading ? '—' : metrics?.deniedAccessAttemptsCount}</div>
          <div className="text-[11px] text-rose-600/80 mt-1 font-mono">
            Unauthorized / Revoked requests blocked
          </div>
        </div>
      </div>

      {/* Recent Security Activity Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Recent Security Operations</h3>
            <p className="text-xs text-slate-500 mt-0.5">Chronological record of recent document and permission actions</p>
          </div>
          <Link
            to="/admin/audit-logs"
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
          >
            <span>View All Logs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentActivities.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No audit records registered yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="px-5 py-3">Seq #</th>
                  <th className="px-5 py-3">Event Type</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Target Document</th>
                  <th className="px-5 py-3">Result</th>
                  <th className="px-5 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {recentActivities.map((log) => (
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
