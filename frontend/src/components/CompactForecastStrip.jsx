import React, { useState, useEffect } from 'react';
import { Compass, Sparkles, ArrowRight, ArrowUpRight, ArrowDownRight, Target } from 'lucide-react';
import { analyticsApi } from '../services/api';

export const CompactForecastStrip = ({ onNavigateToForecast }) => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecast();
  }, []);

  const fetchForecast = async () => {
    try {
      const res = await analyticsApi.getForecast();
      setForecast(res);
    } catch (err) {
      console.error('Failed to load compact forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !forecast) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 animate-pulse flex items-center justify-between">
        <div className="h-4 w-64 bg-slate-800 rounded"></div>
        <div className="h-4 w-32 bg-slate-800 rounded"></div>
      </div>
    );
  }

  const isAhead = forecast.projected_month_end >= forecast.target_revenue;
  const progressPct = Math.min(Math.round((forecast.current_revenue / forecast.target_revenue) * 100), 100);

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800/90 rounded-2xl p-3 sm:p-3.5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
      
      {/* Left: One-Line Story */}
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              Run-Rate Story
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Day {forecast.days_elapsed} of {forecast.days_in_month}
            </span>
          </div>
          <p className="text-xs font-bold text-white mt-0.5 truncate">
            "{forecast.story}"
          </p>
        </div>
      </div>

      {/* Right: Numbers, Progress Bar & Full Page Switcher */}
      <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-800/80">
        
        {/* Pacing progress */}
        <div className="text-right">
          <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-end gap-1">
            <span>Projected:</span>
            <span className="font-mono font-black text-amber-400">₹{forecast.projected_month_end.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
          </div>
          <div className="w-28 sm:w-32 bg-slate-950 rounded-full h-1.5 mt-1 border border-slate-800 overflow-hidden">
            <div 
              className={`h-full rounded-full ${isAhead ? 'bg-emerald-400' : 'bg-amber-400'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* View Full Forecast Page Button */}
        <button
          onClick={onNavigateToForecast}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-xl border border-slate-700/80 transition-all hover:scale-105"
          title="Open Forecast & Targets Canvas"
        >
          <span>Deep-Dive</span>
          <ArrowRight className="w-3 h-3" />
        </button>

      </div>

    </div>
  );
};
