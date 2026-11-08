import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../services/api';
import { useAppAuth } from '../../context/AuthContext';
import { DocumentItem, AISuggestionItem } from '../../types';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  FileText,
  UserCheck,
  AlertCircle,
  Info,
} from 'lucide-react';

export const AISuggestionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAppAuth();
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Permission selection per suggestion card
  const [decisionPermissions, setDecisionPermissions] = useState<Record<string, 'READ' | 'EDIT'>>({});
  const [decisionDownloads, setDecisionDownloads] = useState<Record<string, boolean>>({});

  // 1. Fetch Owned Documents
  const { data: docsResponse } = useQuery({
    queryKey: ['myDocumentsForAI'],
    queryFn: () => apiRequest<{ success: boolean; data: DocumentItem[] }>('/documents', { params: { limit: 50 } }),
    enabled: !isAuthLoading && !!user,
  });

  const documents = docsResponse?.data?.filter((d) => d.isOwner) || [];

  // 2. Fetch AI Suggestions for selected document
  const { data: suggestionsResponse, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['aiSuggestions', selectedDocId],
    queryFn: () => apiRequest<{ success: boolean; data: AISuggestionItem[] }>(`/documents/${selectedDocId}/ai-suggestions`),
    enabled: Boolean(selectedDocId),
  });

  // 3. Generate Suggestions Mutation
  const generateMutation = useMutation({
    mutationFn: (docId: string) =>
      apiRequest(`/documents/${docId}/ai-suggestions`, { method: 'POST' }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['aiSuggestions', selectedDocId] });
      setFeedback({
        type: 'success',
        message: res.data?.notice || 'AI analyzed permitted metadata and generated candidate suggestions for review.',
      });
      setTimeout(() => setFeedback(null), 5000);
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message || 'Failed to generate suggestions.' });
    },
  });

  // 4. Decision Mutation (Human Confirmation)
  const decisionMutation = useMutation({
    mutationFn: (params: { suggestionId: string; decision: 'APPROVED' | 'REJECTED' }) => {
      const permission = decisionPermissions[params.suggestionId] || 'READ';
      const canDownload = decisionDownloads[params.suggestionId] ?? true;

      return apiRequest(`/ai-suggestions/${params.suggestionId}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: params.decision,
          permission,
          canDownload,
        }),
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['aiSuggestions', selectedDocId] });
      setFeedback({
        type: 'success',
        message: `Suggestion ${vars.decision.toLowerCase()} and recorded in verifiable audit trail.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message || 'Failed to record decision.' });
    },
  });

  const suggestions = suggestionsResponse?.data || [];
  const pendingSuggestions = suggestions.filter((s) => s.status === 'PENDING');
  const decidedSuggestions = suggestions.filter((s) => s.status !== 'PENDING');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-amber-500" />
          <span>AI Access Suggestions (Human-in-the-Loop)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Context-aware access recommendations. In accordance with zero-trust principles, AI never grants permissions automatically; every access grant requires explicit owner review and confirmation.
        </p>
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

      {/* Document Selector Card */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-1/2">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Select Document to Analyze
          </label>
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="w-full text-xs rounded-md border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
          >
            <option value="">-- Choose an owned document --</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} ({d.originalFileName})
              </option>
            ))}
          </select>
        </div>

        {selectedDocId && (
          <button
            onClick={() => generateMutation.mutate(selectedDocId)}
            disabled={generateMutation.isPending}
            className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 self-end"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{generateMutation.isPending ? 'Analyzing Metadata...' : 'Run Access Analysis'}</span>
          </button>
        )}
      </div>

      {/* Suggestions Section */}
      {!selectedDocId ? (
        <div className="bg-white py-16 text-center border border-slate-200 rounded-lg shadow-subtle">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Select a Document Above</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Select one of your owned documents to inspect or generate contextual access recommendations.
          </p>
        </div>
      ) : suggestionsLoading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Loading access recommendations...
        </div>
      ) : suggestions.length === 0 ? (
        <div className="bg-white py-14 text-center border border-slate-200 rounded-lg shadow-subtle space-y-3">
          <UserCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No Suggestions Pending</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click 'Run Access Analysis' to evaluate registered users against this document's category and metadata.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Suggestions */}
          {pendingSuggestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span>Pending Human Approval</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">
                  {pendingSuggestions.length}
                </span>
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                {pendingSuggestions.map((item) => (
                  <div key={item.id} className="bg-white p-5 rounded-lg border border-slate-200 shadow-subtle space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {item.targetUser.firstName ? `${item.targetUser.firstName} ${item.targetUser.lastName || ''}` : item.targetUser.email}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{item.targetUser.email}</div>
                      </div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                        {item.confidenceScore ? `${Math.round(item.confidenceScore * 100)}% Match` : 'Suggested'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                      <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{item.reason}</span>
                    </div>

                    {/* Human Choice Configuration */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Grant Access</label>
                        <select
                          value={decisionPermissions[item.id] || 'READ'}
                          onChange={(e) =>
                            setDecisionPermissions({ ...decisionPermissions, [item.id]: e.target.value as any })
                          }
                          className="w-full text-xs rounded border border-slate-300 py-1.5 px-2 bg-white"
                        >
                          <option value="READ">Read (Preview)</option>
                          <option value="EDIT">Edit (Replace)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Download Policy</label>
                        <label className="flex items-center gap-1.5 mt-2 cursor-pointer text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={decisionDownloads[item.id] ?? true}
                            onChange={(e) =>
                              setDecisionDownloads({ ...decisionDownloads, [item.id]: e.target.checked })
                            }
                            className="rounded text-sky-600 h-3.5 w-3.5"
                          />
                          <span>Allow Download</span>
                        </label>
                      </div>
                    </div>

                    {/* Decision Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => decisionMutation.mutate({ suggestionId: item.id, decision: 'APPROVED' })}
                        disabled={decisionMutation.isPending}
                        className="flex-1 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-500 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve & Grant</span>
                      </button>
                      <button
                        onClick={() => decisionMutation.mutate({ suggestionId: item.id, decision: 'REJECTED' })}
                        disabled={decisionMutation.isPending}
                        className="flex-1 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5 text-slate-500" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historical Decisions */}
          {decidedSuggestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Decision History ({decidedSuggestions.length})
              </h3>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg bg-white overflow-hidden text-xs">
                {decidedSuggestions.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">{item.targetUser.email}</span>
                      <span className="text-slate-400 mx-2">&bull;</span>
                      <span className="text-slate-500">{item.reason}</span>
                    </div>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-medium border ${
                        item.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

