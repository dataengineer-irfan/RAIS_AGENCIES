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
  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 gap-3">
      {/* Left section: Top-Left Toggle Bar + Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        
        {/* Top-Left Corner Toggle Bar Button */}
        <div 
          onMouseEnter={onHoverTopLeft}
          onMouseLeave={onLeaveTopLeft}
          className="relative group shrink-0"
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
          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/40 rounded-lg text-amber-400 text-xs font-bold transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>AI Assistant</span>
        </button>
      </div>
    </header>
  );
};
