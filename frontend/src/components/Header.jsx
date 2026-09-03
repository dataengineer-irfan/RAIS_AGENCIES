import React from 'react';
import { Sparkles, MapPin, Phone, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export const Header = ({ 
  onToggleAI, 
  onGlobalSearch, 
  globalSearchTerm,
  sidebarOpen = true,
  onToggleSidebar,
  onHoverTopLeft,
  onLeaveTopLeft
}) => {
  const [mobileSearchExpanded, setMobileSearchExpanded] = React.useState(false);

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
      </div>
    </header>
  );
};
