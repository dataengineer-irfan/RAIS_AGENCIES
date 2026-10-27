import React from 'react';
import { CreditCard, CheckCircle2, ArrowRight, MessageSquare } from 'lucide-react';
import { sharePaymentOnWhatsApp } from '../utils/whatsappShare';

export const RecentPaymentsCard = ({ payments = [], onNavigateToPayments }) => {
  const handleSendWhatsAppReceipt = async (p) => {
    await sharePaymentOnWhatsApp({ payment: p });
  };

  const getMethodBadge = (method) => {
    const m = (method || 'CASH').toUpperCase();
    if (m === 'UPI') return { label: '📱 UPI', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    if (m === 'BANK') return { label: '🏦 Bank', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
    return { label: '💵 Cash', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-2.5 sm:p-3 shadow-lg flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <CreditCard className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs sm:text-sm font-black text-white tracking-wide truncate">
            Payment Receipts & Collections
          </h3>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-950 text-slate-300 border border-slate-800">
            {payments.length}
          </span>
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

      {/* Payments List (High Density, Internal Scroll) */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
        {(!payments || payments.length === 0) ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No recent payment settlements recorded.
          </div>
        ) : (
          payments.map((p, idx) => {
            const badge = getMethodBadge(p?.payment_method);
            return (
              <div 
                key={p?.id || idx}
                className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-xl p-2.5 flex items-center justify-between text-xs transition-colors gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-white text-xs">{p?.payment_number || 'REC'}</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${badge.color}`}>
                      {badge.label}
                    </span>
                    {p?.payment_date && (
                      <span className="text-[10px] font-mono text-slate-400">
                        {p.payment_date}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium mt-0.5 truncate">{p?.customer_name || 'Customer'}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="font-mono font-black text-emerald-400 text-xs sm:text-sm">
                      +₹{parseFloat(p?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendWhatsAppReceipt(p)}
                    className="p-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-lg transition-all active:scale-95"
                    title="Send WhatsApp Settlement Receipt"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
