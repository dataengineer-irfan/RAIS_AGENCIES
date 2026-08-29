import React, { useEffect } from 'react';
import { 
  LayoutDashboard, 
  Target, 
  ShieldAlert, 
  Package, 
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const DASHBOARD_PAGES = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, badge: 'Main' },
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
      // Don't intercept if user is typing in an input
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
    <div className="flex items-center justify-between bg-slate-900/90 border-b border-slate-800 px-3 sm:px-4 py-2 select-none shrink-0">
      
      {/* Desktop & Tablet Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
        {DASHBOARD_PAGES.map((page, idx) => {
          const Icon = page.icon;
          const isActive = activePage === page.id;
          return (
            <button
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
              <span>{page.label}</span>
              {page.badge && !isActive && (
                <span className="text-[9px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded-full">
                  {page.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Keyboard Shortcut Hint & Page Indicator */}
      <div className="hidden lg:flex items-center gap-2 text-[10px] text-slate-500 font-mono">
        <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">←</span>
        <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">→</span>
        <span>to flip canvas</span>
        <span className="text-slate-600 font-bold ml-1">
          ({currentIndex + 1} / {DASHBOARD_PAGES.length})
        </span>
      </div>

      {/* Mobile Dot Navigation Indicator */}
      <div className="flex sm:hidden items-center gap-1">
        {DASHBOARD_PAGES.map((p, idx) => (
          <button
            key={p.id}
            onClick={() => onSelectPage(p.id)}
            className={`w-2 h-2 rounded-full transition-all ${
              activePage === p.id ? 'bg-amber-400 w-4' : 'bg-slate-700'
            }`}
          />
        ))}
      </div>

    </div>
  );
};
