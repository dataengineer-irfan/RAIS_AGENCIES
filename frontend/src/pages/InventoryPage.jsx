import React, { useState, useEffect, useMemo } from 'react';
import { 
  Boxes, 
  PackagePlus, 
  SlidersHorizontal, 
  History, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  PlusCircle,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { inventoryApi, catalogueApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ReceiveStockModal } from '../components/ReceiveStockModal';
import { AdjustStockModal } from '../components/AdjustStockModal';
import { StockMovementsDrawer } from '../components/StockMovementsDrawer';

export const InventoryPage = () => {
  const { hasRole } = useAuth();
  const [stockItems, setStockItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Sorting
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Modals
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState(null);
  const [movementsDrawerOpen, setMovementsDrawerOpen] = useState(false);
  const [selectedProductForMovements, setSelectedProductForMovements] = useState(null);

  useEffect(() => {
    loadInventory();
  }, [selectedCategory]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const [items, cats] = await Promise.all([
        inventoryApi.getOverview({ category_id: selectedCategory !== 'ALL' ? selectedCategory : undefined }),
        catalogueApi.listCategories()
      ]);
      setStockItems(Array.isArray(items) ? items : (items?.items || items?.data || []));
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err) {
      console.error('Failed to load inventory', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleOpenAdjust = (prod) => {
    setSelectedProductForAdjust(prod.product_id);
    setAdjustModalOpen(true);
  };

  const handleOpenMovements = (prod) => {
    setSelectedProductForMovements(prod);
    setMovementsDrawerOpen(true);
  };

  const filteredItems = useMemo(() => {
    return stockItems.filter(item => {
      if (statusFilter !== 'ALL' && item.stock_status !== statusFilter) return false;
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        (item.name || '').toLowerCase().includes(s) ||
        (item.sku || '').toLowerCase().includes(s) ||
        (item.brand || '').toLowerCase().includes(s) ||
        (item.category_name || '').toLowerCase().includes(s)
      );
    }).sort((a, b) => {
      let aVal = a[sortField] ?? '';
      let bVal = b[sortField] ?? '';

      if (['current_stock', 'min_stock_alert', 'base_price', 'total_value'].includes(sortField)) {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [stockItems, statusFilter, searchTerm, sortField, sortAsc]);

  const inStockCount = stockItems.filter(i => i.stock_status === 'IN_STOCK').length;
  const lowStockCount = stockItems.filter(i => i.stock_status === 'LOW_STOCK').length;
  const outOfStockCount = stockItems.filter(i => i.stock_status === 'OUT_OF_STOCK').length;
  const totalStockUnits = stockItems.reduce((s, i) => s + (parseFloat(i.current_stock) || 0), 0);
  const totalInventoryValuation = stockItems.reduce((s, i) => s + ((parseFloat(i.current_stock) || 0) * (parseFloat(i.base_price) || 0)), 0);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden gap-2">
      
      {/* ─── TOP ACTION & TOOLBAR BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 shrink-0 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white">
                Warehouse Stock & Inventory Matrix
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-amber-400 rounded-full border border-slate-700 font-mono">
                {stockItems.length} SKUs Tracked
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Pattern #3 Live Database Lineage Engine, Intake Vouchers & Movement Audits
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search SKU or product..."
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-36 sm:w-48"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer max-w-[130px] truncate"
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {hasRole(['ADMIN', 'OPERATOR']) && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setReceiveModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all hover:scale-105"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                <span>+ Intake</span>
              </button>
              <button
                onClick={() => {
                  setSelectedProductForAdjust(null);
                  setAdjustModalOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Adjust</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── 4 COMPACT KPI RIBBON ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-md">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Warehouse Units</span>
          <p className="text-lg font-black text-white mt-1 font-mono">{totalStockUnits.toLocaleString('en-IN')} <span className="text-xs text-slate-500 font-normal">packs</span></p>
        </div>
        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-md">
          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Healthy Stock SKUs</span>
          <p className="text-lg font-black text-emerald-400 mt-1 font-mono">{inStockCount} <span className="text-xs text-slate-500 font-normal">active</span></p>
        </div>
        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-md">
          <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Low Stock Threshold</span>
          <p className="text-lg font-black text-amber-400 mt-1 font-mono">{lowStockCount} <span className="text-xs text-slate-500 font-normal">reorder soon</span></p>
        </div>
        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-md">
          <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">Out of Stock</span>
          <p className="text-lg font-black text-rose-400 mt-1 font-mono">{outOfStockCount} <span className="text-xs text-slate-500 font-normal">critical</span></p>
        </div>
      </div>

      {/* ─── STOCK MATRIX TABLE (100% Viewport-Locked) ─── */}
      <div className="flex-1 min-h-0 bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-xl flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-950 z-20 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-400">
              <tr>
                <th className="py-2.5 px-3 cursor-pointer select-none hover:text-white" onClick={() => handleSort('sku')}>
                  <div className="flex items-center gap-1">
                    <span>SKU</span>
                    {sortField === 'sku' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />) : <ArrowUpDown className="w-2.5 h-2.5 text-slate-600" />}
                  </div>
                </th>
                <th className="py-2.5 px-3 cursor-pointer select-none hover:text-white" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    <span>Item Description</span>
                    {sortField === 'name' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />) : <ArrowUpDown className="w-2.5 h-2.5 text-slate-600" />}
                  </div>
                </th>
                <th className="py-2.5 px-3 cursor-pointer select-none hover:text-white" onClick={() => handleSort('brand')}>
                  <div className="flex items-center gap-1">
                    <span>Brand / Category</span>
                    {sortField === 'brand' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />) : <ArrowUpDown className="w-2.5 h-2.5 text-slate-600" />}
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right cursor-pointer select-none hover:text-white" onClick={() => handleSort('current_stock')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Available Stock</span>
                    {sortField === 'current_stock' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />) : <ArrowUpDown className="w-2.5 h-2.5 text-slate-600" />}
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right cursor-pointer select-none hover:text-white" onClick={() => handleSort('min_stock_alert')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Min Alert</span>
                    {sortField === 'min_stock_alert' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />) : <ArrowUpDown className="w-2.5 h-2.5 text-slate-600" />}
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right cursor-pointer select-none hover:text-white" onClick={() => handleSort('base_price')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Unit Valuation</span>
                    {sortField === 'base_price' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />) : <ArrowUpDown className="w-2.5 h-2.5 text-slate-600" />}
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Audit / Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 text-xs">
                    Loading live warehouse stock lineage...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 text-xs">
                    No matching inventory items found.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isLow = item.stock_status === 'LOW_STOCK';
                  const isOut = item.stock_status === 'OUT_OF_STOCK';

                  return (
                    <tr 
                      key={item.product_id}
                      className="border-b border-slate-800/50 hover:bg-slate-950/40 transition-colors"
                    >
                      <td className="py-2 px-3 font-mono font-bold text-amber-400 text-xs">
                        {item.sku}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-slate-200 text-xs">{item.name}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 text-xs">
                        {item.brand} • {item.category_name}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-xs">
                        <span className={isOut ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-white'}>
                          {item.current_stock} pk
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500 text-xs">
                        {item.min_stock_alert} pk
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-white text-xs">
                        ₹{parseFloat(item.base_price || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          isOut ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                          isLow ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                          'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {item.stock_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenMovements(item)}
                            className="p-1 text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded transition-colors"
                            title="View Stock Movement Audit Trail"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          {hasRole(['ADMIN', 'OPERATOR']) && (
                            <button
                              onClick={() => handleOpenAdjust(item)}
                              className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded transition-colors"
                              title="Adjust Stock Quantity"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODALS ─── */}
      <ReceiveStockModal
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        onStockReceived={() => {
          setReceiveModalOpen(false);
          loadInventory();
        }}
      />

      <AdjustStockModal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        preselectedProductId={selectedProductForAdjust}
        onStockAdjusted={() => {
          setAdjustModalOpen(false);
          loadInventory();
        }}
      />

      <StockMovementsDrawer
        isOpen={movementsDrawerOpen}
        onClose={() => setMovementsDrawerOpen(false)}
        product={selectedProductForMovements}
      />

    </div>
  );
};
