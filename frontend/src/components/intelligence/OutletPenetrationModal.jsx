import React, { useState, useEffect } from 'react';
import { 
  X, 
  Store, 
  Search, 
  Phone, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  RefreshCw,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { analyticsApi } from '../../services/api';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

/**
 * OutletPenetrationModal - Power BI 2026 Customer Penetration & Whitespace Slicer
 * Tracks which customer outlets buy the product and uncovers untapped restaurant whitespace.
 */
export const OutletPenetrationModal = ({
  isOpen,
  onClose,
  product,
  period = '30d'
}) => {
  useBodyScrollLock(isOpen);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('BUYING'); // 'BUYING' | 'WHITESPACE'
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPenetration = async () => {
    const prodId = product?.id || product?.product_id || product?.sku;
    if (!prodId) return;
    setLoading(true);
    setError('');
    try {
      const res = await analyticsApi.getProductSalesDrilldown(prodId, { period });
      setData(res);
    } catch (err) {
      console.error('Failed to load outlet penetration:', err);
      const detail = err?.response?.data?.detail || err?.message;
      setError(`Unable to load customer outlet penetration: ${detail || 'Please retry.'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPenetration();
    }
  }, [isOpen, product, period]);

  if (!isOpen) return null;

  const buyingOutlets = data?.buying_outlets || [];
  const whitespaceOutlets = data?.whitespace_outlets || [];
  const summary = data?.summary || {};

  const filteredBuying = buyingOutlets.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.territory.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWhitespace = whitespaceOutlets.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.territory.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden select-none">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {product?.sku}
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Customer Penetration & Whitespace
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {product?.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Penetration Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 sm:px-4 bg-slate-100/60 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Market Penetration:</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                {summary.outlet_penetration_pct || 0}%
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                ({summary.buying_outlets_count || 0} outlets)
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Untapped Whitespace:</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-base">
                {summary.whitespace_outlets_count || 0}
              </span>
              <span className="text-[10px] font-mono text-slate-400">non-buyers</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Total Volume Moved:</span>
            <span className="font-mono font-black text-slate-900 dark:text-white text-base">
              {summary.total_units_sold || 0} pkts
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Total Billed Revenue:</span>
            <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-base">
              ₹{Number(summary.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Tabs & Search Bar */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 text-xs">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('BUYING')}
              className={`px-3 py-1 rounded-md font-bold transition-all ${
                activeTab === 'BUYING'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Buying Outlets ({buyingOutlets.length})
            </button>
            <button
              onClick={() => setActiveTab('WHITESPACE')}
              className={`px-3 py-1 rounded-md font-bold transition-all ${
                activeTab === 'WHITESPACE'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Whitespace Opportunities ({whitespaceOutlets.length})
            </button>
          </div>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search outlet or territory..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
              <p className="text-xs font-mono">Analyzing outlet penetration and whitespace...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-xs text-center">
              {error}
            </div>
          ) : activeTab === 'BUYING' ? (
            // BUYING OUTLETS LIST
            filteredBuying.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No buying outlets match your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredBuying.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm hover:border-emerald-500/50 transition-all text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] text-slate-400 font-bold block">
                          {c.code} • {c.territory}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-white truncate text-sm">
                          {c.name}
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold shrink-0">
                        {c.orders_count} orders
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Total Volume:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{c.total_units} pkts</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Billed Revenue:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          ₹{c.total_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Last Order:</span>
                        <span className="text-slate-600 dark:text-slate-300 text-[11px]">{c.last_purchase_date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // WHITESPACE OPPORTUNITY LIST
            filteredWhitespace.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                100% outlet penetration! Every active customer outlet has purchased this SKU.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredWhitespace.map((c) => (
                  <div
                    key={c.id}
                    className="bg-amber-50/30 dark:bg-slate-900 border border-amber-200/60 dark:border-slate-800 rounded-xl p-3 shadow-sm hover:border-amber-400 transition-all text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] text-amber-700 dark:text-amber-400 font-bold block">
                          {c.code} • {c.territory}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-white truncate text-sm">
                          {c.name}
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-bold shrink-0">
                        Zero Purchases
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500">Contact: {c.phone || 'No phone'}</span>
                      <a
                        href={c.phone ? `https://wa.me/91${c.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${c.name}, we have wholesale stock of ${product?.name}. Would you like a sample or rate quote?`)}` : '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-[10px] font-bold flex items-center gap-1 transition-all"
                      >
                        <Phone className="w-2.5 h-2.5" /> Pitch on WhatsApp
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
