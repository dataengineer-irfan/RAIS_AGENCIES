import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Snowflake, 
  Award, 
  TrendingDown, 
  Layers, 
  Sparkles, 
  Table as TableIcon, 
  Grid,
  Search,
  Filter,
  DollarSign
} from 'lucide-react';
import { analyticsApi } from '../services/api';
import { getProductVisualIcon } from '../utils/productIcons';

export const ProductPerformanceMatrix = ({ onSelectProduct }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, WINNER, STEADY, DECLINING, ZERO_MOVER
  const [viewMode, setViewMode] = useState('MATRIX'); // MATRIX or TABLE
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

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl animate-pulse">
        <div className="h-6 w-64 bg-slate-800 rounded mb-4"></div>
        <div className="h-32 bg-slate-800/50 rounded-2xl mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-800/40 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const filteredItems = data.items.filter(item => {
    const matchesTab = activeTab === 'ALL' || item.classification === activeTab;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-black text-white tracking-wide">
                Product Performance Matrix & Dead Stock Intelligence
              </h3>
              <p className="text-xs text-slate-400">
                Quadrant analysis classifying SKUs by 30-day velocity, revenue trend, and cold room capital risk.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle & Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search SKU / Brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-44"
            />
          </div>

          <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('MATRIX')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'MATRIX' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Matrix
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'TABLE' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table
            </button>
          </div>
        </div>
      </div>

      {/* DEAD STOCK / COLD ROOM ALERT BANNER (High Business Value for Frozen Food Wholesaler) */}
      {data.total_dead_stock_value > 0 && (
        <div className="bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent border border-red-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-red-950/20">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
              <Snowflake className="w-6 h-6 text-red-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/30">
                  Cold Room Capital Risk
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {data.zero_movers_count} Zero-Mover SKUs Detected
                </span>
              </div>
              <p className="text-sm font-bold text-white mt-1">
                ₹{data.total_dead_stock_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })} tied up in stationary freezer inventory
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {data.insight_summary}
              </p>
            </div>
          </div>

          <button 
            onClick={() => setActiveTab('ZERO_MOVER')}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Inspect {data.zero_movers_count} Dead Stock Items
          </button>
        </div>
      )}

      {/* KPI Filter Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            activeTab === 'ALL' 
              ? 'bg-slate-800 border-amber-500 shadow-md shadow-amber-500/10' 
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-400">All Catalogue SKUs</div>
          <div className="text-xl font-black text-white mt-0.5">{data.total_skus}</div>
          <div className="text-[10px] text-slate-500 mt-1">Full Assortment</div>
        </button>

        <button
          onClick={() => setActiveTab('WINNER')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            activeTab === 'WINNER' 
              ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10' 
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            Winners
          </div>
          <div className="text-xl font-black text-emerald-400 mt-0.5">{data.winners_count}</div>
          <div className="text-[10px] text-slate-500 mt-1">High Sales & Growth</div>
        </button>

        <button
          onClick={() => setActiveTab('STEADY')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            activeTab === 'STEADY' 
              ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10' 
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
            <Layers className="w-3.5 h-3.5" />
            Steady
          </div>
          <div className="text-xl font-black text-amber-400 mt-0.5">{data.steady_count}</div>
          <div className="text-[10px] text-slate-500 mt-1">Consistent Movers</div>
        </button>

        <button
          onClick={() => setActiveTab('DECLINING')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            activeTab === 'DECLINING' 
              ? 'bg-orange-500/10 border-orange-500 shadow-md shadow-orange-500/10' 
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-1 text-[11px] font-bold text-orange-400">
            <TrendingDown className="w-3.5 h-3.5" />
            Declining
          </div>
          <div className="text-xl font-black text-orange-400 mt-0.5">{data.declining_count}</div>
          <div className="text-[10px] text-slate-500 mt-1">Negative MoM Trend</div>
        </button>

        <button
          onClick={() => setActiveTab('ZERO_MOVER')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            activeTab === 'ZERO_MOVER' 
              ? 'bg-red-500/10 border-red-500 shadow-md shadow-red-500/10' 
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-1 text-[11px] font-bold text-red-400">
            <Snowflake className="w-3.5 h-3.5" />
            Zero-Movers
          </div>
          <div className="text-xl font-black text-red-400 mt-0.5">{data.zero_movers_count}</div>
          <div className="text-[10px] text-slate-500 mt-1">Dead Stock in Freezer</div>
        </button>
      </div>

      {/* MATRIX VIEW: Quadrant Cards */}
      {viewMode === 'MATRIX' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredItems.map(item => {
            const visual = getProductVisualIcon(item);
            const isWinner = item.classification === 'WINNER';
            const isZeroMover = item.classification === 'ZERO_MOVER';
            const isDeclining = item.classification === 'DECLINING';

            return (
              <div 
                key={item.product_id}
                onClick={() => onSelectProduct && onSelectProduct(item)}
                className={`bg-slate-950/70 border rounded-2xl p-4 transition-all hover:scale-[1.01] cursor-pointer relative overflow-hidden ${
                  isWinner ? 'border-emerald-500/40 hover:border-emerald-500' :
                  isZeroMover ? 'border-red-500/40 hover:border-red-500' :
                  isDeclining ? 'border-orange-500/40 hover:border-orange-500' :
                  'border-slate-800 hover:border-amber-500/50'
                }`}
              >
                {/* Visual Top Bar */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl shadow-inner">
                      {visual.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{item.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{item.sku} • {item.brand || item.category_name}</p>
                    </div>
                  </div>

                  {/* Classification Badge */}
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    isWinner ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                    isZeroMover ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                    isDeclining ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
                    'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {item.classification.replace('_', ' ')}
                  </span>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-900">
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold">30d Revenue</div>
                    <div className="text-xs font-black text-amber-400 mt-0.5">
                      ₹{item.revenue_30d.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold">MoM Trend</div>
                    <div className={`text-xs font-black mt-0.5 flex items-center gap-0.5 ${
                      item.trend_pct > 0 ? 'text-emerald-400' :
                      item.trend_pct < 0 ? 'text-red-400' :
                      'text-slate-400'
                    }`}>
                      {item.trend_pct > 0 ? '+' : ''}{item.trend_pct}%
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold">Stock Value</div>
                    <div className="text-xs font-black text-white mt-0.5">
                      ₹{item.stock_holding_value.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Units and Status */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-900/60">
                  <span>Units Sold (30d): <strong className="text-white">{item.units_sold_30d} {item.packaging_unit}</strong></span>
                  <span>On Hand: <strong className={item.stock_holding_units <= 0 ? 'text-red-400' : 'text-slate-300'}>{item.stock_holding_units}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-950/60">
                <th className="p-3">SKU & Product</th>
                <th className="p-3">Category</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">30d Units</th>
                <th className="p-3 text-right">30d Revenue</th>
                <th className="p-3 text-right">MoM Trend</th>
                <th className="p-3 text-right">Current Stock</th>
                <th className="p-3 text-right">Holding Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.map(item => {
                const visual = getProductVisualIcon(item);
                return (
                  <tr key={item.product_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-semibold text-white flex items-center gap-2">
                      <span className="text-base">{visual.icon}</span>
                      <div>
                        <div>{item.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{item.sku}</div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-400">{item.category_name}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        item.classification === 'WINNER' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                        item.classification === 'ZERO_MOVER' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                        item.classification === 'DECLINING' ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
                        'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {item.classification.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-white">{item.units_sold_30d}</td>
                    <td className="p-3 text-right font-mono font-bold text-amber-400">₹{item.revenue_30d.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-mono font-bold">
                      <span className={item.trend_pct > 0 ? 'text-emerald-400' : item.trend_pct < 0 ? 'text-red-400' : 'text-slate-400'}>
                        {item.trend_pct > 0 ? '+' : ''}{item.trend_pct}%
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-300">{item.stock_holding_units} {item.packaging_unit}</td>
                    <td className="p-3 text-right font-mono font-bold text-white">₹{item.stock_holding_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-sm font-semibold">No products found for this classification or filter criteria.</p>
        </div>
      )}
    </div>
  );
};
