import React, { useState, useEffect } from 'react';
import { PackagePlus, X, AlertCircle } from 'lucide-react';
import { catalogueApi, inventoryApi } from '../services/api';

export const ReceiveStockModal = ({ isOpen, onClose, initialProductId = null, onStockReceived }) => {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      resetForm();
    }
  }, [isOpen, initialProductId]);

  const loadProducts = async () => {
    try {
      const data = await catalogueApi.listProducts({ limit: 200 });
      const items = Array.isArray(data) ? data : (data?.items || data?.data || []);
      setProducts(items);
      if (initialProductId) {
        setProductId(initialProductId);
      } else if (items.length > 0) {
        setProductId(items[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setQuantity('');
    setPurchaseCost('');
    setSupplier('');
    setBatchNumber('');
    setExpiryDate('');
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
      setError('Please enter a valid received quantity greater than 0.');
      return;
    }

    setLoading(true);
    try {
      const res = await inventoryApi.receiveStock({
        product_id: targetProdId,
        quantity: parseFloat(quantity),
        purchase_cost: purchaseCost ? parseFloat(purchaseCost) : null,
        supplier: supplier || null,
        batch_number: batchNumber || null,
        expiry_date: expiryDate || null,
        notes: notes || null
      });

      setSuccessMsg(res);
      setTimeout(() => {
        onStockReceived();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to receive stock.');
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
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Receive Stock Delivery</h2>
              <p className="text-xs text-slate-400">Record supplier intake and update inventory counts</p>
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
              <p className="font-bold">✓ Stock Received Successfully!</p>
              <p className="text-[11px] text-slate-300">{successMsg.product_name}</p>
              <p className="text-[11px] font-mono">
                Previous: {successMsg.previous_stock} ➔ Received: +{successMsg.received_quantity} ➔ New Stock: <span className="font-bold text-emerald-400">{successMsg.new_stock} {successMsg.unit}</span>
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
                  {p.name} ({p.packaging_unit}) — Current: {p.current_stock}
                </option>
              ))}
            </select>
            {selectedProd && (
              <p className="text-[11px] text-slate-400 mt-1">
                Current Stock: <span className="font-bold text-amber-400">{selectedProd.current_stock}</span> {selectedProd.packaging_unit}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Received Quantity *
              </label>
              <input
                type="number"
                step="any"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 20"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Purchase Cost (₹/unit)
              </label>
              <input
                type="number"
                step="0.01"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
                placeholder="e.g. 280.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Supplier Name
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. ITC Master Chef Hub"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Batch Number
              </label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. BATCH-2026-AUG"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Received via cold chain"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
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
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg uppercase tracking-wider text-xs shadow-lg shadow-emerald-600/20"
            >
              {loading ? 'Receiving...' : 'Receive Stock'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
