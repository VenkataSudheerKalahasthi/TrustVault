import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../services/api';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  UserX,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface SecurityData {
  summary: {
    totalDeniedAttempts: number;
    privilegeEscalationCount: number;
    deactivationEventCount: number;
    chainIntegrity: boolean;
    verifiedBlockCount: number;
  };
  recentDenials: Array<{
    id: string;
    sequenceNumber: string;
    action: string;
    failureReason?: string;
    ipAddress?: string;
    createdAt: string;
    actor?: { id: string; email: string; role: string };
    document?: { id: string; title: string; originalFileName: string };
  }>;
  privilegeEscalations: Array<{
    id: string;
    sequenceNumber: string;
    action: string;
    failureReason?: string;
    ipAddress?: string;
    createdAt: string;
    actor?: { id: string; email: string; role: string };
  }>;
  deactivationEvents: Array<{
    id: string;
    sequenceNumber: string;
    createdAt: string;
    actor?: { email: string };
    targetUser?: { id: string; email: string; firstName?: string; lastName?: string };
  }>;
  suspiciousIps: Array<{ ip: string; count: number }>;
  chainStatus: {
    isValid: boolean;
    totalVerified: number;
    brokenAtSequence?: number;
    reason?: string;
  };
}

export const AdminSecurityPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['adminSecurity'],
    queryFn: () => apiRequest<{ success: boolean; data: SecurityData }>('/admin/security'),
  });

  const sec = response?.data;
  const summary = sec?.summary;
  const denials = sec?.recentDenials || [];
  const escalations = sec?.privilegeEscalations || [];
  const deactivations = sec?.deactivationEvents || [];
  const suspiciousIps = sec?.suspiciousIps || [];

  const filteredDenials = denials.filter((d) => {
    const s = searchTerm.toLowerCase();
    return (
      d.action.toLowerCase().includes(s) ||
      (d.actor?.email || '').toLowerCase().includes(s) ||
      (d.failureReason || '').toLowerCase().includes(s) ||
      (d.ipAddress || '').includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            <span>Security Incidents & Threat Telemetry</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time audit records of access denials, unauthorized privilege escalations, repeat probes, and deactivations.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Incidents</span>
        </button>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Access Denials</span>
            <Lock className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{isLoading ? '—' : summary?.totalDeniedAttempts}</div>
          <p className="text-[11px] text-slate-500 mt-1">Blocked unauthorized document requests</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Escalation Probes</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{isLoading ? '—' : summary?.privilegeEscalationCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Blocked self-promotion to ADMIN</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Account Deactivations</span>
            <UserX className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{isLoading ? '—' : summary?.deactivationEventCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Accounts locked by administrators</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Audit Chain Status</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {isLoading ? '—' : summary?.chainIntegrity ? 'VALID' : 'TAMPERED'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{summary?.verifiedBlockCount ?? 0} blocks verified</p>
        </div>
      </div>

      {/* Repeated Probes / Suspicious IP Telemetry */}
      {suspiciousIps.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-rose-800 text-xs font-semibold mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Repeated Access Probes Detected by Source IP</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {suspiciousIps.map((s) => (
              <span
                key={s.ip}
                className="inline-flex items-center gap-2 px-2.5 py-1 bg-white rounded border border-rose-300 text-xs font-mono text-rose-900"
              >
                <span>{s.ip}</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold">{s.count} events</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Access Denied Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Recorded Access Denial Events</h3>
            <p className="text-xs text-slate-500">Non-repudiable audit records of blocked download, preview, and API operations</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search denials by actor or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-500">Querying security ledger...</div>
        ) : filteredDenials.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No access denial events recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Seq #</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target Document</th>
                  <th className="py-3 px-4">Denial Reason</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredDenials.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500">#{item.sequenceNumber}</td>
                    <td className="py-3 px-4">
                      <span className="font-sans font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {item.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-800">
                      <div>{item.actor?.email || 'Anonymous / External'}</div>
                      {item.actor?.role && (
                        <span className="text-[10px] text-slate-400 font-mono">Role: {item.actor.role}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600 truncate max-w-xs">
                      {item.document?.title || '—'}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600">
                      {item.failureReason || 'Access unauthorized'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{item.ipAddress || '—'}</td>
                    <td className="py-3 px-4 text-slate-400 text-right whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Privilege Escalations & Account Deactivations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Privilege Escalations */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-subtle p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Privilege Escalation Attempts</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">{escalations.length} recorded</span>
          </div>
          {escalations.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">Zero privilege escalation attempts detected.</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {escalations.map((e) => (
                <div key={e.id} className="p-3 bg-slate-50 rounded border border-slate-200 text-xs">
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 mb-1">
                    <span>Block #{e.sequenceNumber}</span>
                    <span>{new Date(e.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="font-semibold text-slate-800">{e.actor?.email || 'Unknown User'}</div>
                  <div className="text-[11px] text-rose-600 mt-0.5">{e.failureReason}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account Deactivations */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-subtle p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <UserX className="w-4 h-4 text-slate-600" />
              <span>Account Deactivation Events</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">{deactivations.length} recorded</span>
          </div>
          {deactivations.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">Zero account deactivation events recorded.</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {deactivations.map((d) => (
                <div key={d.id} className="p-3 bg-slate-50 rounded border border-slate-200 text-xs">
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 mb-1">
                    <span>Block #{d.sequenceNumber}</span>
                    <span>{new Date(d.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="font-semibold text-slate-800">
                    Target: {d.targetUser?.email || 'Unknown account'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Deactivated by: {d.actor?.email || 'System Administrator'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

