import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../services/api';
import { DocumentPreviewModal } from '../../components/DocumentPreviewModal';
import { DocumentShareModal } from '../../components/DocumentShareModal';
import { DocumentItem, DocumentCategory } from '../../types';
import {
  FileText,
  UploadCloud,
  Share2,
  Trash2,
  Eye,
  Download,
  Edit2,
  Search,
  Filter,
  Plus,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const MyDocumentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [page, setPage] = useState(1);

  // Modals state
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [shareDoc, setShareDoc] = useState<DocumentItem | null>(null);
  const [editDoc, setEditDoc] = useState<DocumentItem | null>(null);
  const [versionDoc, setVersionDoc] = useState<DocumentItem | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<DocumentItem | null>(null);

  // Edit metadata form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');

  // Version form state
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [changeSummary, setChangeSummary] = useState('');

  // 1. Fetch Documents
  const { data: docResponse, isLoading, refetch } = useQuery({
    queryKey: ['myDocuments', page, search, selectedCategory],
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

  // 3. Download handler (authenticated backend stream)
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

  // 4. Update metadata mutation
  const updateMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/documents/${editDoc?.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          categoryId: editCategoryId || null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDocuments'] });
      setEditDoc(null);
    },
    onError: (err: any) => alert(`Update failed: ${err.message}`),
  });

  // 5. Version upload mutation
  const versionMutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      if (versionFile) formData.append('file', versionFile);
      formData.append('changeSummary', changeSummary);
      return apiRequest(`/documents/${versionDoc?.id}/versions`, {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDocuments'] });
      setVersionDoc(null);
      setVersionFile(null);
      setChangeSummary('');
    },
    onError: (err: any) => alert(`Version upload failed: ${err.message}`),
  });

  // 6. Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDocuments'] });
      setDeleteDoc(null);
    },
    onError: (err: any) => alert(`Deletion failed: ${err.message}`),
  });

  const documents = docResponse?.data || [];
  const categories = categoriesResponse?.data || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Documents</h1>
          <p className="text-xs text-slate-500 mt-1">
            Secure vault holding your confidential documents under document-level authorization.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/owner/upload"
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Document</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-subtle flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by title or filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
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
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-subtle overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            Querying authorized database records...
          </div>
        ) : documents.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800 mb-1">No Documents Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Your vault is empty or no documents matched your search filter.
            </p>
            <Link
              to="/owner/upload"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-sky-600 text-white hover:bg-sky-500"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Your First Document</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Document</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Version</th>
                  <th className="px-5 py-3.5">Size</th>
                  <th className="px-5 py-3.5">Upload Date</th>
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
                    <td className="px-5 py-4 font-mono text-slate-600">v{doc.currentVersion}</td>
                    <td className="px-5 py-4 font-mono text-slate-600">{(doc.fileSize / 1024).toFixed(1)} KB</td>
                    <td className="px-5 py-4 text-slate-500">{new Date(doc.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="p-1.5 text-slate-600 hover:text-sky-600 rounded hover:bg-slate-100"
                          title="Preview Document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 text-slate-600 hover:text-emerald-600 rounded hover:bg-slate-100"
                          title="Authorized Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShareDoc(doc)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 rounded hover:bg-slate-100"
                          title="Share & Permissions"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditDoc(doc);
                            setEditTitle(doc.title);
                            setEditDescription(doc.description || '');
                            setEditCategoryId(doc.categoryId || '');
                          }}
                          className="p-1.5 text-slate-600 hover:text-amber-600 rounded hover:bg-slate-100"
                          title="Edit Metadata"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setVersionDoc(doc);
                            setVersionFile(null);
                            setChangeSummary('');
                          }}
                          className="p-1.5 text-slate-600 hover:text-purple-600 rounded hover:bg-slate-100"
                          title="Upload New Version"
                        >
                          <UploadCloud className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteDoc(doc)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 rounded hover:bg-slate-100"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onDownload={handleDownload}
        />
      )}

      {shareDoc && (
        <DocumentShareModal
          document={shareDoc}
          onClose={() => setShareDoc(null)}
        />
      )}

      {/* Edit Metadata Modal */}
      {editDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-elevated border border-slate-200 w-full max-w-md p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Edit Document Metadata</h3>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Document Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-xs rounded-md border border-slate-300 py-2 px-3 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full text-xs rounded-md border border-slate-300 py-2 px-3 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
              <select
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
                className="w-full text-xs rounded-md border border-slate-300 py-2 px-3 focus:ring-1 focus:ring-sky-500"
              >
                <option value="">None (Uncategorized)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditDoc(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || !editTitle.trim()}
                className="px-4 py-1.5 text-xs bg-slate-900 text-white font-medium rounded-md hover:bg-slate-800"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload New Version Modal */}
      {versionDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-elevated border border-slate-200 w-full max-w-md p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Upload Version {versionDoc.currentVersion + 1}
            </h3>
            <p className="text-xs text-slate-500">
              Replacing content increments document version and preserves historical audit evidence.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Select Replacement File</label>
              <input
                type="file"
                onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Summary of Changes</label>
              <input
                type="text"
                placeholder="e.g. Updated financial appendix"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                className="w-full text-xs rounded-md border border-slate-300 py-2 px-3 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setVersionDoc(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => versionMutation.mutate()}
                disabled={versionMutation.isPending || !versionFile}
                className="px-4 py-1.5 text-xs bg-slate-900 text-white font-medium rounded-md hover:bg-slate-800"
              >
                {versionMutation.isPending ? 'Uploading...' : 'Commit Version'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-elevated border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-900">Confirm Document Deletion</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-slate-800">"{deleteDoc.title}"</span>?
              Document contents will be marked deleted and inaccessible. Historical audit logs will be permanently retained.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteDoc(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteDoc.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-1.5 text-xs bg-rose-600 text-white font-medium rounded-md hover:bg-rose-500"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

