import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../services/api';
import {
  FileText,
  Shield,
  Search,
  Eye,
  Download,
  Share2,
  Calendar,
  Layers,
  RefreshCw,
} from 'lucide-react';

interface AdminDocItem {
  id: string;
  title: string;
  description?: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  currentVersion: number;
  createdAt: string;
  owner: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  category?: {
    id: string;
    name: string;
  };
  activePermissionCount: number;
  versionCount: number;
  downloadCount: number;
  auditCount: number;
}

export const AdminDocumentsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['adminDocuments', page],
    queryFn: () =>
      apiRequest<{
        success: boolean;
        data: AdminDocItem[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/admin/documents?page=${page}&limit=20`),
  });

  const docs = response?.data || [];
  const pagination = response?.pagination;

  const filteredDocs = docs.filter(
    (d) =>
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.owner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.originalFileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-sky-600" />
            <span>Document Inventory & Telemetry</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Global metadata monitoring across all vaults. Strict least-privilege enforced (zero unauthorized content access).
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Security Notice */}
      <div className="bg-slate-900 text-white p-4 rounded-lg border border-slate-800 flex items-start gap-3 shadow-card">
        <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-semibold text-slate-200">Least Privilege Policy Enforced</span>
          <p className="text-slate-400">
            Administrators have full visibility into document presence, version depth, and active share metrics, but cannot read or download confidential document content without an explicit ACL grant from the document owner.
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-subtle flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, owner, or filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Total Documents: <span className="font-semibold text-slate-800">{pagination?.total ?? 0}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-subtle overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading document metadata...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No documents found matching query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Document / File</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Active Grants</th>
                  <th className="py-3 px-4">Versions</th>
                  <th className="py-3 px-4">Downloads</th>
                  <th className="py-3 px-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{doc.title}</div>
                      <div className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                        {doc.originalFileName}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">
                        {doc.owner.firstName ? `${doc.owner.firstName} ${doc.owner.lastName || ''}` : doc.owner.email}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{doc.owner.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      {doc.category ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <Layers className="w-3 h-3 text-slate-500" />
                          <span>{doc.category.name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Uncategorized</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{formatFileSize(doc.fileSize)}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-medium text-[11px] bg-sky-50 text-sky-700 border border-sky-200">
                        <Share2 className="w-3 h-3" />
                        <span>{doc.activePermissionCount}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">v{doc.currentVersion}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{doc.downloadCount}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(doc.createdAt).toLocaleDateString()}
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

