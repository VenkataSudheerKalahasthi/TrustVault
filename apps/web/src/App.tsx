import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { AuthProvider, useAppAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { MyDocumentsPage } from './pages/owner/MyDocumentsPage';
import { UploadDocumentPage } from './pages/owner/UploadDocumentPage';
import { AISuggestionsPage } from './pages/owner/AISuggestionsPage';
import { ViewerDashboardPage } from './pages/viewer/ViewerDashboardPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { AdminDocumentsPage } from './pages/admin/AdminDocumentsPage';
import { AdminPermissionsPage } from './pages/admin/AdminPermissionsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { SearchPage } from './pages/search/SearchPage';
import { CategoriesPage } from './pages/categories/CategoriesPage';
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPage';
import { TermsPage } from './pages/legal/TermsPage';
import { ShieldAlert } from 'lucide-react';

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

        {/* Protected App Routes */}
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
                <RedirectToSignIn />
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

          {/* Admin Routes */}
          <Route
            path="admin"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </RoleGuard>
            }
          />
          <Route
            path="admin/users"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <UserManagementPage />
              </RoleGuard>
            }
          />
          <Route
            path="admin/documents"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <AdminDocumentsPage />
              </RoleGuard>
            }
          />
          <Route
            path="admin/permissions"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <AdminPermissionsPage />
              </RoleGuard>
            }
          />
          <Route
            path="admin/audit-logs"
            element={
              <RoleGuard allowedRoles={['ADMIN', 'DOCUMENT_OWNER']}>
                <AuditLogsPage />
              </RoleGuard>
            }
          />
          <Route
            path="admin/settings"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <AdminSettingsPage />
              </RoleGuard>
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

