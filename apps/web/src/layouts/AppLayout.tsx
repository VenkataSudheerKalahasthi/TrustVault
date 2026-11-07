import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useAppAuth } from '../context/AuthContext';
import {
  Shield,
  FileText,
  UploadCloud,
  Share2,
  Users,
  Search,
  Sparkles,
  Layers,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  CheckCircle2,
  Lock,
  Settings,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, role, isAdmin, isOwner } = useAppAuth();
  const { signOut } = useClerk();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItemClass = (path: string) => {
    const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
    return `flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-slate-800 text-sky-400 font-semibold'
        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
    }`;
  };

  const roleBadgeColor = {
    ADMIN: 'bg-rose-950/80 text-rose-300 border-rose-800/50',
    DOCUMENT_OWNER: 'bg-sky-950/80 text-sky-300 border-sky-800/50',
    VIEWER: 'bg-slate-800 text-slate-300 border-slate-700',
  }[role] || 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 font-sans">
      {/* Sidebar - Enterprise Slate/Charcoal Design */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0f172a] border-r border-slate-800 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo and Security Banner */}
        <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-sky-600 flex items-center justify-center text-white shadow-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight">TrustVault</span>
              <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-mono">Zero-Trust ACL</span>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* General / Documents Section */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Document Vault
            </div>
            <nav className="space-y-1">
              {isOwner && (
                <Link to="/owner/documents" className={navItemClass('/owner/documents')} onClick={() => setMobileMenuOpen(false)}>
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>My Documents</span>
                </Link>
              )}
              {isOwner && (
                <Link to="/owner/upload" className={navItemClass('/owner/upload')} onClick={() => setMobileMenuOpen(false)}>
                  <UploadCloud className="w-4 h-4 text-slate-400" />
                  <span>Upload Document</span>
                </Link>
              )}
              <Link to="/viewer/documents" className={navItemClass('/viewer/documents')} onClick={() => setMobileMenuOpen(false)}>
                <Share2 className="w-4 h-4 text-slate-400" />
                <span>Shared with Me</span>
              </Link>
              <Link to="/search" className={navItemClass('/search')} onClick={() => setMobileMenuOpen(false)}>
                <Search className="w-4 h-4 text-slate-400" />
                <span>Search Vault</span>
              </Link>
              <Link to="/categories" className={navItemClass('/categories')} onClick={() => setMobileMenuOpen(false)}>
                <Layers className="w-4 h-4 text-slate-400" />
                <span>Categories</span>
              </Link>
            </nav>
          </div>

          {/* AI-Assisted Security Access (Human-in-the-Loop) */}
          {isOwner && (
            <div>
              <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Access Intelligence
              </div>
              <nav className="space-y-1">
                <Link to="/owner/ai-suggestions" className={navItemClass('/owner/ai-suggestions')} onClick={() => setMobileMenuOpen(false)}>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Access Suggestions</span>
                </Link>
              </nav>
            </div>
          )}

          {/* Administrative Oversight Portal */}
          {isAdmin && (
            <div>
              <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-rose-400 font-mono">
                Admin Governance
              </div>
              <nav className="space-y-1">
                <a
                  href={import.meta.env.VITE_ADMIN_PORTAL_URL || 'http://localhost:5174'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-md text-xs font-semibold bg-rose-950/40 text-rose-300 border border-rose-800/50 hover:bg-rose-950/70 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-rose-400" />
                    <span>Launch Admin Portal</span>
                  </div>
                  <span className="text-[10px] text-rose-400 font-mono">:5174</span>
                </a>
              </nav>
            </div>
          )}
        </div>

        {/* User Status Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between p-2 rounded-md bg-slate-800/40">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-md bg-slate-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="truncate">
                <div className="text-xs font-medium text-white truncate">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase ${roleBadgeColor}`}>
                    {role.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Sign out of TrustVault"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-mono text-slate-500 hidden sm:inline">
                Zero-Trust Encrypted Session
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Audit Chain Intact</span>
            </div>
            <div className="hidden sm:block text-xs text-slate-500 font-mono">
              {user?.email}
            </div>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Enterprise Compliance Footer */}
        <footer className="border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            TrustVault Enterprise Document Security Platform &bull; RISE Specification
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-slate-800 underline">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-slate-800 underline">Terms and Conditions</Link>
          </div>
        </footer>
      </div>
    </div>
  );
};

