import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { MiniSparkline } from '../MiniSparkline';

/**
 * PowerBIKpiCard - Power BI 2026 "New Card" Visual
 * High-density executive KPI visual with embedded sparkline, variance indicators, and reference baseline.
 * Supports compact mode to eliminate vertical scrolling on standard laptop displays.
 */
export const PowerBIKpiCard = ({
  title,
  value,
  subValue,
  variancePct,
  varianceLabel = 'vs prior',
  sparklineData = [35, 42, 40, 55, 52, 60, 68],
  sparklineColor = 'amber',
  referenceLabel,
  icon: Icon,
  accentColor = 'amber',
  onClick,
  isSelected = false,
  compact = true
}) => {
  const isPositive = Number(variancePct) > 0;
  const isNegative = Number(variancePct) < 0;

  const accentBorders = {
    amber: 'border-l-4 border-l-amber-500',
    emerald: 'border-l-4 border-l-emerald-500',
    indigo: 'border-l-4 border-l-indigo-500',
    blue: 'border-l-4 border-l-blue-500',
    rose: 'border-l-4 border-l-rose-500'
  };

  const accentIcons = {
    amber: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
    emerald: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
    indigo: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30',
    blue: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30',
    rose: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
  };

  // COMPACT HIGH-DENSITY VIEW (~64px height)
  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`relative group bg-white dark:bg-slate-900 border rounded-xl px-2.5 py-2 shadow-sm transition-all duration-200 select-none ${
          onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700' : ''
        } ${
          isSelected
            ? 'ring-2 ring-amber-500/50 border-amber-500 dark:border-amber-500'
            : 'border-slate-200 dark:border-slate-800'
        } ${accentBorders[accentColor] || accentBorders.amber}`}
      >
        {/* Top line: Label + Icon + Variance Pill */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {Icon && (
              <div className={`p-0.5 rounded border text-[10px] shrink-0 ${accentIcons[accentColor] || accentIcons.amber}`}>
                <Icon className="w-2.5 h-2.5" />
              </div>
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              {title}
            </span>
          </div>

          {/* Variance Badge */}
          <div className="shrink-0 font-mono text-[10px] font-bold">
            {isPositive ? (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                <ArrowUpRight className="w-2.5 h-2.5" />
                +{variancePct}%
              </span>
            ) : isNegative ? (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
                <ArrowDownRight className="w-2.5 h-2.5" />
                {variancePct}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                <Minus className="w-2.5 h-2.5" />
                0%
              </span>
            )}
          </div>
        </div>

        {/* Bottom line: Value + Sparkline + SubValue */}
        <div className="flex items-end justify-between gap-1.5">
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white tracking-tight leading-none truncate">
              {value}
            </div>
            {subValue && (
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold truncate mt-0.5">
                {subValue}
              </div>
            )}
          </div>

          {/* Mini Sparkline */}
          {sparklineData && sparklineData.length > 1 && (
            <div className="shrink-0">
              <MiniSparkline
                data={sparklineData}
                color={sparklineColor}
                width={56}
                height={20}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // STANDARD EXPANDED VIEW
  return (
    <div
      onClick={onClick}
      className={`relative group bg-white dark:bg-slate-900 border rounded-xl p-3 shadow-sm transition-all duration-200 select-none ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700' : ''
      } ${
        isSelected
          ? 'ring-2 ring-amber-500/50 border-amber-500 dark:border-amber-500'
          : 'border-slate-200 dark:border-slate-800'
      } ${accentBorders[accentColor] || accentBorders.amber}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
          {title}
        </span>
        {Icon && (
          <div className={`p-1 rounded-lg border text-xs shrink-0 ${accentIcons[accentColor] || accentIcons.amber}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight truncate">
            {value}
          </div>
          {subValue && (
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold mt-0.5 truncate">
              {subValue}
            </div>
          )}
        </div>

        {sparklineData && sparklineData.length > 1 && (
          <div className="shrink-0 pt-1">
            <MiniSparkline
              data={sparklineData}
              color={sparklineColor}
              width={76}
              height={26}
            />
          </div>
        )}
      </div>

      <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1 shrink-0 font-mono font-bold">
          {isPositive ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
              <ArrowUpRight className="w-3 h-3" />
              +{variancePct}%
            </span>
          ) : isNegative ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
              <ArrowDownRight className="w-3 h-3" />
              {variancePct}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <Minus className="w-3 h-3" />
              0.0%
            </span>
          )}
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-sans font-normal truncate">
            {varianceLabel}
          </span>
        </div>

        {referenceLabel && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate text-right">
            {referenceLabel}
          </span>
        )}
      </div>
    </div>
  );
};
