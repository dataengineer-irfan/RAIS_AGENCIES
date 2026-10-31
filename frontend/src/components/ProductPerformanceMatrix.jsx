import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Snowflake, 
  Award, 
  TrendingDown, 
  Layers, 
  Table as TableIcon, 
  Grid, 
  Search, 
  Package, 
  ArrowUpRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Filter,
  Calendar
} from 'lucide-react';
import { analyticsApi } from '../services/api';
import { getProductVisualIcon, ProductVisualBadge } from '../utils/productIcons';

export const ProductPerformanceMatrix = ({ onSelectProduct, dateRange = '30d', onDateRangeChange }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, WINNER, STEADY, DECLINING, ZERO_MOVER, OUT_OF_STOCK
  const [selectedCategory, setSelectedCategory] = useState('ALL'); // ALL, or specific category name
  const [selectedPeriod, setSelectedPeriod] = useState(dateRange || '30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [viewMode, setViewMode] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'MATRIX' : 'TABLE'
  ); // Responsive default: MATRIX for mobile/tablet, TABLE for desktop
  const [searchTerm, setSearchTerm] = useState('');
  
  // Interactive Column Sorting State
  const [sortColumn, setSortColumn] = useState('revenue_30d'); // Default: Highest Revenue
  const [sortDirection, setSortDirection] = useState('desc'); // 'desc' | 'asc'

  // Sync with incoming parent dateRange prop
  useEffect(() => {
    if (dateRange) {
      let normalized = dateRange.toLowerCase();
      if (normalized === 'last_week') normalized = 'past_week';
      if (normalized === 'last_month') normalized = 'past_month';
      if (normalized !== selectedPeriod.toLowerCase()) {
        setSelectedPeriod(normalized);
      }
    }
  }, [dateRange]);

  const fetchMatrix = async (periodToUse = selectedPeriod, startDate = customStartDate, endDate = customEndDate) => {
    setLoading(true);
    try {
      const params = { period: periodToUse };
      if (periodToUse === 'custom' && startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      const res = await analyticsApi.getProductMatrix(params);
      setData(res);
    } catch (err) {
      console.error('Failed to load product performance matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix(selectedPeriod, customStartDate, customEndDate);
  }, [selectedPeriod]);

  const handlePeriodChange = (newPeriod) => {
    setSelectedPeriod(newPeriod);
    if (onDateRangeChange) {
      const parentPeriod = newPeriod === 'past_week' ? 'last_week' : (newPeriod === 'past_month' ? 'last_month' : newPeriod);
      onDateRangeChange(parentPeriod);
    }
  };

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

  const categoryOptions = useMemo(() => {
    if (!data?.items) return [];
    const counts = {};
    data.items.forEach(item => {
      const cat = item.category_name || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.keys(counts)
      .sort((a, b) => a.localeCompare(b))
      .map(name => ({
        name,
        count: counts[name]
      }));
  }, [data]);

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];

    // 1. Filter by Active Tab, Category & Search Term
    const filtered = data.items.filter(item => {
      const matchesTab = activeTab === 'ALL' || item.classification === activeTab;
      const matchesCategory = selectedCategory === 'ALL' || item.category_name === selectedCategory;
      const term = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
                            item.name.toLowerCase().includes(term) || 
                            item.sku.toLowerCase().includes(term) || 
                            (item.brand && item.brand.toLowerCase().includes(term)) || 
                            (item.category_name && item.category_name.toLowerCase().includes(term));
      return matchesTab && matchesCategory && matchesSearch;
    });

    // 2. Multi-Column Sort
    if (!sortColumn) return filtered;

    return [...filtered].sort((a, b) => {
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
      // Deterministic tie-breaker: rank higher absolute profit, then higher revenue
      const profitA = Number(a.profit_30d) || 0;
      const profitB = Number(b.profit_30d) || 0;
      if (profitA !== profitB) return profitB - profitA;
      const revA = Number(a.revenue_30d) || 0;
      const revB = Number(b.revenue_30d) || 0;
      return revB - revA;
    });
  }, [data, activeTab, selectedCategory, searchTerm, sortColumn, sortDirection]);

  const periodDisplayLabel = useMemo(() => {
    if (data?.period_label) return data.period_label;
    const map = {
      today: 'Today',
      yesterday: "Y'day",
      this_week: 'This Week',
      past_week: 'Past Week',
      this_month: 'This Month',
      past_month: 'Past Month',
      last_7d: '7d',
      '7d': '7d',
      last_30d: '30d',
      '30d': '30d',
      last_60d: '60d',
      '60d': '60d',
      last_90d: '90d',
      '90d': '90d',
      all_time: 'All Time',
      all: 'All Time'
    };
    return map[selectedPeriod?.toLowerCase()] || '30d';
  }, [data?.period_label, selectedPeriod]);

  const renderSortHeader = (label, columnKey, alignRight = false) => {
    const isCurrent = sortColumn === columnKey;
    return (
      <th 
        onClick={() => handleSort(columnKey)}
        className={`py-2 px-2.5 cursor-pointer select-none transition-colors group whitespace-nowrap ${
          alignRight ? 'text-right' : 'text-left'
        } ${isCurrent ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-white'}`}
        title={`Sort by ${label} (${isCurrent && sortDirection === 'desc' ? 'Ascending' : 'Descending'})`}
      >
        <div className={`flex items-center gap-1 ${alignRight ? 'justify-end' : 'justify-start'}`}>
          <span>{label}</span>
          <span className="shrink-0">
            {isCurrent ? (
              sortDirection === 'desc' ? (
                <ArrowDown className="w-3 h-3 text-amber-400 inline" />
              ) : (
                <ArrowUp className="w-3 h-3 text-amber-400 inline" />
              )
            ) : (
              <ArrowUpDown className="w-2.5 h-2.5 opacity-0 group-hover:opacity-40 transition-opacity inline" />
            )}
          </span>
        </div>
      </th>
    );
  };

  const renderStatusBadge = (classification) => {
    switch (classification) {
      case 'WINNER':
        return (
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
            ⭐ WINNER
          </span>
        );
      case 'STEADY':
        return (
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border bg-amber-500/20 text-amber-300 border-amber-500/40">
            📦 STEADY
          </span>
        );
      case 'DECLINING':
        return (
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border bg-orange-500/20 text-orange-300 border-orange-500/40">
            📉 DECLINING
          </span>
        );
      case 'ZERO_MOVER':
        return (
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border bg-rose-500/20 text-rose-300 border-rose-500/40">
            ❄️ DEAD STOCK
          </span>
        );
      case 'OUT_OF_STOCK':
        return (
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border bg-slate-700/40 text-slate-400 border-slate-700">
            ⚪ UNSTOCKED
          </span>
        );
      default:
        return (
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border bg-slate-800 text-slate-400 border-slate-700">
            {classification?.replace('_', ' ') || 'ACTIVE'}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl animate-pulse space-y-3 h-full flex flex-col">
        <div className="h-8 bg-slate-800/60 rounded-xl"></div>
        <div className="h-10 bg-slate-800/40 rounded-xl"></div>
        <div className="space-y-2 flex-1">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-12 bg-slate-800/30 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-xl flex flex-col h-full overflow-hidden gap-2 animate-fadeIn">
      
      {/* ─── COMMAND RIBBON (TIER 1: TITLE & CLASSIFICATION TABS | TIER 2: CATEGORY & SORT SLICERS + SEARCH + VIEW TOGGLE) ─── */}
      <div className="flex flex-col gap-2 shrink-0">
        
        {/* Tier 1: Title & Classification Pills */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          {/* Left: Title & SKU Count */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <h2 className="text-xs sm:text-sm font-black text-white whitespace-nowrap">
                Product Intelligence
              </h2>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800 shrink-0">
                {filteredItems.length === data.total_skus 
                  ? `${data.total_skus} SKUs` 
                  : `${filteredItems.length} of ${data.total_skus} SKUs`}
              </span>
            </div>
          </div>

          {/* Right: 1-Click Classification Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 overflow-x-auto no-scrollbar scroll-smooth pr-4 shrink-0">
            {[
              { id: 'ALL', label: `All (${data.total_skus})`, activeClass: 'bg-amber-500 text-slate-950' },
              { id: 'WINNER', label: `⭐ Winners (${data?.winners_count ?? 0})`, activeClass: 'bg-emerald-500 text-white' },
              { id: 'STEADY', label: `📦 Steady (${data?.steady_count ?? 0})`, activeClass: 'bg-amber-500 text-slate-950' },
              { id: 'DECLINING', label: `📉 Declining (${data?.declining_count ?? 0})`, activeClass: 'bg-orange-500 text-white' },
              { 
                id: 'ZERO_MOVER', 
                label: data.total_dead_stock_value > 0 
                  ? `❄️ Dead Stock (${data?.zero_movers_count ?? 0}) • ₹${Math.round(data.total_dead_stock_value/1000)}k` 
                  : `❄️ Dead Stock (${data?.zero_movers_count ?? 0})`, 
                activeClass: 'bg-rose-500 text-white' 
              },
              ...(data?.out_of_stock_count > 0 ? [
                { id: 'OUT_OF_STOCK', label: `⚪ Unstocked (${data.out_of_stock_count})`, activeClass: 'bg-slate-700 text-slate-200' }
              ] : [])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-all shrink-0 ${
                  activeTab === tab.id
                    ? `${tab.activeClass} shadow-sm font-black`
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tier 2: Category Filter + Quick Sort + Date Filter + Search + View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-1 border-t border-slate-800/60">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 flex-1 min-w-0">
            {/* Category Filter Dropdown */}
            <div className={`flex items-center gap-1 border rounded-lg px-2 py-1 transition-colors min-w-0 sm:max-w-[190px] ${
              selectedCategory !== 'ALL' 
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300' 
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}>
              <Filter className={`w-3 h-3 shrink-0 ${selectedCategory !== 'ALL' ? 'text-amber-400' : 'text-slate-400'}`} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-slate-300 text-[11px] font-bold focus:outline-none cursor-pointer py-0.5 truncate w-full"
                title="Filter by Category"
              >
                <option value="ALL" className="bg-slate-900 text-white">
                  🏷️ All Categories ({data.total_skus || data.items.length})
                </option>
                {categoryOptions.map(cat => (
                  <option key={cat.name} value={cat.name} className="bg-slate-900 text-white">
                    {cat.name} ({cat.count})
                  </option>
                ))}
              </select>
              {selectedCategory !== 'ALL' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCategory('ALL');
                  }}
                  className="text-amber-400 hover:text-white p-0.5 shrink-0"
                  title="Clear Category Filter"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            {/* Quick Sort Dropdown */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-400 min-w-0 sm:max-w-[170px]">
              <ArrowUpDown className="w-3 h-3 text-amber-400 shrink-0" />
              <select
                value={`${sortColumn}-${sortDirection}`}
                onChange={(e) => {
                  const [col, dir] = e.target.value.split('-');
                  setSortColumn(col);
                  setSortDirection(dir);
                }}
                className="bg-transparent text-slate-300 text-[11px] font-bold focus:outline-none cursor-pointer py-0.5 truncate w-full"
                title="Sort products"
              >
                <option value="margin_pct-desc" className="bg-slate-900 text-white">📊 Highest Margin %</option>
                <option value="margin_pct-asc" className="bg-slate-900 text-white">📊 Lowest Margin %</option>
                <option value="profit_30d-desc" className="bg-slate-900 text-white">💎 Highest Profit (₹)</option>
                <option value="profit_30d-asc" className="bg-slate-900 text-white">💎 Lowest Profit (₹)</option>
                <option value="revenue_30d-desc" className="bg-slate-900 text-white">₹ Highest Revenue</option>
                <option value="revenue_30d-asc" className="bg-slate-900 text-white">₹ Lowest Revenue</option>
                <option value="units_sold_30d-desc" className="bg-slate-900 text-white">📦 Highest Units Sold</option>
                <option value="units_sold_30d-asc" className="bg-slate-900 text-white">📦 Lowest Units Sold</option>
                <option value="trend_pct-desc" className="bg-slate-900 text-white">📈 Fastest Growing</option>
                <option value="trend_pct-asc" className="bg-slate-900 text-white">📉 Steepest Decline</option>
                <option value="stock_holding_value-desc" className="bg-slate-900 text-white">💰 Highest Holding Val</option>
                <option value="stock_holding_units-desc" className="bg-slate-900 text-white">🏭 Highest Stock</option>
                <option value="name-asc" className="bg-slate-900 text-white">🔤 Product Name (A-Z)</option>
                <option value="category_name-asc" className="bg-slate-900 text-white">🏷️ Category (A-Z)</option>
              </select>
            </div>

            {/* 📅 Date / Period Filter Dropdown (PURPLE CIRCLED LOCATION) */}
            <div className={`flex items-center gap-1 border rounded-lg px-2 py-1 transition-colors min-w-0 sm:max-w-[170px] ${
              selectedPeriod !== '30d' && selectedPeriod !== 'last_30d'
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300' 
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}>
              <Calendar className={`w-3 h-3 shrink-0 ${selectedPeriod !== '30d' && selectedPeriod !== 'last_30d' ? 'text-amber-400' : 'text-slate-400'}`} />
              <select
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="bg-transparent text-slate-300 text-[11px] font-bold focus:outline-none cursor-pointer py-0.5 truncate w-full"
                title="Filter by Date Period"
              >
                <option value="today" className="bg-slate-900 text-white">📅 Today</option>
                <option value="yesterday" className="bg-slate-900 text-white">📅 Yesterday</option>
                <option value="this_week" className="bg-slate-900 text-white">📅 This Week</option>
                <option value="past_week" className="bg-slate-900 text-white">📅 Past Week</option>
                <option value="this_month" className="bg-slate-900 text-white">📅 This Month</option>
                <option value="past_month" className="bg-slate-900 text-white">📅 Past Month</option>
                <option value="last_7d" className="bg-slate-900 text-white">📅 Last 7 Days</option>
                <option value="30d" className="bg-slate-900 text-white">📅 Last 30 Days</option>
                <option value="last_60d" className="bg-slate-900 text-white">📅 Last 60 Days</option>
                <option value="last_90d" className="bg-slate-900 text-white">📅 Last 90 Days</option>
                <option value="all_time" className="bg-slate-900 text-white">📅 All Time</option>
                <option value="custom" className="bg-slate-900 text-white">📅 Custom Dates...</option>
              </select>
            </div>

            {/* Custom Date Range Inline Controls (visible when 'custom' is selected) */}
            {selectedPeriod === 'custom' && (
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-slate-300 text-xs shrink-0">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-slate-200 text-[10px] font-mono focus:outline-none"
                  title="Start Date"
                />
                <span className="text-slate-500 text-[10px]">-</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-slate-200 text-[10px] font-mono focus:outline-none"
                  title="End Date"
                />
                <button
                  type="button"
                  onClick={() => fetchMatrix('custom', customStartDate, customEndDate)}
                  className="px-1.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[10px] transition-colors"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
            {/* Search SKU */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search SKU..."
                className="w-full pl-8 pr-6 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* View Switcher */}
            <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 shrink-0">
              <button
                onClick={() => setViewMode('TABLE')}
                className={`p-1 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'TABLE' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="High-Density Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('MATRIX')}
                className={`p-1 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'MATRIX' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Card Matrix View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── DATA VIEW (flex-1 min-h-0 overflow-y-auto) ─── */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-28 md:pb-4">
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs space-y-1">
            <Package className="w-8 h-8 mx-auto text-slate-600" />
            <p>No products match this filter or search query.</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              {selectedCategory !== 'ALL' && (
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className="px-2.5 py-0.5 bg-slate-800 text-amber-400 rounded-lg text-xs font-bold"
                >
                  Clear Category ({selectedCategory})
                </button>
              )}
              {activeTab !== 'ALL' && (
                <button
                  onClick={() => setActiveTab('ALL')}
                  className="px-2.5 py-0.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold"
                >
                  Clear Classification
                </button>
              )}
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-2.5 py-0.5 bg-slate-800 text-amber-400 rounded-lg text-xs font-bold"
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'TABLE' ? (
          /* TABLE VIEW (HIGH DENSITY) */
          <div className="overflow-x-auto custom-scrollbar touch-pan-x border border-slate-800/60 rounded-lg">
            <table className="min-w-[850px] w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-950 z-10 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                <tr>
                  <th className="py-2 px-2 text-center text-slate-500 w-9 whitespace-nowrap">#</th>
                  {renderSortHeader('SKU & Item', 'name')}
                  {renderSortHeader('Category', 'category_name')}
                  {renderSortHeader('Status', 'classification')}
                  {renderSortHeader(`${periodDisplayLabel} Sold`, 'units_sold_30d', true)}
                  {renderSortHeader(`${periodDisplayLabel} Revenue`, 'revenue_30d', true)}
                  {renderSortHeader(`${periodDisplayLabel} Profit (₹)`, 'profit_30d', true)}
                  {renderSortHeader('Margin %', 'margin_pct', true)}
                  {renderSortHeader(selectedPeriod === 'today' ? 'vs Y\'day' : (selectedPeriod === 'this_month' ? 'MoM Trend' : 'Trend'), 'trend_pct', true)}
                  {renderSortHeader('Current Stock', 'stock_holding_units', true)}
                  {renderSortHeader('Holding Val', 'stock_holding_value', true)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredItems.map((item, idx) => {
                  return (
                    <tr 
                      key={item.product_id}
                      onClick={() => onSelectProduct && onSelectProduct(item)}
                      className="hover:bg-slate-950/60 cursor-pointer transition-colors"
                    >
                      {/* Dynamic Rank Badge */}
                      <td className="py-2 px-2 text-center font-mono font-bold text-xs whitespace-nowrap">
                        {idx === 0 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px]" title="Rank #1">
                            1
                          </span>
                        ) : idx === 1 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/40 text-[10px]" title="Rank #2">
                            2
                          </span>
                        ) : idx === 2 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/40 text-[10px]" title="Rank #3">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px] font-normal">
                            {idx + 1}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2.5">
                        <div className="flex items-center gap-2">
                          <ProductVisualBadge product={item} size="sm" />
                          <div className="min-w-0">
                            <span className="font-bold text-white block truncate max-w-[150px] sm:max-w-[220px]">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.sku} {item.brand ? `• ${item.brand}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2.5 text-slate-400 text-[11px] whitespace-nowrap">
                        {item.category_name}
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        {renderStatusBadge(item.classification)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-white whitespace-nowrap">
                        {item.units_sold_30d} {item.packaging_unit || 'packs'}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-amber-400 whitespace-nowrap">
                        ₹{parseFloat(item.revenue_30d || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      {/* Dedicated 30d Profit (₹) column */}
                      <td className="py-2 px-2.5 text-right font-mono font-bold whitespace-nowrap">
                        {(item.units_sold_30d || 0) > 0 ? (
                          <span className={
                            (item.profit_30d || 0) > 0 
                              ? 'text-emerald-400' 
                              : (item.profit_30d || 0) < 0 
                                ? 'text-rose-400' 
                                : 'text-slate-300'
                          }>
                            {(item.profit_30d || 0) > 0 ? '+' : ''}₹{parseFloat(item.profit_30d || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono text-xs">—</span>
                        )}
                      </td>
                      {/* Dedicated Margin % column */}
                      <td className="py-2 px-2.5 text-right font-mono whitespace-nowrap">
                        {(item.units_sold_30d || 0) > 0 ? (
                          <div className="flex items-center justify-end">
                            <span className={`font-black text-xs px-2 py-0.5 rounded-md ${
                              (item.margin_pct || 0) >= 20 
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                : (item.margin_pct || 0) >= 10 
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}>
                              {parseFloat(item.margin_pct || 0).toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {parseFloat(item.margin_pct || 0).toFixed(0)}% base
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold whitespace-nowrap">
                        <span className={item.trend_pct > 0 ? 'text-emerald-400' : item.trend_pct < 0 ? 'text-rose-400' : 'text-slate-400'}>
                          {item.trend_pct > 0 ? '+' : ''}{item.trend_pct}%
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-300 whitespace-nowrap">
                        {item.stock_holding_units}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-white whitespace-nowrap">
                        ₹{parseFloat(item.stock_holding_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* MATRIX / CARD VIEW (COMPACT MOBILE CARDS) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredItems.map((item, idx) => {
              const isWinner = item.classification === 'WINNER';
              const isZeroMover = item.classification === 'ZERO_MOVER';
              const isDeclining = item.classification === 'DECLINING';

              return (
                <div
                  key={item.product_id}
                  onClick={() => onSelectProduct && onSelectProduct(item)}
                  className={`bg-slate-950/70 border rounded-xl p-2.5 cursor-pointer transition-all hover:scale-[1.01] ${
                    isWinner ? 'border-emerald-500/40 hover:border-emerald-500' :
                    isZeroMover ? 'border-rose-500/40 hover:border-rose-500' :
                    isDeclining ? 'border-orange-500/40 hover:border-orange-500' :
                    'border-slate-800 hover:border-amber-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
                        #{idx + 1}
                      </span>
                      <ProductVisualBadge product={item} size="md" />
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-xs truncate">{item.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          {item.sku} • {item.brand || item.category_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {renderStatusBadge(item.classification)}
                      <span className="text-[10px] font-mono text-slate-400">
                        Stock: <span className="font-bold text-slate-200">{item.stock_holding_units}</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 mt-2 pt-2 border-t border-slate-900 text-[10px]">
                    <div>
                      <span className="text-slate-500 block truncate">{periodDisplayLabel} Sold:</span>
                      <div className="font-mono font-bold text-white truncate">{item.units_sold_30d}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 block truncate">Revenue:</span>
                      <div className="font-mono font-bold text-amber-400 truncate">
                        ₹{item.revenue_30d >= 1000 ? `${(item.revenue_30d/1000).toFixed(1)}k` : Math.round(item.revenue_30d)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 block truncate">{periodDisplayLabel} Profit:</span>
                      <div className={`font-mono font-bold truncate ${
                        (item.profit_30d || 0) > 0 ? 'text-emerald-400' : (item.profit_30d || 0) < 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {(item.units_sold_30d || 0) > 0 ? (
                          Math.abs(item.profit_30d || 0) >= 10000 
                            ? `${(item.profit_30d || 0) > 0 ? '+' : ''}₹${((item.profit_30d || 0)/1000).toFixed(1)}k` 
                            : `${(item.profit_30d || 0) > 0 ? '+' : ''}₹${Math.round(item.profit_30d || 0).toLocaleString('en-IN')}`
                        ) : (
                          <span className="text-slate-600 font-normal">—</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 block truncate">Margin %:</span>
                      <div className="font-mono font-bold truncate">
                        {(item.units_sold_30d || 0) > 0 ? (
                          <span className={`text-[11px] font-black ${
                            (item.margin_pct || 0) >= 20 
                              ? 'text-emerald-400' 
                              : (item.margin_pct || 0) >= 10 
                                ? 'text-amber-400' 
                                : 'text-slate-300'
                          }`}>
                            {parseFloat(item.margin_pct || 0).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-600 font-normal">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
