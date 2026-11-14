import React, { useState, useMemo } from 'react';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ChevronRight, 
  ChevronDown, 
  Clock, 
  Store, 
  ExternalLink, 
  TrendingUp, 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus 
} from 'lucide-react';
import { ProductVisualBadge } from '../../utils/productIcons';
import { InCellDataBar } from './InCellDataBar';

/**
 * HierarchicalMatrixTable - Power BI 2026 Style Dense Matrix Visual
 * Rich in-cell data bars, continuous margin % heatmaps, and expandable category grouping.
 */
export const HierarchicalMatrixTable = ({
  items = [],
  selectedProductId,
  onSelectProduct,
  onOpenDrillthrough,
  onOpenOutletPenetration,
  periodLabel = '30D'
}) => {
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [sortColumn, setSortColumn] = useState('revenue_30d');
  const [sortDirection, setSortDirection] = useState('desc');

  // Compute maximum values for in-cell data bar scaling
  const { maxRevenue, maxUnits } = useMemo(() => {
    let mRev = 1;
    let mUnits = 1;
    items.forEach(i => {
      const rev = Number(i.revenue_30d) || 0;
      const units = Number(i.units_sold_30d) || 0;
      if (rev > mRev) mRev = rev;
      if (units > mUnits) mUnits = units;
    });
    return { maxRevenue: mRev, maxUnits: mUnits };
  }, [items]);

  // Handle Sort Toggle
  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortColumn(columnKey);
      if (['name', 'category_name', 'classification'].includes(columnKey)) {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    }
  };

  // Sorted items
  const sortedItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    return [...items].sort((a, b) => {
      let valA = a[sortColumn];
      let valB = b[sortColumn];

      if (valA === undefined || valA === null) valA = 0;
      if (valB === undefined || valB === null) valB = 0;

      if (typeof valA === 'string' && isNaN(Number(valA))) {
        const cmp = valA.localeCompare(valB);
        return sortDirection === 'asc' ? cmp : -cmp;
      }

      const numA = Number(valA) || 0;
      const numB = Number(valB) || 0;
      if (numA !== numB) {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }
      return (Number(b.revenue_30d) || 0) - (Number(a.revenue_30d) || 0);
    });
  }, [items, sortColumn, sortDirection]);

  // Grouped by Category structure
  const groupedData = useMemo(() => {
    if (!groupByCategory) return [];
    const map = {};
    sortedItems.forEach(item => {
      const cat = item.category_name || 'General';
      if (!map[cat]) {
        map[cat] = {
          name: cat,
          items: [],
          totalRevenue: 0,
          totalProfit: 0,
          totalUnits: 0,
          totalKg: 0
        };
      }
      map[cat].items.push(item);
      map[cat].totalRevenue += Number(item.revenue_30d) || 0;
      map[cat].totalProfit += Number(item.profit_30d) || 0;
      map[cat].totalUnits += Number(item.units_sold_30d) || 0;
      map[cat].totalKg += Number(item.kg_sold) || 0;
    });

    return Object.values(map).map(c => ({
      ...c,
      marginPct: c.totalRevenue > 0 ? (c.totalProfit / c.totalRevenue) * 100 : 0
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [sortedItems, groupByCategory]);

  const toggleCategory = (catName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catName]: prev[catName] === undefined ? false : !prev[catName]
    }));
  };

  // Continuous 3-Stop Color Scale for Margin %
  const getMarginStyle = (margin) => {
    const m = Number(margin) || 0;
    if (m >= 20) {
      return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600/40 font-black';
    }
    if (m >= 14) {
      return 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-600/40 font-black';
    }
    if (m >= 8) {
      return 'bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-600/40 font-semibold';
    }
    return 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-600/40 font-bold';
  };

  const renderSortHeader = (label, columnKey, alignRight = false) => {
    const isCurrent = sortColumn === columnKey;
    return (
      <th
        onClick={() => handleSort(columnKey)}
        className={`py-2 px-2.5 cursor-pointer select-none transition-colors group whitespace-nowrap text-xs ${
          alignRight ? 'text-right' : 'text-left'
        } ${isCurrent ? 'text-amber-600 dark:text-amber-400 font-black' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
        title={`Sort by ${label} (${isCurrent && sortDirection === 'desc' ? 'Ascending' : 'Descending'})`}
      >
        <div className={`flex items-center gap-1 ${alignRight ? 'justify-end' : 'justify-start'}`}>
          <span>{label}</span>
          <span className="shrink-0">
            {isCurrent ? (
              sortDirection === 'desc' ? (
                <ArrowDown className="w-3 h-3 text-amber-500 inline" />
              ) : (
                <ArrowUp className="w-3 h-3 text-amber-500 inline" />
              )
            ) : (
              <ArrowUpDown className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity inline" />
            )}
          </span>
        </div>
      </th>
    );
  };

  const renderProductRow = (item, idx) => {
    const isSelected = selectedProductId === item.product_id;
    const profit = Number(item.profit_30d) || 0;
    const rev = Number(item.revenue_30d) || 0;
    const units = Number(item.units_sold_30d) || 0;
    const kg = Number(item.kg_sold) || 0;
    const margin = Number(item.margin_pct) || 0;
    const trend = Number(item.trend_pct) || 0;

    return (
      <tr
        key={item.product_id}
        onClick={() => onSelectProduct && onSelectProduct(item)}
        className={`cursor-pointer transition-colors duration-150 border-b border-slate-100 dark:border-slate-800/80 text-xs ${
          isSelected
            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-l-4 border-l-amber-500'
            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }`}
      >
        {/* Product / SKU column */}
        <td className="py-2 px-2.5 max-w-[240px]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 w-5 shrink-0">
              #{idx + 1}
            </span>
            <ProductVisualBadge product={item} size="sm" />
            <div className="min-w-0">
              <div className="font-bold text-slate-900 dark:text-white truncate">
                {item.name}
              </div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                {item.sku} • {item.brand || item.category_name}
              </div>
            </div>
          </div>
        </td>

        {/* Volume with Data Bar */}
        <td className="py-2 px-2.5 text-right whitespace-nowrap min-w-[110px]">
          <InCellDataBar
            value={units}
            maxValue={maxUnits}
            formattedValue={`${units} pkts`}
            subLabel={kg > 0 ? `⚖️ ${kg} KG` : null}
            color="emerald"
            align="right"
          />
        </td>

        {/* Billed Revenue with Data Bar */}
        <td className="py-2 px-2.5 text-right whitespace-nowrap min-w-[120px]">
          <InCellDataBar
            value={rev}
            maxValue={maxRevenue}
            formattedValue={`₹${rev.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            color="amber"
            align="right"
          />
        </td>

        {/* Net Profit (₹) */}
        <td className="py-2 px-2.5 text-right font-mono font-bold whitespace-nowrap">
          {units > 0 ? (
            <span className={profit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500'}>
              {profit >= 0 ? '+' : ''}₹{profit.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-600 font-normal">—</span>
          )}
        </td>

        {/* Margin % with 3-Stop Continuous Color Scale Heatmap */}
        <td className="py-2 px-2.5 text-right whitespace-nowrap">
          {units > 0 ? (
            <div className="flex justify-end">
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${getMarginStyle(margin)}`}>
                {margin.toFixed(1)}%
              </span>
            </div>
          ) : (
            <span className="text-slate-400 dark:text-slate-600 font-mono text-[10px]">0.0%</span>
          )}
        </td>

        {/* Velocity Trend % */}
        <td className="py-2 px-2.5 text-right font-mono whitespace-nowrap">
          {trend > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <ArrowUpRight className="w-3 h-3" />+{trend}%
            </span>
          ) : trend < 0 ? (
            <span className="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-bold">
              <ArrowDownRight className="w-3 h-3" />{trend}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-slate-400 font-normal">
              <Minus className="w-3 h-3" />0%
            </span>
          )}
        </td>

        {/* Stock Holding */}
        <td className="py-2 px-2.5 text-right font-mono whitespace-nowrap">
          <div className="font-bold text-slate-900 dark:text-white">
            {item.stock_holding_units}
          </div>
          {item.stock_holding_kg > 0 && (
            <div className="text-[10px] text-slate-400 font-normal">
              {item.stock_holding_kg} KG
            </div>
          )}
        </td>

        {/* Drillthrough Action Buttons */}
        <td className="py-2 px-2.5 text-right whitespace-nowrap">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDrillthrough && onOpenDrillthrough(item);
              }}
              className="p-1 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 transition-colors"
              title="Drillthrough to Daily Sales & Invoice Slips"
            >
              <Clock className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenOutletPenetration && onOpenOutletPenetration(item);
              }}
              className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-800 transition-colors"
              title="Drillthrough to Customer Outlet Penetration"
            >
              <Store className="w-3 h-3" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
      {/* Sub-header Bar: Grouping Toggle + Row Counter */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Master Commercial Matrix
          </span>
          <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-600 dark:text-slate-400">
            {sortedItems.length} SKUs
          </span>
        </div>

        {/* Group by Category Toggle */}
        <button
          onClick={() => setGroupByCategory(prev => !prev)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold transition-all border ${
            groupByCategory
              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
          }`}
        >
          <Layers className="w-3 h-3" />
          <span>Hierarchy (Group by Category)</span>
        </button>
      </div>

      {/* Table Scroll Container */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left border-collapse select-none">
          <thead className="sticky top-0 z-10 bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
            <tr>
              {renderSortHeader('Product / SKU', 'name')}
              {renderSortHeader(`Volume (${periodLabel})`, 'units_sold_30d', true)}
              {renderSortHeader(`Revenue (₹)`, 'revenue_30d', true)}
              {renderSortHeader(`Profit (₹)`, 'profit_30d', true)}
              {renderSortHeader('Margin %', 'margin_pct', true)}
              {renderSortHeader('Velocity Trend', 'trend_pct', true)}
              {renderSortHeader('Stock (Units/KG)', 'stock_holding_units', true)}
              <th className="py-2 px-2.5 text-right text-xs font-bold text-slate-500 dark:text-slate-400">
                Drillthrough
              </th>
            </tr>
          </thead>
          <tbody>
            {!groupByCategory ? (
              // Flat Sorted Table
              sortedItems.map((item, idx) => renderProductRow(item, idx))
            ) : (
              // Hierarchical Grouped Table
              groupedData.map((cat) => {
                const isExpanded = expandedCategories[cat.name] !== false; // default expanded

                return (
                  <React.Fragment key={cat.name}>
                    {/* Category Group Header Row */}
                    <tr
                      onClick={() => toggleCategory(cat.name)}
                      className="bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-750 cursor-pointer border-b border-slate-200 dark:border-slate-700 font-bold text-xs"
                    >
                      <td colSpan={2} className="py-2 px-2.5 text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-amber-500" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{cat.name}</span>
                          <span className="font-mono text-[10px] text-slate-500 font-normal">
                            ({cat.items.length} SKUs)
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-amber-600 dark:text-amber-400">
                        ₹{cat.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-indigo-600 dark:text-indigo-400">
                        +₹{cat.totalProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {cat.marginPct.toFixed(1)}%
                      </td>
                      <td colSpan={3} className="py-2 px-2.5 text-right font-mono text-[10px] text-slate-400">
                        {cat.totalUnits} pkts total
                      </td>
                    </tr>

                    {/* Child Rows */}
                    {isExpanded && cat.items.map((item, idx) => renderProductRow(item, idx))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
