import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../services/api';
import { DocumentPreviewModal } from '../../components/DocumentPreviewModal';
import { DocumentItem, DocumentCategory } from '../../types';
import {
  Search,
  Filter,
  FileText,
  Eye,
  Download,
  Lock,
  Calendar,
} from 'lucide-react';

export const SearchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  // 1. Fetch Categories
  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiRequest<{ success: boolean; data: DocumentCategory[] }>('/categories'),
  });

  // 2. Search Query (debounced or triggered on state)
  const { data: searchResponse, isLoading } = useQuery({
    queryKey: ['searchDocuments', searchTerm, categoryId, dateFrom, dateTo, page],
    queryFn: () =>
      apiRequest<{ success: boolean; data: DocumentItem[]; pagination: any }>('/search', {
        params: {
          search: searchTerm || undefined,
          categoryId: categoryId || undefined,
          dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
          dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
          page,
          limit: 20,
        },
      }),
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

  const documents = searchResponse?.data || [];
  const categories = categoriesResponse?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Search className="w-6 h-6 text-sky-600" />
          <span>Search Vault Documents</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Real-time database search. Results are automatically scoped to your active authorization boundaries.
        </p>
      </div>

      {/* Search Input & Filters Box */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-subtle space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by document title, keywords, or original filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-slate-50/50"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Filter by Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full text-xs rounded-md border border-slate-300 py-1.5 px-2.5 bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Created After</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full text-xs rounded-md border border-slate-300 py-1.5 px-2.5 bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Created Before</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full text-xs rounded-md border border-slate-300 py-1.5 px-2.5 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-subtle overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-500">Executing authorized database search...</div>
        ) : documents.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800 mb-1">No Matching Documents</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No documents within your authorization boundary match the selected filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Document</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Ownership / Access</th>
                  <th className="px-5 py-3.5">Size</th>
                  <th className="px-5 py-3.5">Created</th>
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
                      {doc.isOwner ? (
                        <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-semibold text-[10px]">
                          DOCUMENT OWNER
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 font-medium text-[10px]">
                          {doc.userPermission || 'SHARED READ'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-600">{(doc.fileSize / 1024).toFixed(1)} KB</td>
                    <td className="px-5 py-4 text-slate-500">{new Date(doc.createdAt).toLocaleDateString()}</td>
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
                            title="Download restricted by policy"
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

