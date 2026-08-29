import React from 'react';
import { Filter, Calendar, Users, Package, RefreshCw, ChevronDown, SlidersHorizontal } from 'lucide-react';

export const GlobalFilterBar = ({ 
  filters, 
  onFilterChange, 
  onResetFilters,
  categories = [],
  customers = []
}) => {
  return (
    <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 -mx-4 sm:-mx-8 mb-6 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Filter Slicers Title & Active Badge */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Global Slicers
          </span>
          <span className="text-[10px] font-semibold bg-slate-800 text-amber-400 px-2 py-0.5 rounded-full border border-slate-700 font-mono">
            Synced Dashboard View
          </span>
        </div>

        {/* Center: Dropdown Slicers */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* 1. Date Range Preset */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-amber-500 mr-2 shrink-0" />
            <select
              value={filters.dateRange || 'THIS_MONTH'}
              onChange={(e) => onFilterChange('dateRange', e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="TODAY" className="bg-slate-900">Today</option>
              <option value="THIS_WEEK" className="bg-slate-900">This Week</option>
              <option value="THIS_MONTH" className="bg-slate-900">This Month (August 2026)</option>
              <option value="LAST_30_DAYS" className="bg-slate-900">Trailing 30 Days</option>
              <option value="LAST_90_DAYS" className="bg-slate-900">Trailing 90 Days</option>
              <option value="ALL_TIME" className="bg-slate-900">All Time</option>
            </select>
          </div>

          {/* 2. Customer Slicer */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <Users className="w-3.5 h-3.5 text-amber-500 mr-2 shrink-0" />
            <select
              value={filters.customerId || 'ALL'}
              onChange={(e) => onFilterChange('customerId', e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="ALL" className="bg-slate-900">All Customers</option>
              {customers.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900">{c.business_name || c.name}</option>
              ))}
            </select>
          </div>

          {/* 3. Category Slicer */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <Package className="w-3.5 h-3.5 text-amber-500 mr-2 shrink-0" />
            <select
              value={filters.categoryId || 'ALL'}
              onChange={(e) => onFilterChange('categoryId', e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer max-w-[130px] truncate"
            >
              <option value="ALL" className="bg-slate-900">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id} className="bg-slate-900">{cat.name}</option>
              ))}
            </select>
          </div>

          {/* 4. Baseline Comparison Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <span className="text-[11px] text-slate-400 mr-1.5 font-bold">Compare:</span>
            <select
              value={filters.compareTo || 'LAST_MONTH'}
              onChange={(e) => onFilterChange('compareTo', e.target.value)}
              className="bg-transparent text-xs font-semibold text-amber-400 focus:outline-none cursor-pointer"
            >
              <option value="LAST_MONTH" className="bg-slate-900">vs Last Month</option>
              <option value="TARGET" className="bg-slate-900">vs Target Goal</option>
              <option value="LAST_YEAR" className="bg-slate-900">vs Same Month Last Year</option>
            </select>
          </div>
        </div>

        {/* Right: Reset Button */}
        <button
          onClick={onResetFilters}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all"
        >
          <RefreshCw className="w-3 h-3" />
          Reset Slicers
        </button>
      </div>
    </div>
  );
};
