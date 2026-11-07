import React, { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { X, Download, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { DocumentItem } from '../types';

interface DocumentPreviewModalProps {
  document: DocumentItem | null;
  onClose: () => void;
  onDownload?: (doc: DocumentItem) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  onClose,
  onDownload,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!document) {
      setBlobUrl(null);
      setTextContent(null);
      return;
    }

    let isSubscribed = true;
    setIsLoading(true);
    setError(null);

    const loadContent = async () => {
      try {
        const blob = await apiRequest<Blob>(`/documents/${document.id}/content`);
        if (!isSubscribed) return;

        if (document.mimeType.startsWith('text/') || document.originalFileName.endsWith('.txt') || document.originalFileName.endsWith('.csv')) {
          const text = await blob.text();
          setTextContent(text);
        } else {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
        }
      } catch (err: any) {
        if (!isSubscribed) return;
        setError(err.message || 'Access denied or unable to preview confidential document');
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    };

    loadContent();

    return () => {
      isSubscribed = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [document?.id]);

  if (!document) return null;

  const isPdf = document.mimeType === 'application/pdf' || document.originalFileName.endsWith('.pdf');
  const isImage = document.mimeType.startsWith('image/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-elevated border border-slate-200 w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 rounded-md text-sky-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 leading-tight">
                {document.title}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {document.originalFileName} &bull; {(document.fileSize / 1024).toFixed(1)} KB &bull; Version {document.currentVersion}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {document.canDownload && onDownload && (
              <button
                onClick={() => onDownload(document)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 text-white hover:bg-slate-700 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-slate-100 p-4 overflow-auto flex items-center justify-center">
          {isLoading && (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
              <span className="text-sm font-medium">Authorizing and decrypting preview stream...</span>
            </div>
          )}

          {error && (
            <div className="max-w-md bg-white p-6 rounded-lg border border-rose-200 text-center shadow-subtle">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">Preview Access Denied</h4>
              <p className="text-xs text-slate-600 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-medium rounded-md hover:bg-slate-700"
              >
                Close Preview
              </button>
            </div>
          )}

          {!isLoading && !error && blobUrl && isPdf && (
            <iframe
              src={`${blobUrl}#toolbar=0`}
              title="Document Preview"
              className="w-full h-full rounded border border-slate-300 bg-white shadow-sm"
            />
          )}

          {!isLoading && !error && blobUrl && isImage && (
            <div className="max-w-full max-h-full flex items-center justify-center">
              <img
                src={blobUrl}
                alt={document.title}
                className="max-w-full max-h-[70vh] rounded shadow border border-slate-300 object-contain"
              />
            </div>
          )}

          {!isLoading && !error && textContent !== null && (
            <div className="w-full h-full bg-white p-5 rounded border border-slate-300 font-mono text-xs text-slate-800 overflow-auto whitespace-pre-wrap leading-relaxed shadow-sm">
              {textContent}
            </div>
          )}

          {!isLoading && !error && !isPdf && !isImage && textContent === null && (
            <div className="text-center p-8 bg-white rounded-lg border border-slate-200 max-w-md shadow-subtle">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-800 mb-1">Inline Preview Not Supported</h4>
              <p className="text-xs text-slate-500 mb-4">
                This document format cannot be rendered inline in the browser. You may download it directly if your access permissions allow.
              </p>
              {document.canDownload && onDownload && (
                <button
                  onClick={() => onDownload(document)}
                  className="px-4 py-2 bg-sky-600 text-white text-xs font-medium rounded-md hover:bg-sky-500"
                >
                  Download File
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

