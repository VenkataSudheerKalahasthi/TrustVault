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
    const isActive = exact ? location.pathname === path : location.pathname === path || (path !== '/' && location.pathname.startsWith(`${path}/`));
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
          <Link to="/" className="flex items-center gap-2.5">
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
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={navItemClass('/', true)}
              >
                <LayoutDashboard className="w-4 h-4 text-rose-400" />
                <span>Executive Overview</span>
              </Link>
              <Link
                to="/security"
                onClick={() => setMobileMenuOpen(false)}
                className={navItemClass('/security')}
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Threat Telemetry</span>
              </Link>
              <Link
                to="/audit-logs"
                onClick={() => setMobileMenuOpen(false)}
                className={navItemClass('/audit-logs')}
              >
                <History className="w-4 h-4 text-rose-400" />
                <span>Immutable Audit Trail</span>
              </Link>
            </nav>
          </div>

          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Access & Assets
            </div>
            <nav className="space-y-1">
              <Link
                to="/users"
                onClick={() => setMobileMenuOpen(false)}
                className={navItemClass('/users')}
              >
                <Users className="w-4 h-4 text-slate-400" />
                <span>User Accounts</span>
              </Link>
              <Link
                to="/documents"
                onClick={() => setMobileMenuOpen(false)}
                className={navItemClass('/documents')}
              >
                <FileText className="w-4 h-4 text-slate-400" />
                <span>Document Inventory</span>
              </Link>
              <Link
                to="/permissions"
                onClick={() => setMobileMenuOpen(false)}
                className={navItemClass('/permissions')}
              >
                <Share2 className="w-4 h-4 text-slate-400" />
                <span>Permission Matrix</span>
              </Link>
              <Link
                to="/categories"
                onClick={() => setMobileMenuOpen(false)}
                className={navItemClass('/categories')}
              >
                <Layers className="w-4 h-4 text-slate-400" />
                <span>Classification Categories</span>
              </Link>
            </nav>
          </div>

          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Administration
            </div>
            <nav className="space-y-1">
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={navItemClass('/settings')}
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>System Parameters</span>
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={navItemClass('/profile')}
              >
                <User className="w-4 h-4 text-slate-400" />
                <span>Security Officer Profile</span>
              </Link>
            </nav>
          </div>

          {/* User Vault Portal Switcher */}
          <div className="pt-2 border-t border-slate-800/80">
            <a
              href="http://localhost:5173/vault"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-md text-xs font-semibold text-sky-400 hover:text-sky-300 hover:bg-slate-800/60 border border-sky-950 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Document Vault</span>
              </span>
              <ExternalLink className="w-3 h-3 text-sky-500" />
            </a>
          </div>
        </div>

        {/* Admin Footer Badge & Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950">
          <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2 truncate">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <div className="truncate">
                <div className="text-[11px] font-semibold text-white truncate">
                  {user?.email || 'Administrator'}
                </div>
                <div className="text-[9px] text-rose-400 font-mono uppercase">ADMIN PRIVILEGE</div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Administrative Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Mobile Header Bar */}
        <header className="h-14 lg:hidden bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-30">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 text-slate-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-bold text-white">TrustVault Admin</span>
          </div>
          <button onClick={handleSignOut} className="p-1.5 text-slate-400 hover:text-rose-400">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
        />
      )}
    </div>
  );
};

