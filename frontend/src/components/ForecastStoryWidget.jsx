import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Edit3, 
  Check, 
  X, 
  ArrowLeft,
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Calendar,
  Sparkles,
  BarChart2,
  ChevronRight,
  Zap
} from 'lucide-react';
import { analyticsApi } from '../services/api';
import { MiniSparkline } from './MiniSparkline';

export const ForecastStoryWidget = ({ onOpenDrilldown, onBackToOverview }) => {
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl animate-pulse space-y-3">
        <div className="h-6 w-48 bg-slate-800 rounded"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 bg-slate-800/50 rounded-xl"></div>
          ))}
        </div>
        <div className="h-64 bg-slate-800/30 rounded-xl"></div>
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
  const daysInMonth = forecast.days_in_month || 30;
  const daysElapsed = forecast.days_elapsed || 1;
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);
  const targetDailyRate = targetRev / daysInMonth;
  const requiredDailyRate = daysRemaining > 0 ? Math.max(0, (targetRev - currentRev) / daysRemaining) : 0;

  const sparklineData = (forecast.sparkline || []).map(p => p.daily_revenue || 0);

  return (
    <div className="flex flex-col h-full gap-2 overflow-hidden animate-fadeIn pb-16 sm:pb-0">
      
      {/* ─── ROW 1: 46px UNIFIED COMMAND RIBBON ─── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 shadow-md flex items-center justify-between gap-2 shrink-0 flex-wrap sm:flex-nowrap">
        {/* Left: Back Button (if provided) + Title + Date Context Badge */}
        <div className="flex items-center gap-2 min-w-0">
          {onBackToOverview && (
            <button
              onClick={onBackToOverview}
              className="p-1.5 -ml-1 text-slate-300 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1 text-xs font-bold border border-slate-700 shrink-0"
              title="Back to Dashboard Overview"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Overview</span>
            </button>
          )}
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <h2 className="text-xs sm:text-sm font-black text-white truncate">
              Forecast & Targets
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800 shrink-0">
              Day {daysElapsed}/{daysInMonth} • {forecast.year_month}
            </span>
          </div>
        </div>

        {/* Center / Right: Inline Goal Setter + Pacing Badge + Drilldown Action */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Inline Goal Setter Pill */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Goal:</span>
            {editingTarget ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-amber-400 font-mono">₹</span>
                <input
                  type="number"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="w-16 sm:w-20 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveTarget}
                  disabled={savingTarget}
                  className="p-0.5 text-emerald-400 hover:bg-emerald-500/20 rounded transition"
                  title="Save Goal"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingTarget(false)}
                  className="p-0.5 text-slate-400 hover:bg-slate-800 rounded transition"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-amber-400">
                  ₹{targetRev.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                <button
                  onClick={() => setEditingTarget(true)}
                  className="p-0.5 text-slate-400 hover:text-amber-400 rounded transition"
                  title="Edit Target"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Pacing Badge */}
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
            isAhead
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {isAhead ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>{isAhead ? `Ahead +${pacePct}%` : `Behind -${pacePct}%`}</span>
          </div>

          {/* Drilldown Trigger */}
          {onOpenDrilldown && (
            <button
              onClick={onOpenDrilldown}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition-all active:scale-95"
              title="Open Full Sales Velocity Breakdown"
            >
              <span>Breakdown</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ─── ROW 2: 4-CELL HIGH-DENSITY METRICS & VELOCITY STRIP ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
        {/* Cell 1: Invoiced Revenue & Progress */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Invoiced Revenue
            </span>
            <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
              {progressPct}%
            </span>
          </div>
          <div className="mt-1">
            <span className="text-sm sm:text-base font-mono font-black text-white">
              ₹{currentRev.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {/* Compact Mini Progress Bar */}
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden mt-1.5 border border-slate-800">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                isAhead ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Cell 2: Daily Velocity with Inline Sparkline */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Daily Velocity
            </span>
            <MiniSparkline data={sparklineData} color="amber" width={42} height={14} />
          </div>
          <div className="mt-1">
            <span className="text-sm sm:text-base font-mono font-black text-amber-400">
              ₹{dailyRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
            Target run-rate: ₹{targetDailyRate.toFixed(0)}/day
          </span>
        </div>

        {/* Cell 3: Projected Month-End */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Projected Month-End
            </span>
            <span className={`text-[10px] font-mono font-bold ${isAhead ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isAhead ? '🟢 Target Met' : '🔴 Shortfall'}
            </span>
          </div>
          <div className="mt-1">
            <span className="text-sm sm:text-base font-mono font-black text-white">
              ₹{projectedRev.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
            {isAhead ? `Surplus: +₹${Math.round(projectedRev - targetRev).toLocaleString('en-IN')}` : `Gap: -₹${Math.round(targetRev - projectedRev).toLocaleString('en-IN')}`}
          </span>
        </div>

        {/* Cell 4: Run-Rate Requirement / Sprint Pacing */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Remaining Run-Rate
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {daysRemaining}d left
            </span>
          </div>
          <div className="mt-1">
            <span className="text-sm sm:text-base font-mono font-black text-emerald-400">
              ₹{requiredDailyRate.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/day
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
            Needed to hit ₹{targetRev.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* ─── ROW 3: DAILY RUN-RATE LOG TABLE (FLEX-1, HIGH-DENSITY, INTERNAL SCROLL) ─── */}
      <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-lg flex flex-col overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 mb-1.5 border-b border-slate-800 text-xs font-bold text-white shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <BarChart2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Daily Intake & Run-Rate Ledger</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
              {forecast.sparkline?.length || 0} Days
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 shrink-0 self-start sm:self-auto">
            Target Benchmark: ₹{targetDailyRate.toFixed(0)}/day
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto custom-scrollbar [scrollbar-width:thin] scrollbar-thin">
          <table className="w-full min-w-[420px] text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-950 z-10 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-400">
              <tr>
                <th className="py-2 px-2.5">Date</th>
                <th className="py-2 px-2.5 text-right">Daily Invoiced</th>
                <th className="py-2 px-2.5 text-right">Cumulative</th>
                <th className="py-2 px-2.5 text-right">Pace vs Target</th>
                <th className="py-2 px-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {[...(forecast.sparkline || [])].reverse().map((day) => {
                const dailyVal = parseFloat(day.daily_revenue || 0);
                const isDayAhead = dailyVal >= targetDailyRate;

                const formatDateDisplay = (dateStr) => {
                  if (!dateStr) return '';
                  try {
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      const mIdx = parseInt(parts[1], 10) - 1;
                      return `${parts[2]} ${months[mIdx] || parts[1]}`;
                    }
                    return dateStr;
                  } catch (e) {
                    return dateStr;
                  }
                };

                return (
                  <tr key={day.date} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-2 px-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-white">
                          {formatDateDisplay(day.date)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          Day {day.day}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-white whitespace-nowrap">
                      ₹{dailyVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-semibold text-slate-300 whitespace-nowrap">
                      ₹{parseFloat(day.cumulative_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2.5 text-right whitespace-nowrap">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isDayAhead 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {isDayAhead ? '+' : ''}{((dailyVal - targetDailyRate) / 1000).toFixed(1)}k
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-center whitespace-nowrap">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${
                        isDayAhead
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {isDayAhead ? '🟢 Above Pace' : '🔴 Below Pace'}
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
