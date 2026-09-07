import React from 'react';
import { ArrowRight, ShieldAlert, CheckCircle2, Clock, DollarSign } from 'lucide-react';

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
  const currentPct = 100 - overduePct;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Total Outlets Receivables
              </h3>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Live Ledger Sync
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Current balance due across all commercial outlets (opening balances + invoices - settlements).
            </p>
          </div>
        </div>

        {onViewOutlets && (
          <button
            onClick={onViewOutlets}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3.5 py-2 rounded-xl transition-all self-start sm:self-auto active:scale-95"
          >
            <span>Review Outlet Ledgers</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Outstanding Tile */}
        <div className="sm:col-span-2 p-4 sm:p-5 bg-slate-950/70 border border-amber-500/30 rounded-2xl flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Total Outlets Outstanding
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Verified Book Debt
            </span>
          </div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-mono text-amber-400 mt-2 tracking-tight">
            ₹{outstandingVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span>Matches Customers master book receivables exactly</span>
            <span className="text-slate-300 font-mono font-semibold">{openInvoicesCount} Active Bills</span>
          </div>
        </div>

        {/* Risk & Aging Breakdown Tile */}
        <div className="p-4 sm:p-5 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Aging Risk Exposure
              </span>
              {overdueVal > 0 ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {overduePct}% Overdue
                </span>
              ) : (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Healthy
                </span>
              )}
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  Current (0–7 Days):
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  ₹{currentVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  Overdue (&gt;7 Days):
                </span>
                <span className={`font-mono font-bold ${overdueVal > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                  ₹{overdueVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
          
          {/* Aging Distribution Bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80">
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden flex">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${currentPct}%` }}
                title={`Current: ${currentPct}%`}
              />
              <div 
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${overduePct}%` }}
                title={`Overdue: ${overduePct}%`}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400 mt-1.5 font-medium">
              <span>{currentPct}% Standard</span>
              <span className={overdueVal > 0 ? 'text-rose-400 font-semibold' : 'text-slate-400'}>{overduePct}% Follow-up</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
