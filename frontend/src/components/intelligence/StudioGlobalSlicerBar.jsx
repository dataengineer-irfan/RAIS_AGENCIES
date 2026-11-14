import React from 'react';
import { 
  Calendar, 
  Filter, 
  Search, 
  RefreshCw, 
  Layers, 
  Percent, 
  LayoutDashboard, 
  Table as TableIcon,
  PieChart,
  X,
  TrendingUp,
  Tag
} from 'lucide-react';

/**
 * StudioGlobalSlicerBar - Power BI 2026 Universal Visual Slicer Ribbon
 * Visual chiclets, period buttons, and multi-layout workspace controllers.
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
    { id: 'custom', label: 'Custom' }
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
    { id: 'ZERO_MOVER', label: '❄️ Dead Stock' }
  ];

  const VIEW_MODES = [
    { id: 'COCKPIT', label: 'Visual Cockpit', icon: LayoutDashboard },
    { id: 'VISUALS', label: 'Executive Charts', icon: PieChart },
    { id: 'TABLE', label: 'Data Grid', icon: TableIcon }
  ];

  return (
    <div className="shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl p-2 sm:p-2.5 shadow-sm space-y-2 select-none">
      
      {/* Row 1: Temporal Horizon Buttons + View Mode Switcher + Metric Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        
        {/* Temporal Quick Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
            {PERIOD_OPTIONS.map((opt) => {
              const isActive = period.toLowerCase() === opt.id.toLowerCase();
              return (
                <button
                  key={opt.id}
                  onClick={() => onPeriodChange(opt.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
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
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px]">
              <Calendar className="w-3 h-3 text-amber-500" />
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

        {/* View Modes Toggle & Metric Mode */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* View Modes (Visual Cockpit vs Executive Charts vs Data Grid) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60 text-[11px]">
            {VIEW_MODES.map((vm) => {
              const Icon = vm.icon;
              const isCurrent = viewLayout === vm.id;
              return (
                <button
                  key={vm.id}
                  onClick={() => onViewLayoutChange(vm.id)}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded font-bold transition-all ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{vm.label}</span>
                </button>
              );
            })}
          </div>

          {/* Metric Mode Toggle */}
          <div className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60 text-[11px]">
            <button
              onClick={() => onMetricModeChange('revenue')}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                metricMode === 'revenue'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Revenue (₹)
            </button>
            <button
              onClick={() => onMetricModeChange('profit')}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                metricMode === 'profit'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Profit (₹)
            </button>
            <button
              onClick={() => onMetricModeChange('volume')}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                metricMode === 'volume'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Volume (KG)
            </button>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 transition-colors"
              title="Refresh Analytics Dataset"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Category Visual Chiclets Ribbon (Click to filter like real Power BI) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Layers className="w-3 h-3 text-amber-500" /> Slicers:
        </span>

        {/* All Categories Pill */}
        <button
          onClick={() => onCategoryChange('ALL')}
          className={`px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border shrink-0 ${
            selectedCategory === 'ALL'
              ? 'bg-amber-500 text-slate-950 border-amber-500 font-black shadow-sm'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
          }`}
        >
          All Categories ({categoryOptions.reduce((s, c) => s + c.count, 0)})
        </button>

        {/* Dynamic Category Chiclet Pills */}
        {categoryOptions.map((cat) => {
          const isSelected = selectedCategory === cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => onCategoryChange(isSelected ? 'ALL' : cat.name)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border shrink-0 flex items-center gap-1 ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 border-amber-500 font-black shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
              }`}
            >
              <span>{cat.name}</span>
              <span className={`text-[10px] px-1 py-0.1 rounded-full ${
                isSelected ? 'bg-slate-950 text-amber-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}>
                {cat.count}
              </span>
            </button>
          );
        })}

        {/* Search Slicer (Always pinned on right) */}
        <div className="relative min-w-[140px] ml-auto shrink-0">
          <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search SKU..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-6 pr-5 py-0.5 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
