import React, { useState, useEffect } from 'react';
import { History, X, ArrowUpRight, ArrowDownLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { inventoryApi } from '../services/api';

export const StockMovementsDrawer = ({ isOpen, onClose, selectedProduct }) => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadMovements();
    }
  }, [isOpen, selectedProduct]);

  const loadMovements = async () => {
    setLoading(true);
    try {
      const params = selectedProduct ? { product_id: selectedProduct.product_id || selectedProduct.id } : {};
      const data = await inventoryApi.getMovements(params);
      setMovements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {selectedProduct ? `${selectedProduct.name} — Stock History` : 'Global Stock Movements'}
              </h3>
              <p className="text-xs text-slate-400">
                {selectedProduct ? `SKU: ${selectedProduct.sku} | Unit: ${selectedProduct.packaging_unit}` : 'Chronological inventory audit log'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
              Stock Movement Timeline
            </span>
            <button
              onClick={loadMovements}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Loading inventory history...
            </div>
          ) : movements.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No inventory movements recorded yet.
            </div>
          ) : (
            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-900/60 text-[10px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Product / Ref</th>
                    <th className="py-2.5 px-3 text-right">Change</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-mono">
                  {movements.map((m) => {
                    const isPositive = parseFloat(m.quantity_change) > 0;
                    return (
                      <tr key={m.id} className="hover:bg-slate-900/30">
                        <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(m.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <p className="font-bold text-slate-200 text-xs">{m.product_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-mono">
                            <span className="text-amber-500 font-bold">{m.reference_number || m.movement_type}</span>
                            <span>•</span>
                            <span className="text-slate-400">{m.reason || m.notes || '-'}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`font-bold inline-flex items-center gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? '+' : ''}{parseFloat(m.quantity_change).toFixed(1)} {m.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-200">
                          {parseFloat(m.new_stock).toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg uppercase tracking-wider"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
