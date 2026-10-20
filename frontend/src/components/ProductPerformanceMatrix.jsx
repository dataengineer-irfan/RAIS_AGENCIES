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
  X
} from 'lucide-react';
import { analyticsApi } from '../services/api';
import { getProductVisualIcon, ProductVisualBadge } from '../utils/productIcons';

export const ProductPerformanceMatrix = ({ onSelectProduct }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, WINNER, STEADY, DECLINING, ZERO_MOVER
  const [viewMode, setViewMode] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'MATRIX' : 'TABLE'
  ); // Responsive default: MATRIX for mobile/tablet, TABLE for desktop
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter(item => {
      const matchesTab = activeTab === 'ALL' || item.classification === activeTab;
      const term = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
                            item.name.toLowerCase().includes(term) || 
                            item.sku.toLowerCase().includes(term) || 
                            (item.brand && item.brand.toLowerCase().includes(term)) || 
                            (item.category_name && item.category_name.toLowerCase().includes(term));
      return matchesTab && matchesSearch;
    });
  }, [data, activeTab, searchTerm]);

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
      
      {/* ─── 46px COMMAND RIBBON (SEARCH + FILTER PILLS + VIEW TOGGLE) ─── */}
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
            }
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

        {/* Right: Search & View Switcher */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
          <div className="relative w-40 sm:w-48 min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search SKU, brand..."
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
                  <th className="py-2 px-2.5">SKU & Item</th>
                  <th className="py-2 px-2.5">Category</th>
                  <th className="py-2 px-2.5">Status</th>
                  <th className="py-2 px-2.5 text-right">30d Sold</th>
                  <th className="py-2 px-2.5 text-right">30d Revenue</th>
                  <th className="py-2 px-2.5 text-right">MoM Trend</th>
                  <th className="py-2 px-2.5 text-right">Current Stock</th>
                  <th className="py-2 px-2.5 text-right">Holding Val</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredItems.map(item => {
                  const isWinner = item.classification === 'WINNER';
                  const isZeroMover = item.classification === 'ZERO_MOVER';
                  const isDeclining = item.classification === 'DECLINING';

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
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${
                          isWinner ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                          isZeroMover ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                          isDeclining ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
                          'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {item.classification.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-white whitespace-nowrap">
                        {item.units_sold_30d} {item.packaging_unit || 'packs'}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-amber-400 whitespace-nowrap">
                        ₹{parseFloat(item.revenue_30d || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${
                      isWinner ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                      isZeroMover ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                      isDeclining ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
                      'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {item.classification.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-slate-900 text-[10px]">
                    <div>
                      <span className="text-slate-500">30d Sold:</span>
                      <div className="font-mono font-bold text-white">{item.units_sold_30d}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Revenue:</span>
                      <div className="font-mono font-bold text-amber-400">₹{(item.revenue_30d/1000).toFixed(1)}k</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Stock:</span>
                      <div className="font-mono font-bold text-slate-300">{item.stock_holding_units}</div>
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
