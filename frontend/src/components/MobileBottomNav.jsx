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

export const MobileBottomNav = ({ activeTab, setActiveTab, onOpenAI }) => {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Outlets', icon: Users },
    { id: 'catalogue', label: 'Catalogue', icon: Package },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'billing', label: 'Billing', icon: FileText },
    { id: 'ai', label: 'AI Co-Pilot', icon: Sparkles },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 backdrop-blur-lg border-t border-slate-800/90 px-1 py-1.5 flex items-center justify-around shadow-2xl safe-area-pb">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              isActive 
                ? 'text-amber-400 font-bold scale-105 bg-amber-500/10 border border-amber-500/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : ''}`} />
            <span className="text-[9px] mt-0.5 tracking-tight font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
