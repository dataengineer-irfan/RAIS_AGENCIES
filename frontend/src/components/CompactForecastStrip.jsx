import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
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
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 animate-pulse flex items-center justify-between shrink-0">
        <div className="h-3 w-64 bg-slate-800 rounded"></div>
        <div className="h-3 w-24 bg-slate-800 rounded"></div>
      </div>
    );
  }

  const isAhead = forecast.projected_month_end >= forecast.target_revenue;
  const progressPct = Math.min(Math.round((forecast.current_revenue / forecast.target_revenue) * 100), 100);

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800/90 rounded-xl px-3 py-1.5 shadow-md flex items-center justify-between gap-3 shrink-0">
      
      {/* Left: Sparkle icon + one-liner */}
      <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
        <div className="p-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
          <Sparkles className="w-3 h-3" />
        </div>
        <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
          Run-Rate
        </span>
        <span className="text-[10px] text-slate-400 font-mono shrink-0">
          Day {forecast.days_elapsed}/{forecast.days_in_month}
        </span>
        <p className="text-[11px] font-bold text-white truncate">
          {forecast.story}
        </p>
      </div>

      {/* Right: Progress + Deep-Dive */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
            <span>Projected:</span>
            <span className="font-mono font-black text-amber-400">₹{forecast.projected_month_end.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
          </div>
          <div className="w-24 bg-slate-950 rounded-full h-1 mt-0.5 border border-slate-800 overflow-hidden">
            <div 
              className={`h-full rounded-full ${isAhead ? 'bg-emerald-400' : 'bg-amber-400'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <button
          onClick={onNavigateToForecast}
          className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 text-[10px] font-bold rounded-lg border border-slate-700/80 transition-all hover:scale-105"
        >
          <span>Deep-Dive</span>
          <ArrowRight className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
};
