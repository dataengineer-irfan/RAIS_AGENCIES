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
  X
} from 'lucide-react';
import { analyticsApi } from '../services/api';
import { getProductVisualIcon, ProductVisualBadge } from '../utils/productIcons';

export const ProductPerformanceMatrix = ({ onSelectProduct }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, WINNER, STEADY, DECLINING, ZERO_MOVER, OUT_OF_STOCK
  const [viewMode, setViewMode] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'MATRIX' : 'TABLE'
  ); // Responsive default: MATRIX for mobile/tablet, TABLE for desktop
  const [searchTerm, setSearchTerm] = useState('');
  
  // Interactive Column Sorting State
  const [sortColumn, setSortColumn] = useState('revenue_30d'); // Default: Highest 30d Revenue
  const [sortDirection, setSortDirection] = useState('desc'); // 'desc' | 'asc'

  useEffect(() => {
    fetchMatrix();
  }, []);

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const res = await analyticsApi.getProductMatrix();
      setData(res);
    } catch (err) {
      console.error('Failed to load product performance matrix:', err);
    } finally {
      setLoading(false);
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

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];

    // 1. Filter by Active Tab & Search Term
    const filtered = data.items.filter(item => {
      const matchesTab = activeTab === 'ALL' || item.classification === activeTab;
      const term = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
                            item.name.toLowerCase().includes(term) || 
                            item.sku.toLowerCase().includes(term) || 
                            (item.brand && item.brand.toLowerCase().includes(term)) || 
                            (item.category_name && item.category_name.toLowerCase().includes(term));
      return matchesTab && matchesSearch;
    });

    // 2. Multi-Column Sort
    if (!sortColumn) return filtered;

    return [...filtered].sort((a, b) => {
      let valA = a[sortColumn];
      let valB = b[sortColumn];

      if (valA === undefined || valA === null) valA = 0;
      if (valB === undefined || valB === null) valB = 0;

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB);
        return sortDirection === 'asc' ? cmp : -cmp;
      }

      const numA = Number(valA);
      const numB = Number(valB);
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });
  }, [data, activeTab, searchTerm, sortColumn, sortDirection]);

  const renderSortHeader = (label, columnKey, alignRight = false) => {
    const isCurrent = sortColumn === columnKey;
    return (
      <th 
        onClick={() => handleSort(columnKey)}
        className={`py-2 px-2.5 cursor-pointer select-none transition-colors group ${
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
      
      {/* ─── COMMAND RIBBON (SEARCH + FILTER PILLS + SORT SELECT + VIEW TOGGLE) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        
        {/* Left: Title & SKU Count */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <h2 className="text-xs sm:text-sm font-black text-white truncate">
              Product Intelligence
            </h2>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-slate-950 text-slate-300 border border-slate-800 shrink-0">
              {data.total_skus} SKUs
            </span>
          </div>
        </div>

        {/* Center: 1-Click Classification Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 overflow-x-auto no-scrollbar shrink-0">
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

        {/* Right: Sort Dropdown + Search + View Switcher */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
          {/* Quick Sort Dropdown */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 shrink-0 text-slate-400">
            <ArrowUpDown className="w-3 h-3 text-amber-400 shrink-0" />
            <select
              value={`${sortColumn}-${sortDirection}`}
              onChange={(e) => {
                const [col, dir] = e.target.value.split('-');
                setSortColumn(col);
                setSortDirection(dir);
              }}
              className="bg-transparent text-slate-300 text-[11px] font-bold focus:outline-none cursor-pointer py-0.5"
              title="Sort products"
            >
              <option value="revenue_30d-desc" className="bg-slate-900 text-white">₹ Highest Revenue</option>
              <option value="revenue_30d-asc" className="bg-slate-900 text-white">₹ Lowest Revenue</option>
              <option value="profit_30d-desc" className="bg-slate-900 text-white">💎 Highest Margin (₹ Value)</option>
              <option value="profit_30d-asc" className="bg-slate-900 text-white">💎 Lowest Margin (₹ Value)</option>
              <option value="margin_pct-desc" className="bg-slate-900 text-white">📊 Highest Margin %</option>
              <option value="margin_pct-asc" className="bg-slate-900 text-white">📊 Lowest Margin %</option>
              <option value="units_sold_30d-desc" className="bg-slate-900 text-white">📦 Highest Units Sold</option>
              <option value="units_sold_30d-asc" className="bg-slate-900 text-white">📦 Lowest Units Sold</option>
              <option value="stock_holding_value-desc" className="bg-slate-900 text-white">💰 Highest Holding Val</option>
              <option value="stock_holding_units-desc" className="bg-slate-900 text-white">🏭 Highest Stock</option>
              <option value="trend_pct-desc" className="bg-slate-900 text-white">📈 Fastest Growing</option>
              <option value="trend_pct-asc" className="bg-slate-900 text-white">📉 Steepest Decline</option>
              <option value="name-asc" className="bg-slate-900 text-white">🔤 Product Name (A-Z)</option>
              <option value="category_name-asc" className="bg-slate-900 text-white">🏷️ Category (A-Z)</option>
            </select>
          </div>

          <div className="relative w-36 sm:w-44 min-w-0">
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

      {/* ─── DATA VIEW (flex-1 min-h-0 overflow-y-auto) ─── */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs space-y-1">
            <Package className="w-8 h-8 mx-auto text-slate-600" />
            <p>No products match this filter or search query.</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-2.5 py-0.5 bg-slate-800 text-amber-400 rounded-lg text-xs font-bold mt-1"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : viewMode === 'TABLE' ? (
          /* TABLE VIEW (HIGH DENSITY) */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-950 z-10 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                <tr>
                  {renderSortHeader('SKU & Item', 'name')}
                  {renderSortHeader('Category', 'category_name')}
                  {renderSortHeader('Status', 'classification')}
                  {renderSortHeader('30d Sold', 'units_sold_30d', true)}
                  {renderSortHeader('30d Revenue', 'revenue_30d', true)}
                  {renderSortHeader('30d Margin', 'profit_30d', true)}
                  {renderSortHeader('MoM Trend', 'trend_pct', true)}
                  {renderSortHeader('Current Stock', 'stock_holding_units', true)}
                  {renderSortHeader('Holding Val', 'stock_holding_value', true)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredItems.map(item => {
                  return (
                    <tr 
                      key={item.product_id}
                      onClick={() => onSelectProduct && onSelectProduct(item)}
                      className="hover:bg-slate-950/60 cursor-pointer transition-colors"
                    >
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
                      <td className="py-2 px-2.5 text-right whitespace-nowrap">
                        {item.units_sold_30d > 0 ? (
                          <>
                            <div className={`font-mono font-bold text-xs ${
                              (item.profit_30d || 0) > 0 
                                ? 'text-emerald-400' 
                                : (item.profit_30d || 0) < 0 
                                  ? 'text-rose-400' 
                                  : 'text-slate-300'
                            }`}>
                              {(item.profit_30d || 0) > 0 ? '+' : ''}₹{parseFloat(item.profit_30d || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                              <span className={`font-bold ${
                                (item.margin_pct || 0) >= 20 ? 'text-emerald-400' : (item.margin_pct || 0) >= 10 ? 'text-amber-400' : 'text-slate-400'
                              }`}>
                                {parseFloat(item.margin_pct || 0).toFixed(1)}%
                              </span>
                              <span className="text-[9px] text-slate-500">margin</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-right">
                            <span className="text-slate-600 font-mono text-xs">—</span>
                            <div className="text-[9px] font-mono text-slate-500">
                              {parseFloat(item.margin_pct || 0).toFixed(0)}% base
                            </div>
                          </div>
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
            {filteredItems.map(item => {
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
                      <ProductVisualBadge product={item} size="md" />
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-xs truncate">{item.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          {item.sku} • {item.brand || item.category_name}
                        </p>
                      </div>
                    </div>
                    {renderStatusBadge(item.classification)}
                  </div>

                  <div className="grid grid-cols-4 gap-1 mt-2 pt-2 border-t border-slate-900 text-[10px]">
                    <div>
                      <span className="text-slate-500 block truncate">30d Sold:</span>
                      <div className="font-mono font-bold text-white truncate">{item.units_sold_30d}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 block truncate">Revenue:</span>
                      <div className="font-mono font-bold text-amber-400 truncate">₹{(item.revenue_30d/1000).toFixed(1)}k</div>
                    </div>
                    <div>
                      <span className="text-slate-500 block truncate">Margin:</span>
                      <div className={`font-mono font-bold truncate ${
                        (item.profit_30d || 0) > 0 ? 'text-emerald-400' : (item.profit_30d || 0) < 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {item.units_sold_30d > 0 ? (
                          <>
                            ₹{(item.profit_30d/1000).toFixed(1)}k <span className="text-[9px] font-normal opacity-80">({item.margin_pct}%)</span>
                          </>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 block truncate">Stock:</span>
                      <div className="font-mono font-bold text-slate-300 truncate">{item.stock_holding_units}</div>
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
