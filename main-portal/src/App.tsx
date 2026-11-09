import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { AuthProvider, useAppAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { MyDocumentsPage } from './pages/owner/MyDocumentsPage';
import { UploadDocumentPage } from './pages/owner/UploadDocumentPage';
import { AISuggestionsPage } from './pages/owner/AISuggestionsPage';
import { ViewerDashboardPage } from './pages/viewer/ViewerDashboardPage';
import { AuditLogsPage } from './pages/owner/AuditLogsPage';
import { SearchPage } from './pages/search/SearchPage';
import { CategoriesPage } from './pages/categories/CategoriesPage';
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPage';
import { TermsPage } from './pages/legal/TermsPage';
import { ShieldAlert } from 'lucide-react';

const AdminRedirect: React.FC = () => {
  React.useEffect(() => {
    const adminUrl = import.meta.env.VITE_ADMIN_PORTAL_URL || 'http://localhost:5174';
    window.location.href = adminUrl;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400 font-mono text-xs">
      Redirecting to TrustVault Dedicated Admin Portal...
    </div>
  );
};

const RoleGuard: React.FC<{
  allowedRoles: Array<'ADMIN' | 'DOCUMENT_OWNER' | 'VIEWER'>;
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { role, isLoading } = useAppAuth();

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500 font-mono">
        Verifying role authorization...
      </div>
    );
  }

  if (!allowedRoles.includes(role)) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white p-6 rounded-lg border border-rose-200 shadow-subtle text-center">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 mb-1">Access Restricted</h2>
        <p className="text-xs text-slate-600 mb-4">
          Your current application role (<span className="font-mono font-semibold">{role}</span>) does not have authorization to view this portal.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Legal Pages */}
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* Authentication Routes */}
        <Route path="/login/*" element={<LoginPage />} />
        <Route path="/signup/*" element={<SignUpPage />} />
        <Route path="/forgot-password/*" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/*" element={<ResetPasswordPage />} />

        {/* Dedicated Admin Portal Route (Redirects to Dedicated Admin Portal) */}
        <Route path="/admin/*" element={<AdminRedirect />} />

        {/* Protected App Routes (Standard Vault Layout) */}
        <Route
          path="/*"
          element={
            <>
              <SignedIn>
                <AuthProvider>
                  <AppLayout />
                </AuthProvider>
              </SignedIn>
              <SignedOut>
                <Navigate to="/login" replace />
              </SignedOut>
            </>
          }
        >
          <Route index element={<HomePage />} />

          {/* Document Owner Routes */}
          <Route
            path="owner/documents"
            element={
              <RoleGuard allowedRoles={['DOCUMENT_OWNER', 'ADMIN']}>
                <MyDocumentsPage />
              </RoleGuard>
            }
          />
          <Route
            path="owner/upload"
            element={
              <RoleGuard allowedRoles={['DOCUMENT_OWNER', 'ADMIN']}>
                <UploadDocumentPage />
              </RoleGuard>
            }
          />
          <Route
            path="owner/ai-suggestions"
            element={
              <RoleGuard allowedRoles={['DOCUMENT_OWNER', 'ADMIN']}>
                <AISuggestionsPage />
              </RoleGuard>
            }
          />

          {/* Viewer Routes */}
          <Route path="viewer/documents" element={<ViewerDashboardPage />} />

          {/* Search & Categories */}
          <Route path="search" element={<SearchPage />} />
          <Route path="categories" element={<CategoriesPage />} />

          {/* Audit Logs for Document Owners */}
          <Route
            path="audit-logs"
            element={
              <RoleGuard allowedRoles={['ADMIN', 'DOCUMENT_OWNER']}>
                <AuditLogsPage />
              </RoleGuard>
            }
          />

          {/* Admin link route */}
          <Route
            path="admin"
            element={
              <div className="py-16 text-center">
                <h2 className="text-base font-semibold text-slate-800 mb-2">Admin Governance Console</h2>
                <p className="text-xs text-slate-500 mb-4">
                  The Admin Console runs on a dedicated governance port (5174).
                </p>
                <a
                  href="http://localhost:5174"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700 shadow-sm transition-colors"
                >
                  Open Admin Portal &rarr;
                </a>
              </div>
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
