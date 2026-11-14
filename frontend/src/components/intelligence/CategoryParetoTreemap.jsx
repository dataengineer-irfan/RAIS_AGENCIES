import React, { useMemo } from 'react';
import { Layers, PieChart, Check } from 'lucide-react';

/**
 * CategoryParetoTreemap - Power BI 2026 Style Category Treemap & Pareto Slicer
 * Proportional blocks visual with Margin % color coding and 1-click cross-filtering.
 */
export const CategoryParetoTreemap = ({
  items = [],
  selectedCategory = 'ALL',
  onSelectCategory,
  metricMode = 'revenue' // 'revenue' | 'profit' | 'volume'
}) => {
  // Aggregate items by category
  const categoryStats = useMemo(() => {
    if (!items || items.length === 0) return [];
    const map = {};
    let totalMetricVal = 0;

    items.forEach(item => {
      const cat = item.category_name || 'General';
      if (!map[cat]) {
        map[cat] = {
          name: cat,
          revenue: 0,
          profit: 0,
          units: 0,
          kg: 0,
          skuCount: 0
        };
      }
      const rev = Number(item.revenue_30d) || 0;
      const profit = Number(item.profit_30d) || 0;
      const units = Number(item.units_sold_30d) || 0;
      const kg = Number(item.kg_sold) || 0;

      map[cat].revenue += rev;
      map[cat].profit += profit;
      map[cat].units += units;
      map[cat].kg += kg;
      map[cat].skuCount += 1;
    });

    const list = Object.values(map).map(c => {
      const marginPct = c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0;
      let primaryVal = c.revenue;
      if (metricMode === 'profit') primaryVal = Math.max(0, c.profit);
      if (metricMode === 'volume') primaryVal = c.units;
      totalMetricVal += primaryVal;

      return {
        ...c,
        marginPct: Math.round(marginPct * 10) / 10,
        primaryVal
      };
    });

    // Sort descending by primary metric
    list.sort((a, b) => b.primaryVal - a.primaryVal);

    // Calculate Pareto cumulative share
    let runningSum = 0;
    return list.map(c => {
      const sharePct = totalMetricVal > 0 ? (c.primaryVal / totalMetricVal) * 100 : 0;
      runningSum += sharePct;
      return {
        ...c,
        sharePct: Math.round(sharePct * 10) / 10,
        cumulativePct: Math.round(runningSum * 10) / 10
      };
    });
  }, [items, metricMode]);

  const totalVal = useMemo(() => {
    return categoryStats.reduce((s, c) => s + c.primaryVal, 0);
  }, [categoryStats]);

  const getMarginBadgeClass = (margin) => {
    if (margin >= 20) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    if (margin >= 10) return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
    return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
  };

  const getCardTheme = (catName, margin, isSelected) => {
    if (isSelected) {
      return 'border-amber-500 ring-2 ring-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20';
    }
    return 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700';
  };

  if (categoryStats.length === 0) {
    return (
      <div className="p-4 text-center text-slate-400 text-xs">
        No category distribution data available for this slice.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Category Pareto & Decomposition Treemap
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              Volume & Value share with 80/20 threshold • Tap category to cross-filter
            </p>
          </div>
        </div>

        {selectedCategory !== 'ALL' && (
          <button
            onClick={() => onSelectCategory('ALL')}
            className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Clear Filter (Show All)
          </button>
        )}
      </div>

      {/* Proportional Grid Blocks (Treemap Layout) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 flex-1">
        {categoryStats.map((c) => {
          const isSelected = selectedCategory === c.name;
          const isParetoVital = c.cumulativePct <= 80;

          return (
            <div
              key={c.name}
              onClick={() => onSelectCategory(isSelected ? 'ALL' : c.name)}
              className={`relative border rounded-xl p-2.5 cursor-pointer transition-all duration-200 select-none flex flex-col justify-between ${getCardTheme(
                c.name,
                c.marginPct,
                isSelected
              )}`}
            >
              {/* Top row: Name & Share */}
              <div>
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate" title={c.name}>
                    {c.name}
                  </span>
                  {isSelected && (
                    <span className="shrink-0 p-0.5 rounded-full bg-amber-500 text-slate-950">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  <span>{c.skuCount} SKUs</span>
                  <span>•</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{c.sharePct}% share</span>
                </div>
              </div>

              {/* Bottom row: Value & Margin */}
              <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                    ₹{c.revenue >= 100000 ? `${(c.revenue / 100000).toFixed(2)}L` : Math.round(c.revenue).toLocaleString('en-IN')}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${getMarginBadgeClass(
                      c.marginPct
                    )}`}
                  >
                    {c.marginPct}% mrg
                  </span>
                </div>

                {/* Micro Proportional Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (c.primaryVal / (categoryStats[0]?.primaryVal || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* 80/20 Vital Tag */}
              {isParetoVital && (
                <div className="absolute top-1 right-1 text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  TOP 80%
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
