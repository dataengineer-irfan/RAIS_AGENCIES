import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Layers, 
  CreditCard, 
  BarChart3, 
  Sparkles, 
  ShieldCheck, 
  LogOut,
  PlusCircle,
  Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ activeTab, setActiveTab, onOpenInvoiceBuilder }) => {
  const { user, logout, hasRole } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'billing', label: 'Billing & Invoices', icon: FileText, highlight: true },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'catalogue', label: 'Catalogue', icon: Package },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'reports', label: 'Reports & Aging', icon: BarChart3 },
    { id: 'ai', label: 'AI Assistant', icon: Sparkles, badge: 'AI' },
  ];

  if (hasRole('ADMIN')) {
    menuItems.push({ id: 'audit', label: 'Audit & System', icon: ShieldCheck });
  }

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-xl text-slate-950 shadow-lg shadow-amber-500/20">
          R
        </div>
        <div className="overflow-hidden">
          <h1 className="font-black tracking-wider text-base text-white leading-none">RAIS AGENCIES</h1>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400 mt-1 truncate">Frozen Foods • B2B</p>
        </div>
      </div>

      {/* Quick Action Button */}
      {hasRole(['ADMIN', 'OPERATOR']) && (
        <div className="p-4 border-b border-slate-800/60">
          <button
            onClick={onOpenInvoiceBuilder}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all shadow-md shadow-amber-500/20 text-xs tracking-wide uppercase"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Main Navigation</p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-amber-400">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-200 truncate">{user?.full_name}</p>
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-amber-400/90">
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
