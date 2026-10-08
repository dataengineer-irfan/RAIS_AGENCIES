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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
          <DollarSign className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-black text-white">
              Total Outlets Receivables
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {openInvoicesCount} Active Bills
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs flex-wrap">
            <span className="font-mono font-black text-amber-400 text-sm sm:text-base">
              ₹{outstandingVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 text-[11px]">
              Current: <strong className="text-emerald-400 font-mono font-bold">₹{currentVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 text-[11px]">
              Overdue: <strong className={`${overdueVal > 0 ? 'text-rose-400' : 'text-slate-300'} font-mono font-bold`}>₹{overdueVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({overduePct}%)</strong>
            </span>
          </div>
        </div>
      </div>

      {onViewOutlets && (
        <button
          onClick={onViewOutlets}
          className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-xl transition-all self-start sm:self-auto active:scale-95 shrink-0"
        >
          <span>Review Outlets</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

