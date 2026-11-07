import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../services/api';
import { DocumentPreviewModal } from '../../components/DocumentPreviewModal';
import { DocumentItem, DocumentCategory } from '../../types';
import {
  Share2,
  Eye,
  Download,
  Lock,
  Search,
  Filter,
  FileText,
  RefreshCw,
} from 'lucide-react';

export const ViewerDashboardPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  // 1. Fetch Shared Documents
  const { data: docResponse, isLoading, refetch } = useQuery({
    queryKey: ['sharedDocuments', page, search, selectedCategory],
    queryFn: () =>
      apiRequest<{ success: boolean; data: DocumentItem[]; pagination: any }>('/documents', {
        params: { page, limit: 15, search: search || undefined, categoryId: selectedCategory || undefined },
      }),
  });

  // 2. Fetch Categories
  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiRequest<{ success: boolean; data: DocumentCategory[] }>('/categories'),
  });

  const handleDownload = async (doc: DocumentItem) => {
    try {
      const blob = await apiRequest<Blob>(`/documents/${doc.id}/download`);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.originalFileName;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Download failed: ${err.message || 'Access Denied'}`);
    }
  };

  const documents = docResponse?.data || [];
  const categories = categoriesResponse?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Share2 className="w-6 h-6 text-sky-600" />
            <span>Shared with Me</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Confidential documents shared with your account under strict real-time access policy.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-100 transition-colors self-start sm:self-auto"
          title="Refresh shared documents"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-subtle flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search shared documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs rounded-md border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Shared Documents Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-subtle overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            Checking real-time document permissions...
          </div>
        ) : documents.length === 0 ? (
          <div className="py-16 text-center">
            <Lock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800 mb-1">No Shared Documents</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You do not currently have active access grants to any external documents.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Document</th>
                  <th className="px-5 py-3.5">Owner</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Access Rights</th>
                  <th className="px-5 py-3.5">Size</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{doc.title}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{doc.originalFileName}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {doc.owner?.firstName ? `${doc.owner.firstName} ${doc.owner.lastName || ''}` : doc.owner?.email}
                    </td>
                    <td className="px-5 py-4">
                      {doc.category ? (
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-medium border"
                          style={{
                            backgroundColor: `${doc.category.color}15`,
                            color: doc.category.color,
                            borderColor: `${doc.category.color}30`,
                          }}
                        >
                          {doc.category.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-semibold text-[10px]">
                          {doc.userPermission || 'READ'}
                        </span>
                        {doc.canDownload ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                            Download Allowed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                            Download Restricted
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-600">{(doc.fileSize / 1024).toFixed(1)} KB</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium text-xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>Preview</span>
                        </button>

                        {doc.canDownload ? (
                          <button
                            onClick={() => handleDownload(doc)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-900 text-white hover:bg-slate-800 font-medium text-xs transition-colors shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-100 text-slate-400 font-medium text-xs cursor-not-allowed"
                            title="Download is prohibited by document owner policy"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Restricted</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
};
