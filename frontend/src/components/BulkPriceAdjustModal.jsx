import React, { useState, useMemo } from 'react';
import { X, Layers, Percent, DollarSign, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { catalogueApi } from '../services/api';

export const BulkPriceAdjustModal = ({ isOpen, onClose, categories = [], products = [], onPricesUpdated }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id || '');
  const [adjustType, setAdjustType] = useState('FLAT'); // 'FLAT' (₹) or 'PERCENT' (%)
  const [adjustValue, setAdjustValue] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successCount, setSuccessCount] = useState(null);

  const categoryProducts = useMemo(() => {
    if (!selectedCategoryId) return [];
    return products.filter(p => p.category_id === selectedCategoryId && p.is_active);
  }, [products, selectedCategoryId]);

  const previewList = useMemo(() => {
    const val = parseFloat(adjustValue) || 0;
    return categoryProducts.map(p => {
      const cur = parseFloat(p.base_price || 0);
      let next = cur;
      if (adjustType === 'FLAT') {
        next = Math.max(0, cur + val);
      } else {
        next = Math.max(0, cur + (cur * (val / 100)));
      }
      return {
        ...p,
        currentPrice: cur,
        newPrice: Math.round(next * 100) / 100,
        diff: Math.round((next - cur) * 100) / 100
      };
    });
  }, [categoryProducts, adjustType, adjustValue]);

  if (!isOpen) return null;

  const handleApply = async () => {
    setError('');
    const val = parseFloat(adjustValue);
    if (isNaN(val) || val === 0) {
      setError('Please enter a non-zero adjustment value.');
      return;
    }
    if (previewList.length === 0) {
      setError('No products found in the selected category.');
      return;
    }

    setLoading(true);
    try {
      let updatedCount = 0;
      for (const item of previewList) {
        if (item.newPrice !== item.currentPrice) {
          await catalogueApi.updateProduct(item.id, { base_price: item.newPrice });
          updatedCount++;
        }
      }
      setSuccessCount(updatedCount);
      setTimeout(() => {
        if (onPricesUpdated) onPricesUpdated();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update prices.');
    } finally {
      setLoading(false);
    }
  };

  const currentCat = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Category Bulk Price Revision</h3>
              <p className="text-xs text-slate-400">Apply flat or percentage rate adjustments to entire categories</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
          {/* Category Selector */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Select Category
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(cat => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/20'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Adjustment Type & Value */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Adjustment Mode
              </label>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustType('FLAT')}
                  className={`flex-1 py-1.5 rounded-md font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                    adjustType === 'FLAT' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Flat ₹</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('PERCENT')}
                  className={`flex-1 py-1.5 rounded-md font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                    adjustType === 'PERCENT' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Percent className="w-3 h-3" />
                  <span>Percent</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Adjustment Amount (+ or -)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={adjustValue}
                  onChange={(e) => setAdjustValue(e.target.value)}
                  placeholder="e.g. 10 or -5"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-purple-500 text-right"
                />
              </div>
            </div>
          </div>

          {/* Live Preview List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-300">
                Preview Changes ({previewList.length} SKUs in {currentCat?.name || 'Category'})
              </span>
              <span className="text-[11px] text-slate-500">Live preview</span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {previewList.length === 0 ? (
                <div className="p-4 text-center text-slate-500">No active products in this category</div>
              ) : (
                previewList.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-medium text-slate-200 truncate">{p.name}</p>
                      <span className="text-[10px] text-slate-500 font-mono">{p.packaging_unit}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono shrink-0">
                      <span className="text-slate-500 line-through">₹{p.currentPrice.toFixed(2)}</span>
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                      <span className="text-white font-bold">₹{p.newPrice.toFixed(2)}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        p.diff > 0 ? 'bg-emerald-500/10 text-emerald-400' : p.diff < 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {p.diff > 0 ? `+₹${p.diff.toFixed(2)}` : p.diff < 0 ? `-₹${Math.abs(p.diff).toFixed(2)}` : '0'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {error && <p className="text-xs text-rose-400 text-center font-medium">{error}</p>}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || previewList.length === 0}
            onClick={handleApply}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-purple-600/20 active:scale-95 disabled:opacity-40"
          >
            {successCount !== null ? (
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>Updated {successCount} SKUs!</span>
              </span>
            ) : loading ? (
              <span>Applying Changes...</span>
            ) : (
              <span>Apply to All {previewList.length} SKUs</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
