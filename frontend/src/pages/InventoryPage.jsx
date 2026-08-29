import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  PackagePlus, 
  SlidersHorizontal, 
  History, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Filter
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
        inventoryApi.getOverview({ category_id: selectedCategory }),
        catalogueApi.listCategories()
      ]);
      setStockItems(items);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load inventory', err);
    } finally {
      setLoading(false);
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

  const filteredItems = stockItems.filter(item => {
    if (statusFilter !== 'ALL' && item.stock_status !== statusFilter) return false;
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(s) ||
      item.sku.toLowerCase().includes(s) ||
      item.brand.toLowerCase().includes(s)
    );
  });

  const inStockCount = stockItems.filter(i => i.stock_status === 'IN_STOCK').length;
  const lowStockCount = stockItems.filter(i => i.stock_status === 'LOW_STOCK').length;
  const outOfStockCount = stockItems.filter(i => i.stock_status === 'OUT_OF_STOCK').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-amber-500" />
            <span>Inventory & Stock Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time stock counts, supplier deliveries, adjustments & movement audits
          </p>
        </div>

        {hasRole(['ADMIN', 'OPERATOR']) && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedProductForAdjust(null);
                setAdjustModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs uppercase tracking-wider transition-all"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Stock Adjustment</span>
            </button>
            <button
              onClick={() => setReceiveModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all"
            >
              <PackagePlus className="w-4 h-4" />
              <span>+ Receive Stock</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Tracked SKUs</span>
          <p className="text-2xl font-black font-mono text-white mt-1">{stockItems.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-emerald-400">In Stock</span>
          <p className="text-2xl font-black font-mono text-emerald-400 mt-1">{inStockCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-amber-400">Low Stock Alert</span>
          <p className="text-2xl font-black font-mono text-amber-400 mt-1">{lowStockCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-rose-400">Out of Stock</span>
          <p className="text-2xl font-black font-mono text-rose-400 mt-1">{outOfStockCount}</p>
        </div>
      </div>

      {/* Category Chips & Status Tabs */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition-all ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search & Status Filter */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by product name, SKU, or brand..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All Statuses
            </button>
            <button
              onClick={() => setStatusFilter('IN_STOCK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${statusFilter === 'IN_STOCK' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-slate-200'}`}
            >
              In Stock ({inStockCount})
            </button>
            <button
              onClick={() => setStatusFilter('LOW_STOCK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${statusFilter === 'LOW_STOCK' ? 'bg-amber-950/80 text-amber-300 border border-amber-800' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Low Stock ({lowStockCount})
            </button>
            <button
              onClick={() => setStatusFilter('OUT_OF_STOCK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${statusFilter === 'OUT_OF_STOCK' ? 'bg-rose-950/80 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Out of Stock ({outOfStockCount})
            </button>
          </div>
        </div>
      </div>

      {/* Stock Overview Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-3">Product Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Packaging Unit</th>
                <th className="py-3 px-3 text-right">Wholesale Rate</th>
                <th className="py-3 px-3 text-right font-black">Stock On Hand</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 text-xs">
                    Loading inventory balances...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 text-xs">
                    No products found matching filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  let statusBadgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
                  let statusLabel = "In Stock";
                  if (item.stock_status === 'LOW_STOCK') {
                    statusBadgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/30";
                    statusLabel = "Low Stock";
                  } else if (item.stock_status === 'OUT_OF_STOCK') {
                    statusBadgeClass = "bg-rose-500/10 text-rose-400 border-rose-500/30";
                    statusLabel = "Out of Stock";
                  }

                  return (
                    <tr key={item.product_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-amber-500">
                        {item.sku}
                      </td>
                      <td className="py-3 px-3 text-slate-200">
                        <p className="font-bold">{item.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">{item.brand}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{item.category_name}</td>
                      <td className="py-3 px-3 text-slate-300">{item.packaging_unit}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-200">
                        ₹{parseFloat(item.base_price).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-white text-sm">
                        {parseFloat(item.current_stock).toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusBadgeClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {hasRole(['ADMIN', 'OPERATOR']) && (
                            <button
                              onClick={() => handleOpenAdjust(item)}
                              title="Adjust Stock"
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded text-[10px] uppercase"
                            >
                              Adjust
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenMovements(item)}
                            title="View Stock Movement History"
                            className="p-1 text-amber-400 hover:text-amber-300 rounded hover:bg-slate-800"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
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

      {/* Modals & Drawers */}
      <ReceiveStockModal
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        onStockReceived={loadInventory}
      />

      <AdjustStockModal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        onStockAdjusted={loadInventory}
        preselectedProductId={selectedProductForAdjust}
      />

      <StockMovementsDrawer
        isOpen={movementsDrawerOpen}
        onClose={() => setMovementsDrawerOpen(false)}
        selectedProduct={selectedProductForMovements}
      />

    </div>
  );
};
