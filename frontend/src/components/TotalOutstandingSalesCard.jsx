import React from 'react';
import { ArrowRight, DollarSign } from 'lucide-react';

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
    <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 shadow-md shrink-0 transition-all">
      {/* Row 1: Title, Bills Badge, Total Amount, and Review Action */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-black uppercase tracking-wider text-white whitespace-nowrap">
            Receivables
          </span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
            {openInvoicesCount} Bills
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono font-black text-amber-400 text-sm sm:text-base">
            ₹{outstandingVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          {onViewOutlets && (
            <button
              onClick={onViewOutlets}
              className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-lg transition-all active:scale-95"
              title="Review Outlets"
            >
              <span>Outlets</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Compact Sub-Metrics (Current vs Overdue) + Micro Risk Bar */}
      <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-slate-800/80 text-[11px] font-mono">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-slate-400 text-[10px]">Current:</span>
          <span className="text-emerald-400 font-bold">
            ₹{currentVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 text-[10px]">Overdue:</span>
          <span className={`font-bold ${overdueVal > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            ₹{overdueVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          <span className={`text-[10px] px-1 py-0.5 rounded ${overdueVal > 0 ? 'bg-rose-500/10 text-rose-300' : 'text-slate-500'}`}>
            ({overduePct}%)
          </span>
        </div>

        {/* Micro 2-tone visual distribution bar */}
        <div className="flex items-center w-16 sm:w-20 h-1.5 bg-slate-950 rounded-full overflow-hidden shrink-0 border border-slate-800">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500" 
            style={{ width: `${100 - overduePct}%` }} 
            title={`Current: ${100 - overduePct}%`}
          />
          <div 
            className="h-full bg-rose-500 transition-all duration-500" 
            style={{ width: `${overduePct}%` }} 
            title={`Overdue: ${overduePct}%`}
          />
        </div>
      </div>
    </div>
  );
};

