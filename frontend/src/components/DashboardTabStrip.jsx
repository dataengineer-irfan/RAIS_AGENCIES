import React, { useEffect } from 'react';
import { 
  LayoutDashboard, 
  Target, 
  ShieldAlert, 
  Package, 
  Activity
} from 'lucide-react';

export const DASHBOARD_PAGES = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'forecast', label: 'Forecast & Targets', icon: Target },
  { id: 'receivables', label: 'Receivables & Risk', icon: ShieldAlert },
  { id: 'products', label: 'Product Intelligence', icon: Package },
  { id: 'activity', label: 'Activity & Receipts', icon: Activity },
];

export const DashboardTabStrip = ({ activePage, onSelectPage }) => {
  const currentIndex = DASHBOARD_PAGES.findIndex(p => p.id === activePage);

  // Keyboard navigation (ArrowLeft & ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      if (e.key === 'ArrowRight') {
        const nextIdx = (currentIndex + 1) % DASHBOARD_PAGES.length;
        onSelectPage(DASHBOARD_PAGES[nextIdx].id);
      } else if (e.key === 'ArrowLeft') {
        const prevIdx = (currentIndex - 1 + DASHBOARD_PAGES.length) % DASHBOARD_PAGES.length;
        onSelectPage(DASHBOARD_PAGES[prevIdx].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, onSelectPage]);

  return (
    <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800/80 rounded-xl px-2.5 py-1 shrink-0">
      
      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
        {DASHBOARD_PAGES.map((page) => {
          const Icon = page.icon;
          const isActive = activePage === page.id;
          return (
            <button
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-3 h-3 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
              <span>{page.label}</span>
            </button>
          );
        })}
      </div>

      {/* Keyboard Shortcut Hint */}
      <div className="hidden lg:flex items-center gap-1.5 text-[9px] text-slate-500 font-mono shrink-0">
        <span className="bg-slate-950 px-1 py-0.5 rounded border border-slate-800">←</span>
        <span className="bg-slate-950 px-1 py-0.5 rounded border border-slate-800">→</span>
        <span>flip</span>
        <span className="text-slate-600 font-bold">({currentIndex + 1}/{DASHBOARD_PAGES.length})</span>
      </div>

      {/* Mobile Dot Navigation */}
      <div className="flex sm:hidden items-center gap-0.5">
        {DASHBOARD_PAGES.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectPage(p.id)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              activePage === p.id ? 'bg-amber-400 w-3' : 'bg-slate-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
