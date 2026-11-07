import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useAppAuth } from '../context/AuthContext';
import {
  Shield,
  LayoutDashboard,
  Users,
  FileText,
  Share2,
  History,
  ShieldAlert,
  Layers,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user } = useAppAuth();
  const { signOut } = useClerk();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItemClass = (path: string, exact = false) => {
    const isActive = exact ? location.pathname === path : location.pathname === path || location.pathname.startsWith(`${path}/`);
    return `flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-semibold transition-colors ${
      isActive
        ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60 shadow-sm'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 font-sans">
      {/* Admin Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0a0f1d] border-r border-slate-800 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Admin Header */}
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-rose-600 flex items-center justify-center text-white shadow-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">TrustVault Admin</span>
              <span className="block text-[9px] text-rose-400 uppercase tracking-widest font-mono">
                Security Governance
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-rose-400 font-mono">
              Oversight & Audit
            </div>
            <nav className="space-y-1">
              <Link
                to="/admin"
                className={navItemClass('/admin', true)}
                onClick={() => setMobileMenuOpen(false)}
              >
                <LayoutDashboard className="w-4 h-4 text-slate-400" />
                <span>Overview</span>
              </Link>
              <Link
                to="/admin/users"
                className={navItemClass('/admin/users')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Users className="w-4 h-4 text-slate-400" />
                <span>Users</span>
              </Link>
              <Link
                to="/admin/documents"
                className={navItemClass('/admin/documents')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <FileText className="w-4 h-4 text-slate-400" />
                <span>Documents</span>
              </Link>
              <Link
                to="/admin/permissions"
                className={navItemClass('/admin/permissions')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Share2 className="w-4 h-4 text-slate-400" />
                <span>Permissions</span>
              </Link>
              <Link
                to="/admin/audit-logs"
                className={navItemClass('/admin/audit-logs')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <History className="w-4 h-4 text-slate-400" />
                <span>Audit Logs</span>
              </Link>
              <Link
                to="/admin/security"
                className={navItemClass('/admin/security')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Security</span>
              </Link>
              <Link
                to="/admin/categories"
                className={navItemClass('/admin/categories')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Layers className="w-4 h-4 text-slate-400" />
                <span>Categories</span>
              </Link>
              <Link
                to="/admin/settings"
                className={navItemClass('/admin/settings')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>System Settings</span>
              </Link>
            </nav>
          </div>

          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Identity & Session
            </div>
            <nav className="space-y-1">
              <Link
                to="/admin/profile"
                className={navItemClass('/admin/profile')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <User className="w-4 h-4 text-slate-400" />
                <span>My Profile</span>
              </Link>
              <Link
                to="/owner/documents"
                className="flex items-center justify-between px-3.5 py-2 rounded-md text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center gap-3">
                  <ExternalLink className="w-4 h-4" />
                  <span>Exit to User Vault</span>
                </div>
              </Link>
            </nav>
          </div>
        </div>

        {/* Footer with Administrator Info & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between p-2 rounded-md bg-slate-900">
            <div className="truncate">
              <div className="text-xs font-semibold text-white truncate">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
              </div>
              <div className="text-[10px] text-rose-400 font-mono uppercase font-bold">
                ADMINISTRATOR
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Mobile Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 lg:hidden flex items-center justify-between px-4 sticky top-0 z-30">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-md"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            <span className="text-xs font-bold text-slate-900 font-mono uppercase">Admin Portal</span>
          </div>
          <div className="w-5" />
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

