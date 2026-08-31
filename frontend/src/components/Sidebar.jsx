import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  CreditCard, 
  BarChart3, 
  Sparkles, 
  ShieldCheck, 
  LogOut,
  PlusCircle,
  Package,
  Boxes,
  ShoppingBag,
  PanelLeftClose
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  onOpenInvoiceBuilder,
  isOpen = true,
  isPeeked = false,
  onToggle,
  onMouseEnter,
  onMouseLeave
}) => {
  const { user, logout, hasRole } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'catalogue', label: 'Catalogue', icon: Package },
    { id: 'inventory', label: 'Inventory', icon: Boxes, highlight: true },
    { id: 'orders', label: 'Orders & Bookings', icon: ShoppingBag },
    { id: 'billing', label: 'Billing & Invoices', icon: FileText },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'reports', label: 'Reports & Aging', icon: BarChart3 },
    { id: 'ai', label: 'AI Assistant', icon: Sparkles, badge: 'AI' },
  ];

  if (hasRole('ADMIN')) {
    menuItems.push({ id: 'audit', label: 'Audit & System', icon: ShieldCheck });
  }

  if (!isOpen && !isPeeked) {
    return null;
  }

  return (
    <aside 
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`hidden md:flex flex-col bg-slate-900 border-r border-slate-800 h-screen select-none transition-all duration-300 ease-in-out ${
        isPeeked 
          ? 'fixed top-0 left-0 z-40 w-64 shadow-2xl shadow-black/80 animate-in slide-in-from-left duration-200' 
          : 'sticky top-0 z-30 w-64 shrink-0'
      }`}
    >
      {/* Brand Header & Collapse Toggle */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-lg text-slate-950 shadow-md shadow-amber-500/20 shrink-0">
            R
          </div>
          <div className="overflow-hidden">
            <h1 className="font-black tracking-wider text-sm text-white leading-none truncate">RAIS AGENCIES</h1>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-amber-400 mt-1 truncate">Frozen Foods • B2B</p>
          </div>
        </div>

        {/* Collapse Toggle Button */}
        <button
          onClick={onToggle}
          title="Collapse Navigation Panel (Ctrl+B)"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Action Button */}
      {hasRole(['ADMIN', 'OPERATOR']) && (
        <div className="p-3 border-b border-slate-800/60 shrink-0">
          <button
            onClick={onOpenInvoiceBuilder}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all shadow-md shadow-amber-500/20 text-xs tracking-wide uppercase"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Main Navigation</p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.2 text-[9px] font-black rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-amber-400 shrink-0">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-200 truncate">{user?.full_name}</p>
              <span className="inline-block text-[9px] font-semibold uppercase tracking-wider text-amber-400/90 truncate">
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
