import React, { useState, useEffect } from 'react';
import { X, DollarSign, Check, TrendingUp, Sparkles, Tag } from 'lucide-react';
import { catalogueApi } from '../services/api';

export const QuickPriceModal = ({ isOpen, onClose, product, onPriceUpdated }) => {
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setPrice(parseFloat(product.base_price || 0).toFixed(2));
      setError('');
      setSuccess(false);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleAdjust = (delta) => {
    const cur = parseFloat(price) || 0;
    const next = Math.max(0, cur + delta);
    setPrice(next.toFixed(2));
  };

  const handleSave = async () => {
    setError('');
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Please enter a valid wholesale rate.');
      return;
    }

    setLoading(true);
    try {
      const updated = await catalogueApi.updateProduct(product.id, {
        base_price: numPrice
      });
      setSuccess(true);
      setTimeout(() => {
        if (onPriceUpdated) onPriceUpdated(updated);
        onClose();
      }, 700);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update price.');
    } finally {
      setLoading(false);
    }
  };

  const currentPrice = parseFloat(product.base_price || 0);
  const newPrice = parseFloat(price) || 0;
  const priceDiff = newPrice - currentPrice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Quick Price Tweak</h3>
              <p className="text-[10px] text-slate-400">Update wholesale selling rate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Product Dossier Card */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
            <p className="text-xs font-bold text-white truncate">{product.name}</p>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-mono text-slate-500">{product.sku}</span>
              <span className="font-semibold text-amber-400">{product.packaging_unit || 'PKT'}</span>
            </div>
          </div>

          {/* Price Input Display */}
          <div className="text-center space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              New Wholesale Rate (₹)
            </span>
            <div className="relative flex items-center justify-center">
              <span className="text-2xl font-black text-amber-400 font-mono mr-1">₹</span>
              <input
                type="number"
                step="any"
                min="0"
                autoFocus
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-44 text-3xl font-black text-center text-white bg-slate-950 border-2 border-amber-500/50 rounded-xl py-2 px-3 focus:outline-none focus:border-amber-400 font-mono tracking-tight shadow-inner"
              />
            </div>
            
            {/* Price Difference Pill */}
            {priceDiff !== 0 && (
              <div className="text-[11px] font-mono">
                {priceDiff > 0 ? (
                  <span className="text-emerald-400 font-bold">▲ +₹{priceDiff.toFixed(2)} increase</span>
                ) : (
                  <span className="text-rose-400 font-bold">▼ -₹{Math.abs(priceDiff).toFixed(2)} reduction</span>
                )}
                <span className="text-slate-500 ml-1.5">(was ₹{currentPrice.toFixed(2)})</span>
              </div>
            )}
          </div>

          {/* Quick Increment/Decrement Pills */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block text-center">
              1-Tap Adjustments
            </span>
            <div className="grid grid-cols-4 gap-1.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => handleAdjust(-10)}
                className="py-1.5 bg-slate-800 hover:bg-slate-750 text-rose-400 font-bold rounded-lg border border-slate-700/60 active:scale-95 transition-all"
              >
                -₹10
              </button>
              <button
                type="button"
                onClick={() => handleAdjust(5)}
                className="py-1.5 bg-slate-800 hover:bg-slate-750 text-emerald-400 font-bold rounded-lg border border-slate-700/60 active:scale-95 transition-all"
              >
                +₹5
              </button>
              <button
                type="button"
                onClick={() => handleAdjust(10)}
                className="py-1.5 bg-slate-800 hover:bg-slate-750 text-emerald-400 font-bold rounded-lg border border-slate-700/60 active:scale-95 transition-all"
              >
                +₹10
              </button>
              <button
                type="button"
                onClick={() => handleAdjust(25)}
                className="py-1.5 bg-slate-800 hover:bg-slate-750 text-emerald-400 font-bold rounded-lg border border-slate-700/60 active:scale-95 transition-all"
              >
                +₹25
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-400 text-center font-medium">{error}</p>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || success}
              onClick={handleSave}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg ${
                success 
                  ? 'bg-emerald-500 text-slate-950' 
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 active:scale-95'
              }`}
            >
              {success ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <span>Update Price</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
