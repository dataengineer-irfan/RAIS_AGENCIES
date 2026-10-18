import React from 'react';
import { CreditCard, CheckCircle2, ArrowRight } from 'lucide-react';

export const RecentPaymentsCard = ({ payments = [], onNavigateToPayments }) => {
  return (
    <div className="bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-800 p-3.5 sm:p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs sm:text-sm font-black text-white tracking-wide truncate">
              Recent Collections & Settlements
            </h3>
          </div>

          {onNavigateToPayments && (
            <button
              type="button"
              onClick={onNavigateToPayments}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0 active:scale-95"
            >
              <span>All Payments</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Payments List */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {(!payments || payments.length === 0) ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No recent payment settlements recorded.
            </div>
          ) : (
            (payments || []).map((p, idx) => (
              <div 
                key={p?.id || idx}
                className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-white text-xs">{p?.payment_number || 'REC'}</span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {p?.payment_method || 'CASH'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{p?.customer_name || 'Customer'}</p>
                </div>

                <div className="text-right">
                  <div className="font-mono font-black text-emerald-400 text-sm">
                    +₹{parseFloat(p?.amount || 0).toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-500">{p?.payment_date || ''}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
