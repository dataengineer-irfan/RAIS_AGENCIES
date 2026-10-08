import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Edit3, 
  Check, 
  X, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Calendar,
  Sparkles,
  BarChart2
} from 'lucide-react';
import { analyticsApi } from '../services/api';
import { MiniSparkline } from './MiniSparkline';

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
      setTargetInput(res?.target_revenue?.toString() || '180000');
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl animate-pulse space-y-3">
        <div className="h-6 w-48 bg-slate-800 rounded"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-slate-800/50 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!forecast) return null;

  const targetRev = parseFloat(forecast.target_revenue || 1);
  const currentRev = parseFloat(forecast.current_revenue || 0);
  const projectedRev = parseFloat(forecast.projected_month_end || 0);
  const dailyRate = parseFloat(forecast.daily_run_rate || 0);
  const progressPct = Math.min(Math.round((currentRev / targetRev) * 100), 100);
  const isAhead = projectedRev >= targetRev;
  const pacePct = Math.abs(parseFloat(forecast.projected_vs_target_pct || 0)).toFixed(1);

  const sparklineData = (forecast.sparkline || []).map(p => p.daily_revenue || 0);

  return (
    <div className="flex flex-col h-full gap-2.5 overflow-hidden animate-fadeIn">
      
      {/* ─── TOP HEADER BAR ─── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white">
                Sales Targets & Run-Rate
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Day {forecast.days_elapsed}/{forecast.days_in_month} ({forecast.year_month})
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Monthly revenue pacing
            </p>
          </div>
        </div>

        {/* Compact Target Setter Pill */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Goal:</span>
          {editingTarget ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-amber-400 font-mono">₹</span>
              <input
                type="number"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                className="w-20 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                autoFocus
              />
              <button
                onClick={handleSaveTarget}
                disabled={savingTarget}
                className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded transition"
                title="Save"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setEditingTarget(false)}
                className="p-1 text-slate-400 hover:bg-slate-800 rounded transition"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold text-white">
                ₹{targetRev.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <button
                onClick={() => setEditingTarget(true)}
                className="p-1 text-slate-400 hover:text-amber-400 rounded transition"
                title="Edit Target"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── 4-TILE EXECUTIVE METRIC STRIP ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
        {/* Invoiced */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Invoiced Revenue
          </span>
          <div className="mt-1">
            <span className="text-base sm:text-lg font-mono font-black text-white">
              ₹{currentRev.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
            {progressPct}% of monthly goal
          </span>
        </div>

        {/* Daily Velocity */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Daily Velocity
            </span>
            <MiniSparkline data={sparklineData} color="amber" width={40} height={14} />
          </div>
          <div className="mt-1">
            <span className="text-base sm:text-lg font-mono font-black text-amber-400">
              ₹{dailyRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
            Avg / day elapsed
          </span>
        </div>

        {/* Projected Month-End */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Projected Month-End
          </span>
          <div className="mt-1">
            <span className="text-base sm:text-lg font-mono font-black text-white">
              ₹{projectedRev.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
            Weighted extrapolation
          </span>
        </div>

        {/* Pacing vs Target */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Pacing vs Target
          </span>
          <div className="mt-1 flex items-center gap-1">
            <span className={`text-base sm:text-lg font-mono font-black ${isAhead ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isAhead ? `+${pacePct}%` : `-${pacePct}%`}
            </span>
            {isAhead ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <span className={`text-[10px] font-bold ${isAhead ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isAhead ? 'Ahead of goal' : 'Behind pace'}
          </span>
        </div>
      </div>

      {/* ─── TARGET PROGRESS BAR (COMPACT 1-LINE) ─── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 shrink-0 space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-400 text-[11px]">
            Goal Progress: <span className="text-white font-mono">{progressPct}%</span> (₹{currentRev.toLocaleString('en-IN', { maximumFractionDigits: 0 })} of ₹{targetRev.toLocaleString('en-IN', { maximumFractionDigits: 0 })})
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isAhead ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border-rose-500/30'}`}>
            {isAhead ? '🟢 On Track' : '🔴 Requires Boost'}
          </span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-2 p-0.5 border border-slate-800">
          <div 
            className={`h-full rounded-full transition-all duration-700 ${
              isAhead ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-amber-400'
            }`}
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
      </div>

      {/* ─── DAILY RUN-RATE LOG TABLE (HIGH-DENSITY, INTERNAL SCROLL) ─── */}
      <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-bold text-white shrink-0">
          <div className="flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Daily Intake & Run-Rate Log ({forecast.sparkline?.length || 0} Days)</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Target Run-Rate: ₹{(targetRev / (forecast.days_in_month || 30)).toFixed(0)}/day
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-950 z-10 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-400">
              <tr>
                <th className="py-2 px-2.5">Date</th>
                <th className="py-2 px-2.5 text-right">Daily Invoiced</th>
                <th className="py-2 px-2.5 text-right">Cumulative Revenue</th>
                <th className="py-2 px-2.5 text-right">Pace vs Run-Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {[...(forecast.sparkline || [])].reverse().map((day) => {
                const targetDaily = targetRev / (forecast.days_in_month || 30);
                const dailyVal = parseFloat(day.daily_revenue || 0);
                const isDayAhead = dailyVal >= targetDaily;

                return (
                  <tr key={day.date} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-2 px-2.5">
                      <span className="font-mono text-xs font-bold text-white">
                        {day.date}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1.5">
                        Day {day.day}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-white">
                      ₹{dailyVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-semibold text-slate-300">
                      ₹{parseFloat(day.cumulative_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2.5 text-right">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isDayAhead 
                          ? 'bg-emerald-500/10 text-emerald-300' 
                          : 'bg-rose-500/10 text-rose-300'
                      }`}>
                        {isDayAhead ? '+' : ''}{((dailyVal - targetDaily) / 1000).toFixed(1)}k
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
