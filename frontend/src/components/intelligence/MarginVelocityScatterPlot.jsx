import React, { useMemo, useState } from 'react';
import { Target, Star, AlertTriangle, Snowflake, Sparkles } from 'lucide-react';

/**
 * MarginVelocityScatterPlot - BCG Margin-Velocity Scatter Matrix
 * Plots SKUs on X (Velocity / Units Sold) vs Y (Gross Margin %).
 * Divides into 4 strategic quadrants: Stars, Cash Cows, Question Marks, and Dead Stock.
 */
export const MarginVelocityScatterPlot = ({
  items = [],
  selectedProductId,
  onSelectProduct
}) => {
  const [hoveredProduct, setHoveredProduct] = useState(null);

  // Compute quadrant boundaries (Medians or Industry benchmarks: 15% margin threshold, median velocity)
  const plotData = useMemo(() => {
    if (!items || items.length === 0) return { points: [], maxUnits: 10, maxMargin: 40 };

    const validItems = items.filter(i => (Number(i.units_sold_30d) || 0) >= 0);
    const maxUnits = Math.max(20, ...validItems.map(i => Number(i.units_sold_30d) || 0));
    const maxMargin = Math.max(35, ...validItems.map(i => Number(i.margin_pct) || 0));

    const marginThreshold = 15; // 15% standard frozen margin
    const velocityThreshold = maxUnits * 0.25; // 25% of top mover

    const points = validItems.map(item => {
      const units = Number(item.units_sold_30d) || 0;
      const margin = Number(item.margin_pct) || 0;

      // Assign BCG Quadrant
      let quadrant = 'DOG';
      if (units >= velocityThreshold && margin >= marginThreshold) {
        quadrant = 'STAR';
      } else if (units >= velocityThreshold && margin < marginThreshold) {
        quadrant = 'CASH_COW';
      } else if (units < velocityThreshold && margin >= marginThreshold) {
        quadrant = 'QUESTION_MARK';
      } else {
        quadrant = 'DOG';
      }

      return {
        ...item,
        units,
        margin,
        quadrant
      };
    });

    return { points, maxUnits, maxMargin, marginThreshold, velocityThreshold };
  }, [items]);

  const { points, maxUnits, maxMargin, marginThreshold, velocityThreshold } = plotData;

  const width = 500;
  const height = 240;
  const padding = { top: 20, right: 25, bottom: 35, left: 45 };

  const usableW = width - padding.left - padding.right;
  const usableH = height - padding.top - padding.bottom;

  // Scale functions
  const getX = (units) => padding.left + (units / maxUnits) * usableW;
  const getY = (margin) => padding.top + usableH - (Math.min(maxMargin, Math.max(0, margin)) / maxMargin) * usableH;

  const thresholdX = getX(velocityThreshold);
  const thresholdY = getY(marginThreshold);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-1 pb-1.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
            <Target className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              BCG Margin vs. Velocity Scatter Matrix
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              X: Units Sold • Y: Gross Margin % • Tap point to inspect SKU dossier
            </p>
          </div>
        </div>

        {/* Legend pills */}
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Stars
          </span>
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Cash Cows
          </span>
          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Question Marks
          </span>
          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Dead Stock
          </span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden min-h-[190px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full select-none"
          style={{ maxHeight: '220px' }}
        >
          {/* Quadrant Background Shading */}
          {/* Stars (Top-Right) */}
          <rect
            x={thresholdX}
            y={padding.top}
            width={width - padding.right - thresholdX}
            height={thresholdY - padding.top}
            fill="rgba(16, 185, 129, 0.05)"
          />
          {/* Question Marks (Top-Left) */}
          <rect
            x={padding.left}
            y={padding.top}
            width={thresholdX - padding.left}
            height={thresholdY - padding.top}
            fill="rgba(59, 130, 246, 0.04)"
          />
          {/* Cash Cows (Bottom-Right) */}
          <rect
            x={thresholdX}
            y={thresholdY}
            width={width - padding.right - thresholdX}
            height={height - padding.bottom - thresholdY}
            fill="rgba(245, 158, 11, 0.04)"
          />
          {/* Dead Stock / Dogs (Bottom-Left) */}
          <rect
            x={padding.left}
            y={thresholdY}
            width={thresholdX - padding.left}
            height={height - padding.bottom - thresholdY}
            fill="rgba(244, 63, 94, 0.04)"
          />

          {/* Quadrant Labels */}
          <text
            x={width - padding.right - 10}
            y={padding.top + 16}
            textAnchor="end"
            className="text-[10px] font-bold fill-emerald-600/60 dark:fill-emerald-400/60"
          >
            ⭐ STARS (High Margin + Fast)
          </text>
          <text
            x={padding.left + 10}
            y={padding.top + 16}
            textAnchor="start"
            className="text-[10px] font-bold fill-blue-600/60 dark:fill-blue-400/60"
          >
            ❓ QUESTION MARKS (High Margin + Slow)
          </text>
          <text
            x={width - padding.right - 10}
            y={height - padding.bottom - 8}
            textAnchor="end"
            className="text-[10px] font-bold fill-amber-600/60 dark:fill-amber-400/60"
          >
            🐄 CASH COWS (Low Margin + Fast)
          </text>
          <text
            x={padding.left + 10}
            y={height - padding.bottom - 8}
            textAnchor="start"
            className="text-[10px] font-bold fill-rose-600/60 dark:fill-rose-400/60"
          >
            ❄️ DEAD STOCK (Low Margin + Slow)
          </text>

          {/* Threshold Divider Lines */}
          <line
            x1={thresholdX}
            y1={padding.top}
            x2={thresholdX}
            y2={height - padding.bottom}
            stroke="#94a3b8"
            strokeDasharray="3 3"
            strokeOpacity="0.4"
          />
          <line
            x1={padding.left}
            y1={thresholdY}
            x2={width - padding.right}
            y2={thresholdY}
            stroke="#94a3b8"
            strokeDasharray="3 3"
            strokeOpacity="0.4"
          />

          {/* Axes */}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#64748b"
            strokeWidth="1.5"
          />
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke="#64748b"
            strokeWidth="1.5"
          />

          {/* Axis Labels */}
          <text
            x={width - padding.right}
            y={height - 8}
            textAnchor="end"
            className="text-[9px] font-mono fill-slate-500 font-bold"
          >
            Velocity (Units Sold) →
          </text>
          <text
            x={10}
            y={padding.top + 5}
            textAnchor="start"
            className="text-[9px] font-mono fill-slate-500 font-bold"
          >
            Margin % ↑
          </text>

          {/* Data Points */}
          {points.map((p) => {
            const cx = getX(p.units);
            const cy = getY(p.margin);
            const isSelected = selectedProductId === p.product_id;
            const isHovered = hoveredProduct?.product_id === p.product_id;

            let dotColor = '#fbbf24'; // amber
            if (p.quadrant === 'STAR') dotColor = '#10b981'; // emerald
            if (p.quadrant === 'QUESTION_MARK') dotColor = '#3b82f6'; // blue
            if (p.quadrant === 'DOG') dotColor = '#f43f5e'; // rose

            const radius = isSelected ? 7 : isHovered ? 6 : 4.5;

            return (
              <g
                key={p.product_id}
                className="cursor-pointer transition-all"
                onClick={() => onSelectProduct && onSelectProduct(p)}
                onMouseEnter={() => setHoveredProduct(p)}
                onMouseLeave={() => setHoveredProduct(null)}
              >
                {isSelected && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius + 4}
                    fill="none"
                    stroke={dotColor}
                    strokeWidth="2"
                    strokeDasharray="2 2"
                    className="animate-spin"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill={dotColor}
                  stroke="#ffffff"
                  strokeWidth={isSelected ? 2 : 1}
                  className="transition-transform duration-150 hover:scale-125"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredProduct && (
          <div className="absolute top-2 right-2 bg-slate-950/90 text-white rounded-lg p-2 text-xs border border-slate-700 shadow-xl pointer-events-none backdrop-blur-sm z-30 max-w-[220px]">
            <div className="font-bold text-amber-300 truncate">{hoveredProduct.name}</div>
            <div className="text-[10px] text-slate-400 font-mono">{hoveredProduct.sku}</div>
            <div className="grid grid-cols-2 gap-2 mt-1 pt-1 border-t border-slate-800 text-[11px] font-mono">
              <div>
                <span className="text-slate-400 block text-[9px]">Units Sold:</span>
                <span className="font-bold">{hoveredProduct.units_sold_30d} pkts</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Margin:</span>
                <span className="font-bold text-emerald-400">{hoveredProduct.margin_pct}%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Revenue:</span>
                <span className="font-bold text-amber-400">
                  ₹{Number(hoveredProduct.revenue_30d || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">BCG Box:</span>
                <span className="font-bold uppercase text-[10px]">{hoveredProduct.quadrant}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
