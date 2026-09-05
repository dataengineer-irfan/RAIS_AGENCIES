import React, { useState, useMemo } from 'react';
import { Search, X, Plus, Check, Package, Sparkles } from 'lucide-react';

export const SmartProductSearchPicker = ({
  products = [],
  categories = [],
  onSelectProduct,
  quantitiesByProductId = {},
  compact = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Derive unique categories from products if category list is empty
  const categoryList = useMemo(() => {
    if (categories && categories.length > 0) {
      return [{ id: 'ALL', name: 'All SKUs' }, ...categories];
    }
    const catMap = new Map();
    products.forEach(p => {
      const cName = p.category_name || (typeof p.category === 'object' ? p.category?.name : p.category) || 'General';
      const cId = p.category_id || cName;
      if (!catMap.has(cId)) {
        catMap.set(cId, { id: cId, name: cName });
      }
    });
    return [{ id: 'ALL', name: 'All SKUs' }, ...Array.from(catMap.values())];
  }, [products, categories]);

  // Filter products by search term and selected category
  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter(p => {
      const matchesCat = selectedCategory === 'ALL' || 
        String(p.category_id) === String(selectedCategory) ||
        p.category_name === selectedCategory ||
        p.category === selectedCategory;

      if (!matchesCat) return false;
      if (!term) return true;

      const nameMatch = (p.name || '').toLowerCase().includes(term);
      const skuMatch = (p.sku || '').toLowerCase().includes(term);
      const catMatch = ((p.category_name || (typeof p.category === 'string' ? p.category : p.category?.name)) || '').toLowerCase().includes(term);

      return nameMatch || skuMatch || catMatch;
    });
  }, [products, searchTerm, selectedCategory]);

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-3">
      {/* ─── Search Bar ─── */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Type product name, e.g. fre, nugget, burger, cheese..."
          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all font-medium"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ─── Category Filter Chips ─── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
        {categoryList.map(cat => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg font-semibold shrink-0 transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* ─── Matching Count & Results Header ─── */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>
          {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} {searchTerm ? `matching "${searchTerm}"` : 'available'}
        </span>
        {searchTerm && (
          <span className="text-amber-400/90 font-medium">Tap product or + Add</span>
        )}
      </div>

      {/* ─── Product Results Scrollable List ─── */}
      <div className="max-h-56 sm:max-h-64 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
        {filteredProducts.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            No products found matching <strong className="text-slate-300">"{searchTerm}"</strong>
          </div>
        ) : (
          filteredProducts.map(prod => {
            const currentQty = quantitiesByProductId[prod.id] || 0;
            const price = parseFloat(prod.base_price || 0);
            const stock = parseFloat(prod.current_stock ?? 0);
            const isAdded = currentQty > 0;

            return (
              <div
                key={prod.id}
                onClick={() => onSelectProduct(prod)}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.99] ${
                  isAdded
                    ? 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/15'
                    : 'bg-slate-900/90 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                {/* Left: Product Info */}
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-bold truncate ${isAdded ? 'text-amber-300' : 'text-slate-100'}`}>
                      {prod.name}
                    </p>
                    {isAdded && (
                      <span className="px-1.5 py-0.2 text-[9px] font-black rounded bg-amber-500 text-slate-950 shrink-0">
                        {currentQty} in bill
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span className="font-mono text-slate-500">{prod.sku}</span>
                    <span>•</span>
                    <span className="font-medium text-slate-300">{prod.packaging_unit || 'PKT'}</span>
                    <span>•</span>
                    <span className={stock > 10 ? 'text-emerald-400 font-medium' : stock > 0 ? 'text-amber-400 font-medium' : 'text-rose-400 font-medium'}>
                      {stock > 0 ? `${stock} in stock` : 'Low / 0 Stock'}
                    </span>
                  </div>
                </div>

                {/* Right: Rate & Touch Add Button */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-black font-mono text-white">
                      ₹{price.toFixed(2)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProduct(prod);
                    }}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold transition-all ${
                      isAdded
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm shadow-amber-500/30'
                        : 'bg-slate-800 text-slate-200 hover:bg-amber-500 hover:text-slate-950 border border-slate-700'
                    }`}
                    title="Add product to invoice"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
