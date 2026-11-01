import React, { useState, useEffect } from 'react';
import { X, Zap, PackagePlus, AlertTriangle, CheckCircle2, RefreshCw, Layers, ArrowRight } from 'lucide-react';
import { inventoryApi } from '../services/api';
import { formatProductDisplay } from '../utils/productHelpers';

export const QuickStockInwardModal = ({
  isOpen,
  target,
  onClose,
  onStockUpdated
}) => {
  const [quantity, setQuantity] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [supplier, setSupplier] = useState('Counter Delivery / Direct Inward');
  const [notes, setNotes] = useState('Urgent Counter Inward during Invoice Billing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (isOpen && target?.product) {
      const prod = target.product;
      const curStock = parseFloat(prod.current_stock ?? 0);
      const needed = Math.max(1, (target.neededQty || 1) - Math.max(0, curStock));
      
      setQuantity(String(needed));
      
      // Calculate realistic purchase cost fallback
      const defaultCost = prod.landed_cost || prod.purchase_cost || Math.round(parseFloat(prod.base_price || 0) * 0.8);
      setPurchaseCost(defaultCost ? String(defaultCost) : '');
      setSupplier('Counter Delivery / Direct Inward');
      setNotes('Urgent Counter Inward during Invoice Billing');
      setError('');
      setSuccess(null);
    }
  }, [isOpen, target]);

  if (!isOpen || !target?.product) return null;

  const prod = target.product;
  const { cleanName, brandName } = formatProductDisplay(prod);
  const curStock = parseFloat(prod.current_stock ?? 0);
  const billedQty = parseFloat(target.neededQty || 0);
  const shortfall = Math.max(1, billedQty - Math.max(0, curStock));
  const unit = prod.packaging_unit || 'PKT';

  const handlePresetSelect = (presetQty) => {
    setQuantity(String(presetQty));
    setError('');
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const qtyVal = parseFloat(quantity);
    if (!qtyVal || qtyVal <= 0) {
      setError('Please enter a valid stock quantity to inward (> 0).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        product_id: prod.id,
        quantity: qtyVal,
        purchase_cost: purchaseCost ? parseFloat(purchaseCost) : null,
        supplier: supplier.trim() || 'Counter Delivery',
        notes: notes.trim() || 'Quick Inward from Invoice Builder'
      };

      const res = await inventoryApi.receiveStock(payload);
      const newStock = res?.new_stock !== undefined ? parseFloat(res.new_stock) : (curStock + qtyVal);

      setSuccess({
        addedQty: qtyVal,
        newStock: newStock
      });

      // Notify parent to update local state immediately
      onStockUpdated(prod, newStock);

      // Smooth auto-dismiss so operator continues billing without interruption
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      console.error('Quick stock inward failed:', err);
      const msg = err.response?.data?.detail || err.message || 'Failed to update stock.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700/90 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col text-slate-100 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="px-4 py-3 bg-gradient-to-r from-amber-500/20 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <Zap className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                <span>Quick Stock Inward</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                  COUNTER ENTRY
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Forgot stock inward? Add received units now to continue billing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in zoom-in-95">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <div>
                <span>Added +{success.addedQty} {unit}!</span>
                <div className="text-[10px] text-emerald-400 font-mono font-normal">
                  Warehouse stock updated to {success.newStock} {unit}. Continuing bill...
                </div>
              </div>
            </div>
          )}

          {/* Product Overview Card */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-black text-white text-xs sm:text-sm">
                  {cleanName}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                  <span className="text-amber-400 font-bold">{brandName || 'RAIS Master'}</span>
                  <span>•</span>
                  <span>SKU: {prod.sku}</span>
                  <span>•</span>
                  <span>{unit}</span>
                </div>
              </div>
            </div>

            {/* Stock Shortfall Gauge */}
            <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-slate-800/80 text-center font-mono">
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[9px] text-slate-500 block uppercase">Current Stock</span>
                <span className={`text-xs font-black ${curStock <= 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {curStock} {unit}
                </span>
              </div>

              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[9px] text-slate-500 block uppercase">Billed in Invoice</span>
                <span className="text-xs font-black text-amber-300">
                  {billedQty} {unit}
                </span>
              </div>

              <div className="p-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
                <span className="text-[9px] text-emerald-400 block uppercase font-bold">Needed Shortfall</span>
                <span className="text-xs font-black text-emerald-400">
                  +{shortfall} {unit}
                </span>
              </div>
            </div>
          </div>

          {/* 1-Tap Quick Action Presets */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 block font-mono">
              1-Tap Quick Inward Quantity Presets:
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handlePresetSelect(shortfall)}
                className={`px-2 py-1.5 rounded-lg text-xs font-black border transition-all active:scale-95 flex items-center justify-center gap-1 ${
                  parseFloat(quantity) === shortfall
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-750'
                }`}
                title="Exact quantity to cover this invoice shortfall"
              >
                <span>+{shortfall} (Match)</span>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect(10)}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
                  parseFloat(quantity) === 10
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                +10 {unit}
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect(24)}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
                  parseFloat(quantity) === 24
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                +24 (Case)
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect(50)}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
                  parseFloat(quantity) === 50
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                +50 {unit}
              </button>
            </div>
          </div>

          {/* Form Fields: Inward Qty & Purchase Cost */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 block font-mono">
                Add Received Stock (+ Qty) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2 text-sm text-white font-mono font-black focus:outline-none focus:border-amber-400 shadow-inner"
                />
                <span className="absolute right-3 top-2.5 text-[10px] text-slate-500 font-mono font-bold pointer-events-none">
                  {unit}
                </span>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 block font-mono">
                Purchase Cost (₹/Unit)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value)}
                  placeholder="Cost"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-6 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500 shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Supplier & Delivery Note */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 block font-mono">
              Delivery Ref / Note (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Counter inward, morning delivery truck..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500 shadow-inner"
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || !quantity || parseFloat(quantity) <= 0}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating Stock...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Inward Stock & Continue</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
