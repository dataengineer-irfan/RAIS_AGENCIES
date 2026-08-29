import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Layers, ArrowLeft, ArrowUpRight, TrendingUp, DollarSign, Package, FileText, CheckCircle2 } from 'lucide-react';
import { analyticsApi } from '../services/api';
import { getProductVisualIcon } from '../utils/productIcons';

export const DrillableMetricModal = ({ 
  isOpen, 
  onClose, 
  metricType = 'revenue', 
  title = 'Revenue Deep-Dive & Multi-Level Drilldown'
}) => {
  // Breadcrumb Trail State: e.g. [ { level: 'ROOT', name: 'All Revenue' }, { level: 'CATEGORY', id: '...', name: 'Chicken Items' }, ... ]
  const [breadcrumbs, setBreadcrumbs] = useState([{ level: 'ROOT', name: 'All Categories' }]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadLevel('ROOT');
    }
  }, [isOpen, metricType]);

  const loadLevel = async (level, catId = null, catName = '') => {
    setLoading(true);
    try {
      if (level === 'ROOT') {
        const res = await analyticsApi.getDrilldown('revenue', 'category');
        setItems(res.items || []);
        setBreadcrumbs([{ level: 'ROOT', name: 'All Categories' }]);
        setSelectedCategory(null);
      } else if (level === 'CATEGORY') {
        const res = await analyticsApi.getDrilldown('revenue', 'product', catId);
        setItems(res.items || []);
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

  if (!isOpen) return null;

  const currentLevel = breadcrumbs[breadcrumbs.length - 1].level;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-slideLeft"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-wide">{title}</h3>
              <p className="text-xs text-slate-400">
                Power BI Progressive Disclosure: Drill into categories, SKUs, and invoices without scrolling.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Breadcrumb Navigation Trail */}
        <div className="px-6 py-3 bg-slate-950 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs">
          {breadcrumbs.map((b, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
              <button
                onClick={() => handleBreadcrumbClick(idx)}
                className={`font-bold transition-colors whitespace-nowrap ${
                  idx === breadcrumbs.length - 1 
                    ? 'text-amber-400 cursor-default font-black' 
                    : 'text-slate-400 hover:text-white underline decoration-slate-700'
                }`}
              >
                {b.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Drilldown Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                <span>Invoiced Value & Breakdown</span>
              </div>
              {items.map(cat => (
                <div
                  key={cat.id}
                  onClick={() => loadLevel('CATEGORY', cat.id, cat.name)}
                  className="bg-slate-950/70 border border-slate-800 hover:border-amber-500/60 rounded-2xl p-4 flex items-center justify-between transition-all hover:scale-[1.01] cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                        {cat.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono">
                        {cat.products_count} active product SKU(s)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-black text-white font-mono">
                        ₹{cat.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Click to Drill In
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
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
                  {items.length} SKUs in {selectedCategory?.name}
                </span>
              </div>

              {items.map(prod => {
                const visual = getProductVisualIcon(prod);
                return (
                  <div
                    key={prod.id}
                    className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl shadow-inner">
                        {visual.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{prod.name}</h4>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {prod.sku} • {prod.brand || 'Wholesale'} • Stock: {prod.current_stock}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-amber-400 font-mono">
                        Base Rate: ₹{prod.base_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Holding: ₹{prod.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                );
              })}
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
