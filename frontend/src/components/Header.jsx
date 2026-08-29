import React from 'react';
import { Sparkles, MapPin, Phone, Search } from 'lucide-react';

export const Header = ({ onToggleAI, onGlobalSearch, globalSearchTerm }) => {
  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Search Input */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
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
      <div className="flex items-center gap-6">
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
