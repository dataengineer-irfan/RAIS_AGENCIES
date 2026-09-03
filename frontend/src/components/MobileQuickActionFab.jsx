import React, { useState } from 'react';
import { Plus, FileText, ShoppingBag, UserPlus, Sparkles, X } from 'lucide-react';

export const MobileQuickActionFab = ({
  onOpenInvoice,
  onOpenOrder,
  onOpenCustomer,
  onOpenAI
}) => {
  const [open, setOpen] = useState(false);

  const actions = [
    {
      label: 'New Invoice',
      icon: FileText,
      color: 'bg-amber-500 text-slate-950',
      action: onOpenInvoice
    },
    {
      label: 'New Order',
      icon: ShoppingBag,
      color: 'bg-sky-500 text-white',
      action: onOpenOrder
    },
    {
      label: 'New Customer',
      icon: UserPlus,
      color: 'bg-emerald-500 text-slate-950',
      action: onOpenCustomer
    },
    {
      label: 'Ask AI Co-Pilot',
      icon: Sparkles,
      color: 'bg-purple-500 text-white',
      action: onOpenAI
    }
  ];

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      <div className="md:hidden fixed bottom-[74px] right-4 z-50 flex flex-col items-end gap-2.5 pointer-events-auto">
        {/* Speed-dial options */}
        {open && (
          <div className="flex flex-col items-end gap-2 mb-1 animate-in fade-in slide-in-from-bottom-4 duration-200">
            {actions.map((act, i) => {
              const Icon = act.icon;
              return (
                <button
                  key={i}
                  onClick={() => {
                    setOpen(false);
                    act.action();
                  }}
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-slate-900 border border-slate-700/80 shadow-xl active:scale-95 transition-all text-xs font-bold text-slate-200"
                >
                  <span className="text-[11px] font-semibold tracking-wide text-slate-300">{act.label}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${act.color} shadow-md`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Main Floating Trigger Button */}
        <button
          onClick={() => setOpen(!open)}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 ${
            open
              ? 'bg-slate-800 text-slate-200 border border-slate-600 rotate-90 shadow-black/40'
              : 'bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-amber-500/30 ring-4 ring-amber-500/20 scale-105'
          }`}
          title="Quick Actions"
        >
          {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6 stroke-[2.5]" />}
        </button>
      </div>
    </>
  );
};
