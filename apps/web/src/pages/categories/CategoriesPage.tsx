import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../services/api';
import { useAppAuth } from '../../context/AuthContext';
import { DocumentCategory } from '../../types';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  FolderLock,
} from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { isAdmin, isOwner } = useAppAuth();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<DocumentCategory | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#0284c7');

  const { data: categoriesResponse, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiRequest<{ success: boolean; data: DocumentCategory[] }>('/categories'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest('/categories', {
        method: 'POST',
        body: JSON.stringify({ name, description, color }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setCreateModalOpen(false);
      setName('');
      setDescription('');
      setColor('#0284c7');
    },
    onError: (err: any) => alert(`Failed: ${err.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/categories/${editCategory?.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, description, color }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditCategory(null);
    },
    onError: (err: any) => alert(`Failed: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    onError: (err: any) => alert(`Delete failed: ${err.message}`),
  });

  const categories = categoriesResponse?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-sky-600" />
            <span>Document Security Categories</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Taxonomy classification for confidential documents. Categorization does not imply inherited access.
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => {
              setName('');
              setDescription('');
              setColor('#0284c7');
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Category</span>
          </button>
        )}
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-500">Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className="bg-white py-16 text-center border border-slate-200 rounded-lg shadow-subtle">
          <FolderLock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800 mb-1">No Categories Defined</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create categories to organize confidential contracts, financial models, and compliance records.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div
              key={c.id}
              className="bg-white p-5 rounded-lg border border-slate-200 shadow-subtle flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-xs font-mono text-slate-500">
                    {c.documentCount ?? 0} docs
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{c.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description || 'No description provided'}</p>
              </div>

              {isOwner && (
                <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setEditCategory(c);
                      setName(c.name);
                      setDescription(c.description || '');
                      setColor(c.color);
                    }}
                    className="p-1.5 text-slate-500 hover:text-amber-600 rounded hover:bg-slate-50"
                    title="Edit Category"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete category "${c.name}"? Documents will become uncategorized.`)) {
                          deleteMutation.mutate(c.id);
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-slate-50"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {(createModalOpen || editCategory) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-elevated border border-slate-200 w-full max-w-md p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              {createModalOpen ? 'Create New Category' : 'Edit Category'}
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Category Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cap Table & Equity Records"
                className="w-full text-xs rounded-md border border-slate-300 py-2 px-3 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Scope and purpose..."
                className="w-full text-xs rounded-md border border-slate-300 py-2 px-3 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-600">{color}</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setCreateModalOpen(false);
                  setEditCategory(null);
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (createModalOpen) createMutation.mutate();
                  else updateMutation.mutate();
                }}
                disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}
                className="px-4 py-1.5 text-xs bg-slate-900 text-white font-medium rounded-md hover:bg-slate-800"
              >
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
