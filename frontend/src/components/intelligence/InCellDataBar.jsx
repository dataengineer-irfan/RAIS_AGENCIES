import React from 'react';

/**
 * InCellDataBar - Power BI 2026 style proportional in-cell data bar.
 * Renders a subtle colored fill bar behind or beside numerical values.
 */
export const InCellDataBar = ({
  value = 0,
  maxValue = 100,
  formattedValue,
  subLabel,
  color = 'amber',
  align = 'right',
  showBar = true
}) => {
  const numVal = Number(value) || 0;
  const numMax = Number(maxValue) || 1;
  const pct = Math.min(100, Math.max(0, (numVal / numMax) * 100));

  const colorStyles = {
    amber: {
      bar: 'bg-amber-400/20 dark:bg-amber-500/25 border-r-2 border-amber-500',
      text: 'text-amber-800 dark:text-amber-300 font-bold'
    },
    emerald: {
      bar: 'bg-emerald-400/20 dark:bg-emerald-500/25 border-r-2 border-emerald-500',
      text: 'text-emerald-800 dark:text-emerald-300 font-bold'
    },
    indigo: {
      bar: 'bg-indigo-400/20 dark:bg-indigo-500/25 border-r-2 border-indigo-500',
      text: 'text-indigo-800 dark:text-indigo-300 font-bold'
    },
    blue: {
      bar: 'bg-blue-400/20 dark:bg-blue-500/25 border-r-2 border-blue-500',
      text: 'text-blue-800 dark:text-blue-300 font-bold'
    },
    rose: {
      bar: 'bg-rose-400/20 dark:bg-rose-500/25 border-r-2 border-rose-500',
      text: 'text-rose-800 dark:text-rose-300 font-bold'
    }
  };

  const scheme = colorStyles[color] || colorStyles.amber;

  return (
    <div className={`relative w-full overflow-hidden rounded px-1.5 py-0.5 min-w-[70px] ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {showBar && pct > 0 && (
        <div
          className={`absolute top-0 bottom-0 left-0 transition-all duration-300 pointer-events-none ${scheme.bar}`}
          style={{ width: `${pct}%` }}
        />
      )}
      <div className="relative z-10 font-mono text-xs leading-tight">
        <span className={scheme.text}>{formattedValue !== undefined ? formattedValue : numVal.toLocaleString('en-IN')}</span>
        {subLabel && (
          <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-sans font-medium truncate">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
};
