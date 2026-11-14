import React from 'react';
import { 
  Calendar, 
  Filter, 
  Search, 
  RefreshCw, 
  Layers, 
  Percent, 
  Eye, 
  LayoutDashboard, 
  Table as TableIcon,
  X
} from 'lucide-react';

/**
 * StudioGlobalSlicerBar - Power BI 2026 Universal Sticky Slicer Ribbon
 * Handles temporal slicing, category selection, margin bands, and view layouts.
 */
export const StudioGlobalSlicerBar = ({
  period = '30d',
  onPeriodChange,
  customStartDate,
  onCustomStartDateChange,
  customEndDate,
  onCustomEndDateChange,
  selectedCategory = 'ALL',
  onCategoryChange,
  categoryOptions = [],
  marginTier = 'ALL',
  onMarginTierChange,
  classificationFilter = 'ALL',
  onClassificationChange,
  searchTerm = '',
  onSearchChange,
  metricMode = 'revenue',
  onMetricModeChange,
  viewLayout = 'COCKPIT',
  onViewLayoutChange,
  onRefresh,
  loading = false
}) => {
  const PERIOD_OPTIONS = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: "Y'day" },
    { id: 'this_week', label: 'This Week' },
    { id: 'past_week', label: 'Past Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'past_month', label: 'Past Month' },
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' },
    { id: '90d', label: '90D' },
    { id: 'all_time', label: 'All Time' },
    { id: 'custom', label: 'Custom Date' }
  ];

  const MARGIN_TIERS = [
    { id: 'ALL', label: 'All Margins' },
    { id: 'HIGH', label: 'High (>20%)' },
    { id: 'HEALTHY', label: 'Healthy (10-20%)' },
    { id: 'SLIM', label: 'Slim (5-10%)' },
    { id: 'LOSS', label: 'Loss (<0%)' }
  ];

  const CLASSIFICATION_OPTIONS = [
    { id: 'ALL', label: 'All Status' },
    { id: 'WINNER', label: '⭐ Winners' },
    { id: 'STEADY', label: '📦 Steady' },
    { id: 'DECLINING', label: '📉 Declining' },
    { id: 'ZERO_MOVER', label: '❄️ Dead Stock' },
    { id: 'OUT_OF_STOCK', label: '⚪ Unstocked' }
  ];

  return (
    <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-md space-y-2 select-none">
      {/* Top Row: Temporal Slicers + Metric Mode + View Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Temporal Quick Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
            {PERIOD_OPTIONS.map((opt) => {
              const isActive = period.toLowerCase() === opt.id.toLowerCase();
              return (
                <button
                  key={opt.id}
                  onClick={() => onPeriodChange(opt.id)}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Pickers */}
          {period.toLowerCase() === 'custom' && (
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <input
                type="date"
                value={customStartDate || ''}
                onChange={(e) => onCustomStartDateChange(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
              />
              <span className="text-slate-400">→</span>
              <input
                type="date"
                value={customEndDate || ''}
                onChange={(e) => onCustomEndDateChange(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Metric Mode Toggle & View Layout Toggle */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Metric Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60 text-[11px]">
            <button
              onClick={() => onMetricModeChange('revenue')}
              className={`px-2 py-1 rounded-md font-bold transition-all ${
                metricMode === 'revenue'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Revenue (₹)
            </button>
            <button
              onClick={() => onMetricModeChange('profit')}
              className={`px-2 py-1 rounded-md font-bold transition-all ${
                metricMode === 'profit'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Profit (₹)
            </button>
            <button
              onClick={() => onMetricModeChange('volume')}
              className={`px-2 py-1 rounded-md font-bold transition-all ${
                metricMode === 'volume'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Volume (KG/Pkt)
            </button>
          </div>

          {/* View Layout Toggle */}
          <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <button
              onClick={() => onViewLayoutChange('COCKPIT')}
              title="Full Cockpit: Dual Visual Canvas + Master-Detail Matrix"
              className={`p-1 rounded-md transition-all ${
                viewLayout === 'COCKPIT'
                  ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewLayoutChange('TABLE')}
              title="Focus Matrix: Expanded Data Grid"
              className={`p-1 rounded-md transition-all ${
                viewLayout === 'TABLE'
                  ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              title="Refresh Analytics Dataset"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Slicer Dropdowns (Category, Margin Tier, Classification, Search) */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-xs">
        {/* Category Slicer */}
        <div className="flex items-center gap-1.5 min-w-[160px]">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-amber-500 text-xs"
          >
            <option value="ALL">All Categories ({categoryOptions.length})</option>
            {categoryOptions.map((cat) => (
              <option key={cat.name} value={cat.name}>
                {cat.name} ({cat.count})
              </option>
            ))}
          </select>
        </div>

        {/* Margin Tier Slicer */}
        <div className="flex items-center gap-1.5 min-w-[130px]">
          <Percent className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={marginTier}
            onChange={(e) => onMarginTierChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-amber-500 text-xs"
          >
            {MARGIN_TIERS.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.label}
              </option>
            ))}
          </select>
        </div>

        {/* Velocity Status Slicer */}
        <div className="flex items-center gap-1.5 min-w-[130px]">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={classificationFilter}
            onChange={(e) => onClassificationChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-amber-500 text-xs"
          >
            {CLASSIFICATION_OPTIONS.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search Slicer */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search SKU, item, or brand..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-7 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
