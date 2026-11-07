import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/api';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Search,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
} from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  documentCount?: number;
}

export const AdminCategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#0284c7');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['adminCategories'],
    queryFn: () => apiRequest<{ success: boolean; data: CategoryItem[] }>('/admin/categories'),
  });

  const categories = response?.data || [];

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setColor('#0284c7');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setColor(cat.color || '#0284c7');
    setFormError(null);
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editingCategory) {
        return apiRequest(`/admin/categories/${editingCategory.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, description, color }),
        });
      }
      return apiRequest('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name, description, color }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to save category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/admin/categories/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
    },
    onError: (err: any) => {
      alert(`Deletion rejected: ${err.message}`);
    },
  });

  const handleDelete = (cat: CategoryItem) => {
    if (cat.documentCount && cat.documentCount > 0) {
      alert(
        `Cannot delete category "${cat.name}": it is currently associated with ${cat.documentCount} document(s). Reassign them first.`
      );
      return;
    }
    if (confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      deleteMutation.mutate(cat.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-sky-600" />
            <span>Category Governance & Classification</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage enterprise document classifications. Strict data integrity enforced (categories with documents cannot be orphaned).
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* Search and Counts */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-subtle flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search categories by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Total Categories: <span className="font-semibold text-slate-800">{categories.length}</span>
        </div>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-500">Loading enterprise categories...</div>
      ) : filteredCategories.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-500">No categories found matching query.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white p-5 rounded-lg border border-slate-200 shadow-subtle flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full inline-block shrink-0 shadow-sm"
                      style={{ backgroundColor: cat.color }}
                    />
                    <h3 className="text-sm font-bold text-slate-900">{cat.name}</h3>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    <FileText className="w-3 h-3 text-slate-500" />
                    <span>{cat.documentCount ?? 0} docs</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">
                  {cat.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[10px] text-slate-400 font-mono">
                  Created {new Date(cat.createdAt).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded transition-colors"
                    title="Edit category"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                    title="Delete category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-elevated border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="p-5 space-y-4"
            >
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Legal & Contracts"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the classification..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Accent Badge Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-8 border border-slate-300 rounded cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-32 px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending || !name.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {saveMutation.isPending ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

