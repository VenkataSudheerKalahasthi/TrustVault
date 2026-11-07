import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/api';
import { X, UserPlus, Trash2, Search, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import { DocumentItem, DocumentPermissionItem, ApplicationUser } from '../types';

interface DocumentShareModalProps {
  document: DocumentItem | null;
  onClose: () => void;
}

export const DocumentShareModal: React.FC<DocumentShareModalProps> = ({ document, onClose }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedPermission, setSelectedPermission] = useState<'READ' | 'EDIT'>('READ');
  const [canDownload, setCanDownload] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. Fetch current permissions for this document
  const { data: permsResponse, isLoading: permsLoading } = useQuery({
    queryKey: ['documentPermissions', document?.id],
    queryFn: () => apiRequest<{ success: boolean; data: DocumentPermissionItem[] }>(`/documents/${document?.id}/permissions`),
    enabled: Boolean(document?.id),
  });

  // 2. Fetch candidate users for sharing
  const { data: usersResponse } = useQuery({
    queryKey: ['candidateUsers', searchQuery],
    queryFn: () => apiRequest<{ success: boolean; data: ApplicationUser[] }>('/users', { params: { search: searchQuery, limit: 10 } }),
    enabled: Boolean(document?.id),
  });

  // 3. Grant permission mutation
  const grantMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/documents/${document?.id}/permissions`, {
        method: 'POST',
        body: JSON.stringify({
          targetUserId: selectedUserId,
          permission: selectedPermission,
          canDownload,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentPermissions', document?.id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setFeedback({ type: 'success', message: 'Document access granted successfully.' });
      setSelectedUserId('');
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message || 'Failed to grant document access.' });
    },
  });

  // 4. Revoke permission mutation (Instant Revocation)
  const revokeMutation = useMutation({
    mutationFn: (permissionId: string) =>
      apiRequest(`/documents/${document?.id}/permissions/${permissionId}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: 'Revoked by owner via management UI' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentPermissions', document?.id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setFeedback({ type: 'success', message: 'Access revoked immediately. User can no longer view or download file.' });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message || 'Failed to revoke access.' });
    },
  });

  if (!document) return null;

  const activePermissions = permsResponse?.data?.filter((p) => !p.isRevoked) || [];
  const candidateUsers = usersResponse?.data?.filter((u) => u.id !== document.ownerId) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-elevated border border-slate-200 w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-100 rounded-md text-sky-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Manage Access & Permissions</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-md">
                {document.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`px-5 py-2.5 text-xs font-medium flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="p-5 overflow-y-auto space-y-6">
          {/* Grant New Permission Form */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-sky-600" />
              <span>Grant Document Access</span>
            </h4>

            {/* User Search & Selection */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Select Registered User</label>
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter users by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                />
              </div>

              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full text-xs rounded-md border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
              >
                <option value="">-- Choose a user to share with --</option>
                {candidateUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName ? `${u.firstName} ${u.lastName || ''} (${u.email})` : u.email} [{u.role}]
                  </option>
                ))}
              </select>
            </div>

            {/* Permission Level & Download Policy */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Access Level</label>
                <select
                  value={selectedPermission}
                  onChange={(e) => setSelectedPermission(e.target.value as any)}
                  className="w-full text-xs rounded-md border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                >
                  <option value="READ">Read (Preview & metadata only)</option>
                  <option value="EDIT">Edit (Can upload replacement version)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Download Permission</label>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canDownload}
                    onChange={(e) => setCanDownload(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                  />
                  <span className="text-xs text-slate-700">Allow file download</span>
                </label>
              </div>
            </div>

            <button
              onClick={() => grantMutation.mutate()}
              disabled={!selectedUserId || grantMutation.isPending}
              className="w-full py-2 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>{grantMutation.isPending ? 'Granting...' : 'Confirm & Grant Access'}</span>
            </button>
          </div>

          {/* Active Grants List with Revoke Action */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Currently Authorized Users ({activePermissions.length})
            </h4>

            {permsLoading ? (
              <div className="text-xs text-slate-500 py-4 text-center">Loading permissions...</div>
            ) : activePermissions.length === 0 ? (
              <div className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                No external users currently have access to this confidential document.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                {activePermissions.map((perm) => (
                  <div key={perm.id} className="p-3 bg-white flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <div className="text-xs font-medium text-slate-900">
                        {perm.user.firstName ? `${perm.user.firstName} ${perm.user.lastName || ''}` : perm.user.email}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {perm.user.email} &bull; Granted {new Date(perm.grantedAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-medium">
                          {perm.permission}
                        </span>
                        {perm.canDownload ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                            Download Allowed
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                            Download Restricted
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => revokeMutation.mutate(perm.id)}
                      disabled={revokeMutation.isPending}
                      className="px-2.5 py-1.5 rounded-md text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1.5 shadow-sm"
                      title="Immediately revoke access"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

