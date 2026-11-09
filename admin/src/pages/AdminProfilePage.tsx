import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { useAppAuth } from '../context/AuthContext';
import {
  User,
  ShieldCheck,
  Mail,
  Calendar,
  Activity,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  Share2,
} from 'lucide-react';

interface ProfileData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    auditLogsActed: number;
    ownedDocuments: number;
    permissionsGranted: number;
  };
}

export const AdminProfilePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const { user: authUser } = useAppAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: () => apiRequest<{ success: boolean; data: ProfileData }>('/admin/profile'),
  });

  const profile = response?.data;

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: () =>
      apiRequest('/admin/profile', {
        method: 'PATCH',
        body: JSON.stringify({ firstName, lastName }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProfile'] });
      setFeedback({ type: 'success', message: 'Admin profile updated successfully and logged in audit trail.' });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message || 'Failed to update profile.' });
    },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <User className="w-6 h-6 text-sky-600" />
            <span>Administrator Identity & Security Profile</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authenticated administrator session, access credentials, and audit footprint.
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-md text-xs font-semibold transition-colors self-start sm:self-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out Session</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-lg text-xs flex items-center gap-2.5 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-subtle overflow-hidden">
        <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-sky-600 text-white flex items-center justify-center text-xl font-bold font-mono">
              {profile?.firstName?.[0] || profile?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  {profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}` : profile?.email}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  ADMINISTRATOR
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{profile?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Active Admin Session</span>
            </span>
          </div>
        </div>

        {/* Security & Activity Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 border-b border-slate-200 bg-slate-50/50">
          <div className="p-4 flex items-center gap-3">
            <Activity className="w-5 h-5 text-sky-600 shrink-0" />
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Audit Events</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {profile?._count?.auditLogsActed ?? 0}
              </span>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Vault Documents</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {profile?._count?.ownedDocuments ?? 0}
              </span>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Enrolled Date</span>
              <span className="text-xs font-semibold text-slate-800">
                {profile ? new Date(profile.createdAt).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Edit Profile Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
          }}
          className="p-6 space-y-5"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Administrative Identity Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Verified Email Address</label>
            <input
              type="email"
              disabled
              value={profile?.email || ''}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Email identity is managed and verified exclusively through Clerk Single Sign-On.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{updateMutation.isPending ? 'Saving Updates...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
