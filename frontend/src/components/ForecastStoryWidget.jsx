import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, Edit3, Check, X, Sparkles, Compass, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { analyticsApi } from '../services/api';

export const ForecastStoryWidget = ({ onOpenDrilldown }) => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);

  useEffect(() => {
    fetchForecast();
  }, []);

  const fetchForecast = async () => {
    setLoading(true);
    try {
      const res = await analyticsApi.getForecast();
      setForecast(res);
      setTargetInput(res.target_revenue?.toString() || '50000');
    } catch (err) {
      console.error('Failed to load sales forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTarget = async () => {
    if (!targetInput || isNaN(targetInput)) return;
    setSavingTarget(true);
    try {
      await analyticsApi.setMonthlyTarget(forecast.year_month, parseFloat(targetInput));
      await fetchForecast();
      setEditingTarget(false);
    } catch (err) {
      console.error('Failed to update target:', err);
    } finally {
      setSavingTarget(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl animate-pulse">
        <div className="h-6 w-56 bg-slate-800 rounded mb-4"></div>
        <div className="h-20 bg-slate-800/40 rounded-2xl"></div>
      </div>
    );
  }

  if (!forecast) return null;

  const isAhead = forecast.projected_month_end >= forecast.target_revenue;
  const progressPct = Math.min(Math.round((forecast.current_revenue / forecast.target_revenue) * 100), 100);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden">
      
      {/* Background Ambient Glow */}
      <div className={`absolute -right-16 -top-16 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20 ${
        isAhead ? 'bg-emerald-500' : 'bg-amber-500'
      }`}></div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Predictive Run-Rate
              </span>
              <span className="text-xs font-semibold text-slate-400 font-mono">
                Day {forecast.days_elapsed} of {forecast.days_in_month} ({forecast.year_month})
              </span>
            </div>
            <h3 className="text-lg font-black text-white tracking-wide mt-0.5">
              Sales Forecast vs Monthly Target
            </h3>
          </div>
        </div>

        {/* Target Setter Widget */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-2xl px-3 py-1.5 shadow-inner">
          <Target className="w-4 h-4 text-amber-500 shrink-0" />
          {editingTarget ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">₹</span>
              <input
                type="number"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                autoFocus
              />
              <button
                onClick={handleSaveTarget}
                disabled={savingTarget}
                className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded-md transition-colors"
                title="Save Target"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setEditingTarget(false)}
                className="p-1 text-slate-400 hover:bg-slate-800 rounded-md transition-colors"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="text-xs">
                <span className="text-slate-400 font-medium">Goal: </span>
                <span className="font-black text-white font-mono">
                  ₹{forecast.target_revenue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </span>
              </div>
              <button
                onClick={() => setEditingTarget(true)}
                className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 rounded-lg transition-all"
                title="Edit Target"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PLAIN-LANGUAGE EXECUTIVE STORY SENTENCE */}
      <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4.5 flex items-start gap-3.5 shadow-inner">
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Decision-Support Storyline
          </h4>
          <p className="text-sm sm:text-base font-bold text-white mt-1 leading-relaxed">
            "{forecast.story}"
          </p>
        </div>
      </div>

      {/* Forecast Numbers Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
          <div className="text-[11px] font-bold text-slate-400">Current Invoiced</div>
          <div className="text-lg font-black text-white font-mono mt-1">
            ₹{forecast.current_revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {progressPct}% of monthly goal
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
          <div className="text-[11px] font-bold text-slate-400">Projected Month-End</div>
          <div className="text-lg font-black text-amber-400 font-mono mt-1">
            ₹{forecast.projected_month_end.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Rolling weighted forecast
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
          <div className="text-[11px] font-bold text-slate-400">Daily Run-Rate</div>
          <div className="text-lg font-black text-white font-mono mt-1">
            ₹{forecast.daily_run_rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Avg revenue / day elapsed
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
          <div className="text-[11px] font-bold text-slate-400">Pacing vs Target</div>
          <div className={`text-lg font-black font-mono mt-1 flex items-center gap-1 ${
            isAhead ? 'text-emerald-400' : 'text-orange-400'
          }`}>
            {isAhead ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {Math.abs(forecast.projected_vs_target_pct)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {isAhead ? 'Ahead of forecast' : 'Gap to target'}
          </div>
        </div>
      </div>

      {/* Target Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <span>Pacing Progress (Target: ₹{forecast.target_revenue.toLocaleString('en-IN')})</span>
          <span className="font-mono text-white font-bold">{progressPct}% achieved</span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800">
          <div 
            className={`h-full rounded-full transition-all duration-700 ${
              isAhead ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-amber-400'
            }`}
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          ></div>
        </div>
      </div>

    </div>
  );
};
