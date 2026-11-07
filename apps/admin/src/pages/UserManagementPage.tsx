import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/api';
import { ApplicationUser, UserRole } from '../types';
import {
  Users,
  Search,
  Filter,
  Shield,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. Fetch Users
  const { data: usersResponse, isLoading, refetch } = useQuery({
    queryKey: ['adminUsers', page, search, roleFilter],
    queryFn: () =>
      apiRequest<{ success: boolean; data: ApplicationUser[]; pagination: any }>('/users', {
        params: { page, limit: 20, search: search || undefined, role: roleFilter || undefined },
      }),
  });

  // 2. Role Update Mutation
  const roleMutation = useMutation({
    mutationFn: (params: { userId: string; role: UserRole }) =>
      apiRequest(`/users/${params.userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: params.role }),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setFeedback({ type: 'success', message: res.message || 'Role updated successfully.' });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message || 'Failed to update user role.' });
    },
  });

  // 3. Status (Activate / Deactivate) Mutation
  const statusMutation = useMutation({
    mutationFn: (params: { userId: string; isActive: boolean }) =>
      apiRequest(`/users/${params.userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: params.isActive }),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setFeedback({ type: 'success', message: res.message || 'Status updated successfully.' });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message || 'Failed to update account status.' });
    },
  });

  const users = usersResponse?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-sky-600" />
            <span>User Management & Role Governance</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Govern application roles and account activation states. Changes are verified on the backend and immediately audited.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-100 transition-colors self-start sm:self-auto"
          title="Refresh users"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-md text-xs font-medium flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-subtle flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs rounded-md border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="DOCUMENT_OWNER">Document Owner</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-subtle overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading user registry...</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No users found matching query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Clerk Identity</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Account Status</th>
                  <th className="px-5 py-3.5">Registered</th>
                  <th className="px-5 py-3.5 text-right">Administrative Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">
                        {u.firstName ? `${u.firstName} ${u.lastName || ''}` : u.email}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{u.email}</div>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-500 text-[11px]">
                      {u.clerkId ? `${u.clerkId.substring(0, 16)}...` : 'System User'}
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          roleMutation.mutate({ userId: u.id, role: e.target.value as UserRole })
                        }
                        disabled={roleMutation.isPending}
                        className="text-xs font-semibold rounded border border-slate-300 py-1 px-2.5 bg-white focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="DOCUMENT_OWNER">DOCUMENT OWNER</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <UserCheck className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <UserX className="w-3 h-3" />
                          <span>Deactivated</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() =>
                          statusMutation.mutate({ userId: u.id, isActive: !u.isActive })
                        }
                        disabled={statusMutation.isPending}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors shadow-sm ${
                          u.isActive
                            ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                            : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {u.isActive ? 'Deactivate Access' : 'Reactivate Account'}
                      </button>
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

