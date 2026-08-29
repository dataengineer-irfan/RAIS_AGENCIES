import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, X, AlertCircle } from 'lucide-react';
import { catalogueApi, inventoryApi } from '../services/api';

export const AdjustStockModal = ({ isOpen, onClose, onStockAdjusted, preselectedProductId }) => {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('DECREASE');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('DAMAGED');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      resetForm();
    }
  }, [isOpen, preselectedProductId]);

  const loadProducts = async () => {
    try {
      const data = await catalogueApi.listProducts({ limit: 200 });
      setProducts(data);
      if (preselectedProductId) {
        setProductId(preselectedProductId);
      } else if (data.length > 0) {
        setProductId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setAdjustmentType('DECREASE');
    setQuantity('');
    setReason('DAMAGED');
    setNotes('');
    setError('');
    setSuccessMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const targetProdId = productId || (products.length > 0 ? products[0].id : null);
    if (!targetProdId) {
      setError('Please select a product.');
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      setError('Please enter a valid quantity.');
      return;
    }

    setLoading(true);
    try {
      const res = await inventoryApi.adjustStock({
        product_id: targetProdId,
        adjustment_type: adjustmentType,
        quantity: parseFloat(quantity),
        reason: reason,
        notes: notes || null
      });

      setSuccessMsg(res);
      setTimeout(() => {
        onStockAdjusted();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to adjust stock.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedProd = products.find(p => p.id === productId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Stock Adjustment</h2>
              <p className="text-xs text-slate-400">Record damage, expiry, wastage, or physical count correction</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl space-y-1">
              <p className="font-bold">✓ Stock Adjusted Successfully!</p>
              <p className="text-[11px] text-slate-300">{successMsg.product_name}</p>
              <p className="text-[11px] font-mono">
                Previous: {successMsg.previous_stock} ➔ Change: {successMsg.quantity_change > 0 ? `+${successMsg.quantity_change}` : successMsg.quantity_change} ➔ New Stock: <span className="font-bold text-amber-400">{successMsg.new_stock}</span>
              </p>
            </div>
          )}

          {/* Product Dropdown */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
              Select Product *
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.packaging_unit}) — Available: {p.current_stock}
                </option>
              ))}
            </select>
            {selectedProd && (
              <p className="text-[11px] text-slate-400 mt-1">
                Current Stock: <span className="font-bold text-amber-400">{selectedProd.current_stock}</span> {selectedProd.packaging_unit}
              </p>
            )}
          </div>

          {/* Adjustment Type Switcher */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Adjustment Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType('DECREASE')}
                className={`py-2 rounded-lg font-bold uppercase tracking-wider text-xs border transition-all ${
                  adjustmentType === 'DECREASE'
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                - Decrease Stock
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('INCREASE')}
                className={`py-2 rounded-lg font-bold uppercase tracking-wider text-xs border transition-all ${
                  adjustmentType === 'INCREASE'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                + Increase Stock
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                step="any"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 5"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Reason *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="DAMAGED">Damaged in Storage/Transit</option>
                <option value="EXPIRED">Expired Product</option>
                <option value="WASTAGE">Wastage / Scrap</option>
                <option value="PHYSICAL_COUNT">Physical Count Correction</option>
                <option value="OTHER">Other Reason</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
              Adjustment Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Broken packet discovered during morning audit"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg uppercase tracking-wider text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || successMsg}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-lg uppercase tracking-wider text-xs shadow-lg shadow-amber-500/20"
            >
              {loading ? 'Adjusting...' : 'Save Adjustment'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
