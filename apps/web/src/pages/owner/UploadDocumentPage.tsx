import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '../../services/api';
import { DocumentCategory } from '../../types';
import {
  UploadCloud,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  Lock,
  ArrowRight,
} from 'lucide-react';

export const UploadDocumentPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedDoc, setUploadedDoc] = useState<any>(null);

  // Fetch Categories for dropdown
  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiRequest<{ success: boolean; data: DocumentCategory[] }>('/categories'),
  });

  const categories = categoriesResponse?.data || [];

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectFile = (selected: File) => {
    setUploadError(null);
    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.txt', '.csv', '.docx', '.xlsx'];
    const hasValidExt = validExtensions.some((ext) => selected.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setUploadError('Invalid file type. Supported formats: PDF, PNG, JPG, TXT, CSV, DOCX, XLSX.');
      return;
    }

    if (selected.size > 50 * 1024 * 1024) {
      setUploadError('File size exceeds the 50MB enterprise limit.');
      return;
    }

    setFile(selected);
    if (!title) {
      // Auto-populate title from filename without extension
      const baseName = selected.name.substring(0, selected.name.lastIndexOf('.')) || selected.name;
      setTitle(baseName.replace(/[_-]/g, ' '));
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Please select a file.');
      if (!title.trim()) throw new Error('Please enter a document title.');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      if (description) formData.append('description', description);
      if (categoryId) formData.append('categoryId', categoryId);

      return apiRequest<{ success: boolean; data: any }>('/documents', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: (res) => {
      setUploadedDoc(res.data);
    },
    onError: (err: any) => {
      setUploadError(err.message || 'Failed to upload document to private vault.');
    },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Upload Confidential Document</h1>
        <p className="text-xs text-slate-500 mt-1">
          Files are verified by signature, encrypted, and isolated in private storage with backend-authorized access.
        </p>
      </div>

      {/* Success State */}
      {uploadedDoc ? (
        <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-card text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Document Uploaded Successfully</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            <span className="font-semibold text-slate-800">"{uploadedDoc.title}"</span> has been encrypted and assigned storage path under Version 1. An audit event was sealed in the cryptographic log.
          </p>

          <div className="p-3 bg-slate-50 rounded-md border border-slate-200 max-w-sm mx-auto text-xs font-mono text-slate-600 space-y-1 text-left">
            <div><span className="text-slate-400">File:</span> {uploadedDoc.originalFileName}</div>
            <div><span className="text-slate-400">Size:</span> {(uploadedDoc.fileSize / 1024).toFixed(1)} KB</div>
            <div><span className="text-slate-400">Hash:</span> {uploadedDoc.fileHash?.substring(0, 20)}...</div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => {
                setUploadedDoc(null);
                setFile(null);
                setTitle('');
                setDescription('');
                setCategoryId('');
              }}
              className="px-4 py-2 text-xs border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 font-medium"
            >
              Upload Another
            </button>
            <button
              onClick={() => navigate('/owner/documents')}
              className="flex items-center gap-2 px-4 py-2 text-xs bg-slate-900 text-white rounded-md hover:bg-slate-800 font-semibold shadow-sm"
            >
              <span>View in Vault</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-subtle p-6 space-y-6">
          {/* Error Banner */}
          {uploadError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-md text-rose-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
              <button onClick={() => setUploadError(null)} className="text-rose-500 hover:text-rose-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Select or Drop File
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-sky-500 bg-sky-50/50'
                  : file
                  ? 'border-emerald-400 bg-emerald-50/20'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleSelectFile(e.target.files[0]);
                }}
              />

              {file ? (
                <div className="flex flex-col items-center gap-2 text-emerald-700">
                  <div className="p-3 bg-emerald-100 rounded-full">
                    <FileCheck className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="text-sm font-semibold">{file.name}</div>
                  <div className="text-xs text-slate-500 font-mono">
                    {(file.size / 1024).toFixed(1)} KB &bull; {file.type || 'Binary document'}
                  </div>
                  <div className="text-xs text-slate-400 underline mt-1">Click or drop to replace</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <div className="p-3 bg-slate-100 rounded-full text-slate-600">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    Drag and drop your confidential document here
                  </div>
                  <div className="text-xs text-slate-500">
                    or <span className="text-sky-600 font-medium">browse from your computer</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-1">
                    PDF, PNG, JPG, TXT, CSV, DOCX, XLSX (up to 50MB)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Document Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Master Services Agreement 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs rounded-md border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Description / Context
              </label>
              <textarea
                placeholder="Brief summary of document purpose or restrictions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full text-xs rounded-md border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Security Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-xs rounded-md border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
              >
                <option value="">None (Uncategorized)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Security Guarantee Note */}
          <div className="p-3.5 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-slate-800">Zero-Trust Isolation:</span> You remain the sole owner of this document. Other users, including administrators, cannot access its binary content without explicit permissions granted by you.
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => navigate('/owner/documents')}
              className="px-4 py-2 text-xs border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => uploadMutation.mutate()}
              disabled={!file || !title.trim() || uploadMutation.isPending}
              className="px-6 py-2 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
            >
              {uploadMutation.isPending ? (
                <>
                  <UploadCloud className="w-4 h-4 animate-bounce" />
                  <span>Encrypting & Uploading...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Upload & Seal Document</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

