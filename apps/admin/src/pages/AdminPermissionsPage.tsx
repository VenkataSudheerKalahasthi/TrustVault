import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../services/api';
import {
  Share2,
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

interface PermissionAuditItem {
  id: string;
  permission: 'READ' | 'EDIT';
  canDownload: boolean;
  isRevoked: boolean;
  revokedAt?: string;
  revocationReason?: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  grantedBy: {
    id: string;
    email: string;
  };
  revokedBy?: {
    id: string;
    email: string;
  };
  document: {
    id: string;
    title: string;
    originalFileName: string;
  };
}

export const AdminPermissionsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['adminPermissions', page],
    queryFn: () =>
      apiRequest<{
        success: boolean;
        data: PermissionAuditItem[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/admin/permissions?page=${page}&limit=25`),
  });

  const permissions = response?.data || [];
  const pagination = response?.pagination;

  const filteredPerms = permissions.filter(
    (p) =>
      p.document.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.grantedBy.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Share2 className="w-6 h-6 text-sky-600" />
            <span>Document Permissions & Revocation Audit</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            End-to-end monitoring of all active document access grants, permission changes, and immediate revocations.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Grants</span>
        </button>
      </div>

      {/* Search & Counter */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-subtle flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by document, viewer email, or grantor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Total Recorded Permissions: <span className="font-semibold text-slate-800">{pagination?.total ?? 0}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-subtle overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading access grants telemetry...</div>
        ) : filteredPerms.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No permission records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Recipient (Viewer)</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Download</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Granted By</th>
                  <th className="py-3 px-4">Granted At</th>
                  <th className="py-3 px-4">Revocation Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPerms.map((perm) => (
                  <tr key={perm.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{perm.document.title}</div>
                      <div className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                        {perm.document.originalFileName}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">
                        {perm.user.firstName ? `${perm.user.firstName} ${perm.user.lastName || ''}` : perm.user.email}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{perm.user.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${
                          perm.permission === 'EDIT'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}
                      >
                        {perm.permission}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono ${
                          perm.canDownload ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'
                        }`}
                      >
                        {perm.canDownload ? 'Allowed' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {perm.isRevoked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" />
                          <span>REVOKED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ACTIVE</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{perm.grantedBy.email}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(perm.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {perm.isRevoked ? (
                        <div className="text-[11px]">
                          <span className="text-rose-600 font-medium">
                            {perm.revocationReason || 'Access revoked'}
                          </span>
                          {perm.revokedBy && (
                            <span className="block text-slate-400 font-mono">By {perm.revokedBy.email}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">—</span>
                      )}
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

