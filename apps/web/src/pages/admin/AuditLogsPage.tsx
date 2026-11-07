import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../services/api';
import { AuditLogItem } from '../../types';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  FileCode,
  RefreshCw,
} from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedResult, setSelectedResult] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // 1. Fetch Audit Logs
  const { data: logsResponse, isLoading, refetch } = useQuery({
    queryKey: ['auditLogs', page, selectedAction, selectedResult],
    queryFn: () =>
      apiRequest<{ success: boolean; data: AuditLogItem[]; pagination: any }>('/audit-logs', {
        params: {
          page,
          limit: 25,
          action: selectedAction || undefined,
          result: selectedResult || undefined,
        },
      }),
  });

  // 2. Fetch Audit Chain Verification
  const { data: verifyResponse, isLoading: isVerifying, refetch: recheckChain } = useQuery({
    queryKey: ['auditChainStatus'],
    queryFn: () =>
      apiRequest<{
        success: boolean;
        data: { isValid: boolean; totalVerified: number; brokenAtSequence?: number; reason?: string };
      }>('/audit-logs/verify'),
  });

  const logs = logsResponse?.data || [];
  const verification = verifyResponse?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 text-sky-600" />
            <span>Cryptographic & Verifiable Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Append-only forensic record of all document uploads, views, downloads, permissions, and security events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => recheckChain()}
            disabled={isVerifying}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{isVerifying ? 'Verifying Hash Chain...' : 'Verify Cryptographic Integrity'}</span>
          </button>
        </div>
      </div>

      {/* Hash Chain Verification Result Banner */}
      {verification && (
        <div
          className={`p-4 rounded-lg border flex items-center justify-between ${
            verification.isValid
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {verification.isValid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">
                {verification.isValid
                  ? 'Cryptographic Audit Seal Verified'
                  : 'Tampering Detected in Historical Audit Trail'}
              </div>
              <div className="text-xs mt-0.5 font-mono">
                {verification.isValid
                  ? `All ${verification.totalVerified} chronological events sequentially chained via SHA-256. Zero gaps or retroactive alterations detected.`
                  : `Discrepancy at sequence #${verification.brokenAtSequence}: ${verification.reason}`}
              </div>
            </div>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-white/80 border border-current">
            {verification.isValid ? 'SECURE / NON-REPUDIABLE' : 'INTEGRITY BREACH'}
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-subtle flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="text-xs rounded-md border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
            >
              <option value="">All Action Types</option>
              <option value="DOCUMENT_UPLOADED">DOCUMENT UPLOADED</option>
              <option value="DOCUMENT_VIEWED">DOCUMENT VIEWED</option>
              <option value="DOCUMENT_DOWNLOADED">DOCUMENT DOWNLOADED</option>
              <option value="DOCUMENT_UPDATED">DOCUMENT UPDATED</option>
              <option value="DOCUMENT_DELETED">DOCUMENT DELETED</option>
              <option value="DOCUMENT_PERMISSION_GRANTED">PERMISSION GRANTED</option>
              <option value="DOCUMENT_PERMISSION_REVOKED">PERMISSION REVOKED</option>
              <option value="ACCESS_DENIED">ACCESS DENIED</option>
              <option value="ROLE_CHANGED">ROLE CHANGED</option>
              <option value="USER_ACCESS_DISABLED">ACCOUNT DISABLED</option>
            </select>
          </div>

          <select
            value={selectedResult}
            onChange={(e) => setSelectedResult(e.target.value)}
            className="text-xs rounded-md border border-slate-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
          >
            <option value="">All Results</option>
            <option value="SUCCESS">Success Only</option>
            <option value="DENIED">Denied Only</option>
            <option value="FAILURE">Failure Only</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-subtle overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-500">Querying append-only audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No audit events match filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider font-sans">
                <tr>
                  <th className="px-5 py-3.5">Seq #</th>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Actor</th>
                  <th className="px-5 py-3.5">Target Document</th>
                  <th className="px-5 py-3.5">Result</th>
                  <th className="px-5 py-3.5">SHA-256 Hash</th>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5 text-right font-sans">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-600">#{log.sequenceNumber}</td>
                    <td className="px-5 py-4 font-sans font-medium text-slate-900">
                      {log.action.replace(/_/g, ' ')}
                    </td>
                    <td className="px-5 py-4 font-sans text-slate-600">
                      {log.actor?.email || log.actorEmail || 'System'}
                    </td>
                    <td className="px-5 py-4 font-sans text-slate-600 truncate max-w-xs">
                      {log.document?.title || (log.documentId ? `ID: ${log.documentId.substring(0, 8)}...` : '—')}
                    </td>
                    <td className="px-5 py-4 font-sans">
                      {log.result === 'SUCCESS' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          SUCCESS
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          DENIED
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-[11px]" title={log.currentHash}>
                      {log.currentHash.substring(0, 12)}...
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right font-sans">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 text-slate-600 hover:text-sky-600 rounded hover:bg-slate-100"
                        title="View Full Cryptographic Audit Evidence"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Forensic Audit Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-elevated border border-slate-200 w-full max-w-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Forensic Event Evidence #{selectedLog.sequenceNumber}
                </h3>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-100">
                <span className="text-slate-500">Action:</span>
                <span className="col-span-2 font-semibold text-slate-900">{selectedLog.action}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-100">
                <span className="text-slate-500">Result:</span>
                <span className="col-span-2 font-semibold text-slate-900">{selectedLog.result}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-100">
                <span className="text-slate-500">Actor:</span>
                <span className="col-span-2 font-mono text-slate-800">
                  {selectedLog.actor?.email || selectedLog.actorEmail || 'System'} (Role: {selectedLog.actorRole || 'N/A'})
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-100">
                <span className="text-slate-500">Correlation ID:</span>
                <span className="col-span-2 font-mono text-slate-600 truncate">{selectedLog.correlationId || 'N/A'}</span>
              </div>
              {selectedLog.failureReason && (
                <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-100 bg-rose-50/50 p-2 rounded">
                  <span className="text-rose-600 font-semibold">Denial Reason:</span>
                  <span className="col-span-2 font-mono text-rose-700">{selectedLog.failureReason}</span>
                </div>
              )}
              <div className="space-y-1 pt-1">
                <span className="text-slate-500 block">Previous Hash (Link):</span>
                <div className="p-2 bg-slate-50 rounded font-mono text-[11px] text-slate-600 break-all border border-slate-200">
                  {selectedLog.previousHash || 'GENESIS_HASH (Root of Trust)'}
                </div>
              </div>
              <div className="space-y-1 pt-1">
                <span className="text-slate-500 block">Current SHA-256 Hash:</span>
                <div className="p-2 bg-slate-900 text-sky-400 rounded font-mono text-[11px] break-all border border-slate-800">
                  {selectedLog.currentHash}
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
