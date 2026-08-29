import React from 'react';
import { CreditCard, CheckCircle2, ArrowRight } from 'lucide-react';

export const RecentPaymentsCard = ({ payments = [], onNavigateToPayments }) => {
  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Recent Collections & Settlements</h3>
              <p className="text-[10px] text-slate-400">Cash, UPI, and bank transfers</p>
            </div>
          </div>

          {onNavigateToPayments && (
            <button
              onClick={onNavigateToPayments}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              All Payments <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Payments List */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {payments.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No recent payment settlements recorded.
            </div>
          ) : (
            payments.map((p, idx) => (
              <div 
                key={p.id || idx}
                className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-white text-xs">{p.payment_number}</span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {p.payment_method}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{p.customer_name}</p>
                </div>

                <div className="text-right">
                  <div className="font-mono font-black text-emerald-400 text-sm">
                    +₹{p.amount.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-500">{p.payment_date}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
