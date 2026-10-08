import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Layers, ArrowLeft, ArrowUpRight, TrendingUp, DollarSign, Package, Percent } from 'lucide-react';
import { analyticsApi } from '../services/api';
import { getProductVisualIcon, ProductVisualBadge } from '../utils/productIcons';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export const DrillableMetricModal = ({ 
  isOpen, 
  onClose, 
  metricType = 'revenue', 
  title = 'Revenue Deep-Dive & Multi-Level Drilldown'
}) => {
  useBodyScrollLock(isOpen);

  // Breadcrumb Trail State: e.g. [ { level: 'ROOT', name: 'All Categories' }, { level: 'CATEGORY', id: '...', name: 'Chicken Items' } ]
  const [breadcrumbs, setBreadcrumbs] = useState([{ level: 'ROOT', name: 'All Categories' }]);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const isProfit = metricType === 'profit';

  useEffect(() => {
    if (isOpen) {
      loadLevel('ROOT');
    }
  }, [isOpen, metricType]);

  const loadLevel = async (level, catId = null, catName = '') => {
    setLoading(true);
    try {
      if (level === 'ROOT') {
        const res = await analyticsApi.getDrilldown(metricType, 'category');
        setItems(res?.items || []);
        setSummary(res?.summary || null);
        setBreadcrumbs([{ level: 'ROOT', name: 'All Categories' }]);
        setSelectedCategory(null);
      } else if (level === 'CATEGORY') {
        const res = await analyticsApi.getDrilldown(metricType, 'product', catId);
        setItems(res?.items || []);
        setSummary(res?.summary || null);
        setSelectedCategory({ id: catId, name: catName });
        setBreadcrumbs([
          { level: 'ROOT', name: 'All Categories' },
          { level: 'CATEGORY', id: catId, name: catName }
        ]);
      }
    } catch (err) {
      console.error('Drilldown fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBreadcrumbClick = (idx) => {
    if (idx === 0) {
      loadLevel('ROOT');
    }
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentLevel = breadcrumbs[breadcrumbs.length - 1].level;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end animate-fadeIn"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-slideLeft"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${
              isProfit 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {isProfit ? <TrendingUp className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isProfit 
                  ? 'Genuine gross profit, COGS cost and margin % computed from invoices & purchase batches.'
                  : 'Power BI Progressive Disclosure: Drill into categories, SKUs, and invoices without scrolling.'
                }
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Executive Summary Card (Sticky at top of drawer) */}
        {summary && (
          <div className="px-5 sm:px-6 pt-4 pb-2 bg-slate-950/70 border-b border-slate-800/80">
            {isProfit ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Invoiced</span>
                  <div className="text-xs sm:text-sm font-black text-white font-mono mt-0.5 truncate">
                    ₹{parseFloat(summary.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">COGS (Cost)</span>
                  <div className="text-xs sm:text-sm font-black text-rose-400/90 font-mono mt-0.5 truncate">
                    ₹{parseFloat(summary.total_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Net Gross Profit</span>
                  <div className="text-xs sm:text-sm font-black text-emerald-400 font-mono mt-0.5 truncate">
                    +₹{parseFloat(summary.total_profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Gross Margin</span>
                  <div className="text-xs sm:text-sm font-black text-emerald-400 font-mono mt-0.5 truncate flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5" />
                    {parseFloat(summary.margin_pct || 0).toFixed(1)}%
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Revenue</span>
                  <div className="text-sm sm:text-base font-black text-amber-400 font-mono mt-0.5">
                    ₹{parseFloat(summary.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Catalog Scope</span>
                  <div className="text-xs font-bold text-slate-300 font-mono mt-0.5">
                    {summary.total_categories ? `${summary.total_categories} Categories` : `${summary.total_products || 0} Products`}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Interactive Breadcrumb Navigation Trail */}
        <div className="px-5 sm:px-6 py-3 bg-slate-950 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs">
          {(breadcrumbs || []).map((b, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
              <button
                onClick={() => handleBreadcrumbClick(idx)}
                className={`font-bold transition-colors whitespace-nowrap ${
                  idx === (breadcrumbs?.length || 0) - 1 
                    ? (isProfit ? 'text-emerald-400 cursor-default font-black' : 'text-amber-400 cursor-default font-black')
                    : 'text-slate-400 hover:text-white underline decoration-slate-700'
                }`}
              >
                {b?.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Drilldown Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-slate-800/40 rounded-2xl"></div>
              ))}
            </div>
          ) : currentLevel === 'ROOT' ? (
            /* LEVEL 1: Categories Breakdown */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
                <span>Category Name</span>
                <span>{isProfit ? 'Net Profit & Margins' : 'Invoiced Value & Breakdown'}</span>
              </div>
              {(items || []).map(cat => (
                <div
                  key={cat?.id}
                  onClick={() => loadLevel('CATEGORY', cat?.id, cat?.name)}
                  className={`bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex items-center justify-between transition-all hover:scale-[1.01] cursor-pointer group shadow-sm ${
                    isProfit ? 'hover:border-emerald-500/60' : 'hover:border-amber-500/60'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-2">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0 ${
                      isProfit 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className={`text-sm font-bold text-white transition-colors truncate ${
                        isProfit ? 'group-hover:text-emerald-400' : 'group-hover:text-amber-400'
                      }`}>
                        {cat?.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                        {cat?.products_count ?? 0} active SKU(s) • {cat?.units_sold ?? 0} units sold
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      {isProfit ? (
                        <>
                          <div className="text-sm font-black text-emerald-400 font-mono">
                            +₹{parseFloat(cat?.profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Rev: ₹{parseFloat(cat?.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })} • <span className="text-emerald-400 font-bold">{cat?.margin_pct}% margin</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-black text-white font-mono">
                            ₹{parseFloat(cat?.value || cat?.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Click to Drill In
                          </div>
                        </>
                      )}
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-600 group-hover:translate-x-0.5 transition-all ${
                      isProfit ? 'group-hover:text-emerald-400' : 'group-hover:text-amber-400'
                    }`} />
                  </div>
                </div>
              ))}
              {(!items || items.length === 0) && (
                <div className="text-center py-10 text-slate-400 text-xs font-medium">
                  No active categories recorded.
                </div>
              )}
            </div>
          ) : (
            /* LEVEL 2: Products within Category */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => loadLevel('ROOT')}
                  className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to All Categories
                </button>
                <span className="text-xs text-slate-500 font-semibold">
                  {items?.length || 0} SKUs in {selectedCategory?.name || 'Category'}
                </span>
              </div>

              {(items || []).map(prod => (
                <div
                  key={prod?.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <ProductVisualBadge product={prod} size="lg" />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{prod?.name}</h4>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                          {prod?.sku} • {prod?.brand || 'Wholesale'} • In Stock: {prod?.current_stock ?? 0}
                        </p>
                        {isProfit && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Sell: ₹{parseFloat(prod?.base_price || 0).toFixed(2)} | Cost: ₹{parseFloat(prod?.unit_cost || 0).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isProfit ? (
                        <>
                          <div className="text-xs font-black text-emerald-400 font-mono">
                            +₹{parseFloat(prod?.profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {prod?.units_sold ?? 0} sold • Rev: ₹{parseFloat(prod?.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                          </div>
                          <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                            {prod?.margin_pct}% margin
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs font-black text-amber-400 font-mono">
                            ₹{parseFloat(prod?.revenue || prod?.value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Base: ₹{parseFloat(prod?.base_price || 0).toFixed(2)} • {prod?.units_sold ?? 0} sold
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              {(!items || items.length === 0) && (
                <div className="text-center py-10 text-slate-400 text-xs font-medium">
                  No products found in this category.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span>RAIS Progressive Disclosure Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
          >
            Close Deep-Dive
          </button>
        </div>
      </div>
    </div>
  );
};
