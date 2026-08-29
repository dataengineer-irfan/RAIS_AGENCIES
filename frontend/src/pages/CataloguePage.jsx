import React, { useState, useEffect } from 'react';
import { Package, Search, Tag, Filter, Layers, CheckCircle } from 'lucide-react';
import { catalogueApi } from '../services/api';

export const CataloguePage = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCatalogue();
  }, []);

  const loadCatalogue = async () => {
    setLoading(true);
    try {
      const [cats, prods] = await Promise.all([
        catalogueApi.listCategories(),
        catalogueApi.listProducts({ limit: 200 })
      ]);
      setCategories(cats);
      setProducts(prods);
    } catch (err) {
      console.error('Failed to load catalogue', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'ALL' || p.category_id === selectedCategory;
    if (!matchesCat) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      p.brand.toLowerCase().includes(term) ||
      p.packaging_unit.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" />
            <span>Authoritative RAIS Agencies Catalogue</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Verified master inventory & pricing for frozen foods, sauces, dairy, spices, and packaging
          </p>
        </div>
        <div className="px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 font-mono text-xs font-bold self-start sm:self-auto">
          {products.length} Official Master SKUs
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition-all ${
            selectedCategory === 'ALL'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          All Items ({products.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition-all ${
              selectedCategory === cat.id
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {cat.name} ({cat.product_count})
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product name, SKU, or partner brand..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>
        <p className="text-xs text-slate-400 font-semibold hidden sm:block">
          Showing <span className="text-amber-400 font-bold">{filteredProducts.length}</span> SKUs
        </p>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            Loading master catalogue items...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            No products found matching your search.
          </div>
        ) : (
          filteredProducts.map((p) => (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono font-bold text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {p.sku}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {p.brand}
                  </span>
                </div>

                <h3 className="font-bold text-xs text-white group-hover:text-amber-400 transition-colors leading-snug line-clamp-2">
                  {p.name}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  Pack Unit: <span className="text-slate-300 font-semibold">{p.packaging_unit}</span>
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold">Wholesale Rate</span>
                  <p className="text-base font-black font-mono text-amber-400">
                    ₹{parseFloat(p.base_price).toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-500 uppercase font-bold">Applicable GST</span>
                  <p className="text-xs font-mono font-semibold text-slate-300">
                    {p.tax_rate}%
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
