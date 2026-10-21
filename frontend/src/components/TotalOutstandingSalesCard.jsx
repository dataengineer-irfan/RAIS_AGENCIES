import React from 'react';
import { ArrowRight, ShieldAlert, AlertTriangle } from 'lucide-react';

export const TotalOutstandingSalesCard = ({ 
  totalOutstanding = 0, 
  totalOverdue = 0, 
  openInvoicesCount = 0,
  onViewOutlets 
}) => {
  const outstandingVal = parseFloat(totalOutstanding || 0);
  const overdueVal = parseFloat(totalOverdue || 0);
  const currentVal = Math.max(0, outstandingVal - overdueVal);
  const overduePct = outstandingVal > 0 ? Math.round((overdueVal / outstandingVal) * 100) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 shadow-md shrink-0 flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap">
      {/* Left: Section Badge + Bills Pill */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-xs font-black uppercase tracking-wider text-white whitespace-nowrap">
            Receivables Ledger
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800 whitespace-nowrap">
            {openInvoicesCount} Open Bills
          </span>
        </div>
      </div>

      {/* Center: Financial Breakdown (Total, Current, Overdue + Micro Risk Bar) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Due:</span>
          <span className="font-mono font-black text-amber-400 text-xs sm:text-sm">
            ₹{outstandingVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Desktop Breakdown */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 text-[11px]">Current:</span>
          <span className="text-emerald-400 font-bold">
            ₹{currentVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 text-[11px]">Overdue:</span>
          <span className={`font-bold ${overdueVal > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            ₹{overdueVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          <span className={`text-[10px] px-1 py-0.2 rounded ${overdueVal > 0 ? 'bg-rose-500/10 text-rose-300' : 'text-slate-500'}`}>
            ({overduePct}%)
          </span>
        </div>

        {/* Mobile Compact Breakdown (< md) */}
        <div className="flex md:hidden items-center gap-1.5 text-[10px] font-mono">
          <span className="text-slate-400">Cur:</span>
          <span className="text-emerald-400 font-bold">
            ₹{currentVal >= 1000 ? `${(currentVal/1000).toFixed(1)}k` : currentVal.toFixed(0)}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Over:</span>
          <span className={`font-bold ${overdueVal > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            ₹{overdueVal >= 1000 ? `${(overdueVal/1000).toFixed(1)}k` : overdueVal.toFixed(0)}
          </span>
          <span className={`text-[9px] px-1 rounded ${overdueVal > 0 ? 'bg-rose-500/10 text-rose-300' : 'text-slate-500'}`}>
            ({overduePct}%)
          </span>
        </div>

        {/* Micro 2-tone visual distribution bar */}
        <div className="hidden lg:flex items-center w-16 h-2 bg-slate-950 rounded-full overflow-hidden shrink-0 border border-slate-800" title={`Current: ${100 - overduePct}%, Overdue: ${overduePct}%`}>
          <div 
            className="h-full bg-emerald-500 transition-all duration-500" 
            style={{ width: `${100 - overduePct}%` }} 
          />
          <div 
            className="h-full bg-rose-500 transition-all duration-500" 
            style={{ width: `${overduePct}%` }} 
          />
        </div>
      </div>

      {/* Right: Review Outlets Action */}
      {onViewOutlets && (
        <button
          onClick={onViewOutlets}
          className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg transition-all active:scale-95 shrink-0 ml-auto sm:ml-0"
          title="Review Customer Ledgers"
        >
          <span>Outlets Dossier</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
