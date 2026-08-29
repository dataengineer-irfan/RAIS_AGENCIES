import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, AlertCircle, ShieldCheck, ChevronRight } from 'lucide-react';
import { reportApi } from '../services/api';

export const AgingBucketsCard = ({ onOpenDrilldown }) => {
  const [aging, setAging] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAging();
  }, []);

  const fetchAging = async () => {
    setLoading(true);
    try {
      const data = await reportApi.getAging();
      setAging(data);
    } catch (err) {
      console.error('Failed to load aging data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl animate-pulse">
        <div className="h-5 w-44 bg-slate-800 rounded mb-4"></div>
        <div className="grid grid-cols-4 gap-3">
          <div className="h-16 bg-slate-800/40 rounded-xl"></div>
          <div className="h-16 bg-slate-800/40 rounded-xl"></div>
          <div className="h-16 bg-slate-800/40 rounded-xl"></div>
          <div className="h-16 bg-slate-800/40 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const buckets = [
    { label: '0–15 Days (Current)', amount: parseFloat(aging?.current_0_15_days || 0), color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
    { label: '16–30 Days (Watch)', amount: parseFloat(aging?.aging_16_30_days || 0), color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
    { label: '31–60 Days (Aging)', amount: parseFloat(aging?.aging_31_60_days || 0), color: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10' },
    { label: '60+ Days (Severe)', amount: parseFloat(aging?.aging_60_plus_days || 0), color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/10' },
  ];

  const totalOutstanding = parseFloat(aging?.total_outstanding || 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-wide">
              Receivables Aging Buckets
            </h3>
            <p className="text-[11px] text-slate-400">
              Outstanding distribution across credit term intervals.
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-500 uppercase font-bold">Total Receivables</span>
          <div className="text-base font-black text-amber-400 font-mono">
            ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* 4 Buckets Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {buckets.map((b, idx) => (
          <div 
            key={idx}
            className={`p-3 rounded-2xl border ${b.border} ${b.bg} flex flex-col justify-between`}
          >
            <span className="text-[10px] font-bold text-slate-400 truncate">{b.label}</span>
            <div className={`text-base font-black font-mono mt-2 ${b.color}`}>
              ₹{b.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
