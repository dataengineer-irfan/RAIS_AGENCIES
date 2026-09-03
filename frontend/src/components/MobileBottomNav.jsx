import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Boxes, 
  ShoppingBag, 
  FileText, 
  Sparkles 
} from 'lucide-react';

export const MobileBottomNav = ({ activeTab, setActiveTab }) => {
  const items = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'customers', label: 'Outlets', icon: Users },
    { id: 'catalogue', label: 'Catalogue', icon: Package },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'billing', label: 'Billing', icon: FileText },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 backdrop-blur-xl border-t border-slate-800/90 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-pb">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-2xl transition-all active:scale-95 ${
              isActive 
                ? 'text-amber-400 font-bold bg-amber-500/15 border border-amber-500/30 shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 transition-transform ${isActive ? 'text-amber-400 scale-110' : 'text-slate-400'}`} />
            <span className={`text-[10px] mt-1 tracking-tight font-medium ${isActive ? 'text-amber-300 font-bold' : ''}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
