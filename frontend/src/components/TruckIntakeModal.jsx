import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  X, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Minus, 
  Package, 
  Boxes,
  ArrowRight,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { inventoryApi } from '../services/api';

export const TruckIntakeModal = ({ isOpen, onClose, products = [], onBatchReceived }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [truckRef, setTruckRef] = useState('');
  const [supplierName, setSupplierName] = useState('ITC Foods / Direct Depot');
  const [notes, setNotes] = useState('');
  
  // Map of productId -> inward quantity
  const [inwardQuantities, setInwardQuantities] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set();
    products.forEach(p => {
      if (p.category_name) cats.add(p.category_name);
    });
    return Array.from(cats).sort();
  }, [products]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedCategory('ALL');
      setTruckRef(`TRUCK-${new Date().toISOString().slice(2,10).replace(/-/g, '')}`);
      setInwardQuantities({});
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = selectedCategory === 'ALL' || p.category_name === selectedCategory;
      if (!matchesCat) return false;
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q)
      );
    });
  }, [products, selectedCategory, searchTerm]);

  // Adjust quantity for a product
  const handleSetQty = (productId, qty) => {
    const num = Math.max(0, parseFloat(qty) || 0);
    setInwardQuantities(prev => {
      const next = { ...prev };
      if (num === 0) {
        delete next[productId];
      } else {
        next[productId] = num;
      }
      return next;
    });
  };

  const handleIncrement = (productId, delta) => {
    setInwardQuantities(prev => {
      const current = prev[productId] || 0;
      const nextVal = Math.max(0, current + delta);
      const next = { ...prev };
      if (nextVal === 0) {
        delete next[productId];
      } else {
        next[productId] = nextVal;
      }
      return next;
    });
  };

  // Selected items summary
  const selectedEntries = Object.entries(inwardQuantities).filter(([_, qty]) => qty > 0);
  const totalIncomingUnits = selectedEntries.reduce((sum, [_, qty]) => sum + qty, 0);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');

    if (selectedEntries.length === 0) {
      setError('Please add inward quantity for at least 1 product.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        reference_number: truckRef.trim() || 'TRUCK-INWARD',
        supplier_name: supplierName.trim() || 'Depot Supplier',
        notes: notes.trim() || `Truck Batch Receipt (${selectedEntries.length} items, ${totalIncomingUnits} units)`,
        items: selectedEntries.map(([productId, quantity]) => ({
          product_id: productId,
          quantity: parseFloat(quantity)
        }))
      };

      const res = await inventoryApi.batchReceiveStock(payload);
      setSuccessMsg(`Successfully received ${res.total_items_updated || selectedEntries.length} products (${res.total_units_received || totalIncomingUnits} units) into warehouse!`);

      setTimeout(() => {
        if (onBatchReceived) onBatchReceived();
        onClose();
      }, 900);
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to process truck batch intake.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white">
                  Truck Arrival Batch Intake
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                  Fast Inward
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Check-in incoming pallet cartons & freezers with 1-tap increments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Truck Details Form Strip */}
        <div className="p-3 bg-slate-950/50 border-b border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs shrink-0">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Truck / Invoice Ref #
            </label>
            <input
              type="text"
              value={truckRef}
              onChange={(e) => setTruckRef(e.target.value)}
              placeholder="e.g. TRUCK-AP04-2026"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Supplier / Source
            </label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="ITC / Milky Mist"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Driver / Unloading Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Unloaded to Deep Freeze A"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-3 bg-slate-900 border-b border-slate-800/80 flex flex-col sm:flex-row items-center gap-2 shrink-0">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search item name, SKU..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto py-0.5">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All ({products.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mx-4 mt-2 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs font-semibold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-4 mt-2 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-semibold flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Scrollable SKU Product Checklist */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No matching products found.
            </div>
          ) : (
            filteredProducts.map(prod => {
              const inwardQty = inwardQuantities[prod.id || prod.product_id] || 0;
              const prodId = prod.id || prod.product_id;
              const isSelected = inwardQty > 0;

              return (
                <div 
                  key={prodId}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Left: Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {prod.sku}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        {prod.brand}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-white mt-1 leading-tight">
                      {prod.name}
                    </h4>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
                      <span>Current Depot Stock: <strong className="text-slate-200">{prod.current_stock || 0} pk</strong></span>
                      {isSelected && (
                        <span className="text-emerald-400 font-bold">
                          → New: {(parseFloat(prod.current_stock || 0) + inwardQty)} pk
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Quick Inward Steppers & Increments */}
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Fast increment pills */}
                    <div className="flex items-center gap-1">
                      {[+5, +10, +25, +50].map(inc => (
                        <button
                          key={inc}
                          type="button"
                          onClick={() => handleIncrement(prodId, inc)}
                          className="px-2 py-1 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 font-mono text-[10px] font-bold rounded-lg transition-colors border border-slate-700"
                        >
                          +{inc}
                        </button>
                      ))}
                    </div>

                    {/* Stepper with number input */}
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleIncrement(prodId, -1)}
                        disabled={inwardQty === 0}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={inwardQty || ''}
                        placeholder="0"
                        onChange={(e) => handleSetQty(prodId, e.target.value)}
                        className="w-14 bg-transparent text-center font-mono font-bold text-xs text-white focus:outline-none py-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleIncrement(prodId, 1)}
                        className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary & Action */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 font-black text-sm">
              {selectedEntries.length}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Total Truck Inward
              </span>
              <span className="text-xs font-mono font-black text-white">
                {selectedEntries.length} SKUs • <span className="text-emerald-400">{totalIncomingUnits} Units</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || selectedEntries.length === 0}
              onClick={handleSubmit}
              className="px-4 sm:px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all transform active:scale-95"
            >
              {loading ? (
                <span>Receiving Stock...</span>
              ) : (
                <>
                  <Truck className="w-4 h-4" />
                  <span>Confirm Inward</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
