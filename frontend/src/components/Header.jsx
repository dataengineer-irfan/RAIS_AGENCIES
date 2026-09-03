import React, { useState } from 'react';
import { Sparkles, MapPin, Phone, Search, PanelLeftClose, PanelLeftOpen, LogOut, User, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Header = ({ 
  onToggleAI, 
  onGlobalSearch, 
  globalSearchTerm,
  sidebarOpen = true,
  onToggleSidebar,
  onHoverTopLeft,
  onLeaveTopLeft
}) => {
  const { user, logout } = useAuth();
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  return (
    <header className="bg-slate-900/95 backdrop-blur border-b border-slate-800 sticky top-0 z-20 transition-all">
      {/* ─── DESKTOP HEADER (md and above) ─── */}
      <div className="hidden md:flex h-16 px-4 sm:px-6 items-center justify-between gap-3">
        {/* Left section: Top-Left Toggle Bar + Search */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xl">
          {/* Top-Left Corner Toggle Bar Button */}
          <div 
            onMouseEnter={onHoverTopLeft}
            onMouseLeave={onLeaveTopLeft}
            className="flex relative group shrink-0"
          >
            <button
              onClick={onToggleSidebar}
              title={sidebarOpen ? "Collapse Navigation Panel (Ctrl+B)" : "Expand Navigation Panel (Ctrl+B)"}
              className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
                sidebarOpen 
                  ? 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border-slate-700' 
                  : 'bg-amber-500 text-slate-950 hover:bg-amber-400 border-amber-400 shadow-md shadow-amber-500/20 scale-105'
              }`}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Global Search Input */}
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearchTerm}
              onChange={(e) => onGlobalSearch(e.target.value)}
              placeholder="Search customers, invoices, products..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        {/* Business Meta & AI Trigger */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          {/* Rayachoty Badge */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 border border-slate-800/80 bg-slate-950/60 px-3 py-1.5 rounded-lg">
            <MapPin className="w-3.5 h-3.5 text-amber-500" />
            <span>Reddies Colony, Rayachoty (516269)</span>
            <span className="text-slate-600">|</span>
            <Phone className="w-3 h-3 text-amber-500" />
            <span>9347453135</span>
          </div>

          {/* AI Assistant Quick Toggle */}
          <button
            onClick={onToggleAI}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/40 rounded-lg text-amber-400 text-xs font-bold transition-all shadow-sm shrink-0"
            title="Executive AI Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>
        </div>
      </div>

      {/* ─── NATIVE MOBILE APP BAR (< md) ─── */}
      <div className="md:hidden flex flex-col px-3 py-2">
        <div className="flex items-center justify-between gap-2 h-11">
          {/* Brand & Depot Identity */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-slate-950 text-sm shadow-md shadow-amber-500/20">
              R
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-wider text-white">RAIS AGENCIES</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Rayachoty Depot</p>
            </div>
          </div>

          {/* Mobile Right Action Icons */}
          <div className="flex items-center gap-1.5">
            {/* Search Expand Toggle */}
            <button
              onClick={() => setMobileSearchExpanded(!mobileSearchExpanded)}
              className={`p-2 rounded-xl border transition-all ${
                mobileSearchExpanded || globalSearchTerm
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:text-white'
              }`}
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* AI Assistant Button */}
            <button
              onClick={onToggleAI}
              className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/40 text-amber-400 shadow-sm transition-all active:scale-95 flex items-center justify-center"
              title="AI Co-Pilot"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
            </button>

            {/* User Profile & Logout Avatar Button */}
            <button
              onClick={() => setProfileModalOpen(true)}
              className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/80 text-amber-400 font-black text-xs flex items-center justify-center shadow-sm active:scale-95 transition-all hover:border-amber-500/50"
              title="Profile & Sign Out"
            >
              {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'A'}
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Search Input */}
        {mobileSearchExpanded && (
          <div className="pt-2 pb-1 relative animate-in fade-in slide-in-from-top-2 duration-200">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={globalSearchTerm}
              onChange={(e) => onGlobalSearch(e.target.value)}
              placeholder="Search outlets, SKUs, invoices..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-950 border border-amber-500/50 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            {globalSearchTerm && (
              <button
                onClick={() => onGlobalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* ─── MOBILE USER PROFILE & SIGN OUT MODAL SHEET ─── */}
        {profileModalOpen && (
          <div 
            onClick={() => setProfileModalOpen(false)}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-sm bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-6 duration-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-base shadow-inner">
                    {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">{user?.full_name || 'Admin User'}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 uppercase tracking-wider">
                        {user?.role || 'ADMIN'}
                      </span>
                      <span className="text-[10px] text-slate-400">@{user?.username || 'admin'}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setProfileModalOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* System Info */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between py-2 px-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 text-xs">Assigned Depot</span>
                  <span className="font-semibold text-slate-200 text-xs">Rayachoty Hub (516269)</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 text-xs">Cloud Server</span>
                  <span className="font-mono text-emerald-400 text-[11px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live (Render)
                  </span>
                </div>
              </div>

              {/* Sign Out CTA Button */}
              <button
                onClick={() => {
                  setProfileModalOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:text-rose-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-rose-950/40"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
