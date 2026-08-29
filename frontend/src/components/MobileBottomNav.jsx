import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Boxes, 
  ShoppingBag, 
  FileText, 
  CreditCard, 
  Sparkles 
} from 'lucide-react';

export const MobileBottomNav = ({ activeTab, setActiveTab, onToggleAI }) => {
  const items = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'customers', label: 'Clients', icon: Users },
    { id: 'catalogue', label: 'Stock', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'billing', label: 'Bills', icon: FileText },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
              isActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
            <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
          </button>
        );
      })}

      {/* AI Assistant Quick Mobile Tab */}
      <button
        onClick={onToggleAI}
        className="flex flex-col items-center justify-center p-1.5 rounded-xl text-amber-400 font-bold"
      >
        <Sparkles className="w-5 h-5 animate-pulse" />
        <span className="text-[10px] mt-0.5">Ask AI</span>
      </button>
    </nav>
  );
};
