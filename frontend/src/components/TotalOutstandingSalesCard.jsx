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

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
              Total Outstanding Sales Amount
            </h3>
            <p className="text-xs text-slate-400">
              Overall receivables credit balance due across all commercial outlets.
            </p>
          </div>
        </div>

        {onViewOutlets && (
          <button
            onClick={onViewOutlets}
            className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-xl transition-all self-start sm:self-auto"
          >
            <span>View Due Outlets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Outstanding Metric */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* Total Outstanding Tile */}
        <div className="sm:col-span-2 p-4 bg-slate-950/70 border border-amber-500/30 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Outstanding Balance
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400 mt-1">
            ₹{outstandingVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">
            Accumulated unpaid commercial sales credit
          </span>
        </div>

        {/* Secondary Risk / Count Tile */}
        <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Unpaid Invoices
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
              {openInvoicesCount} <span className="text-xs font-normal text-slate-500">bills</span>
            </div>
          </div>
          
          <div className="pt-2 border-t border-slate-800/80 mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">Overdue:</span>
            <span className={`font-mono font-bold ${overdueVal > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              ₹{overdueVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
