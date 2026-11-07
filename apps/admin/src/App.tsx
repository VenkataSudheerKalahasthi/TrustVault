import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { AuthProvider, useAppAuth } from './context/AuthContext';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { AdminDocumentsPage } from './pages/AdminDocumentsPage';
import { AdminPermissionsPage } from './pages/AdminPermissionsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { AdminSecurityPage } from './pages/AdminSecurityPage';
import { AdminCategoriesPage } from './pages/AdminCategoriesPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { AdminProfilePage } from './pages/AdminProfilePage';
import { LoginPage } from './pages/LoginPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';

const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading, isAdmin } = useAppAuth();

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Verifying administrative security credentials...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login/*" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected Admin Console Routes */}
          <Route
            element={
              <ProtectedAdminRoute>
                <AdminLayout />
              </ProtectedAdminRoute>
            }
          >
            {/* Root paths */}
            <Route path="/" element={<AdminDashboardPage />} />
            <Route path="/security" element={<AdminSecurityPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="/documents" element={<AdminDocumentsPage />} />
            <Route path="/permissions" element={<AdminPermissionsPage />} />
            <Route path="/categories" element={<AdminCategoriesPage />} />
            <Route path="/settings" element={<AdminSettingsPage />} />
            <Route path="/profile" element={<AdminProfilePage />} />

            {/* /admin prefixed aliases */}
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/security" element={<AdminSecurityPage />} />
            <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/admin/documents" element={<AdminDocumentsPage />} />
            <Route path="/admin/permissions" element={<AdminPermissionsPage />} />
            <Route path="/admin/categories" element={<AdminCategoriesPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/profile" element={<AdminProfilePage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

