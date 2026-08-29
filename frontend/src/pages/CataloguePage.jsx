import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  PlusCircle, 
  Edit3, 
  Share2, 
  LayoutGrid, 
  List, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Sparkles
} from 'lucide-react';
import { catalogueApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ProductModal } from '../components/ProductModal';
import { WhatsAppPriceListModal } from '../components/WhatsAppPriceListModal';

export const CataloguePage = ({ onOpenOrderForProduct }) => {
  const { hasRole } = useAuth();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [sortBy, setSortBy] = useState('name_asc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [priceListModalOpen, setPriceListModalOpen] = useState(false);

  useEffect(() => {
    loadCatalogue();
  }, []);

  const loadCatalogue = async () => {
    setLoading(true);
    try {
      const [cats, prods] = await Promise.all([
        catalogueApi.listCategories(),
        catalogueApi.listProducts({ limit: 500 })
      ]);
      setCategories(cats);
      setProducts(prods);
    } catch (err) {
      console.error('Failed to load catalogue', err);
    } finally {
      setLoading(false);
    }
  };

  // Distinct Brands
  const uniqueBrands = Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort();

  // Filter & Sort Logic
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'ALL' || p.category_id === selectedCategory;
    const matchesBrand = selectedBrand === 'ALL' || p.brand === selectedBrand;
    if (!matchesCat || !matchesBrand) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      p.brand.toLowerCase().includes(term) ||
      p.packaging_unit.toLowerCase().includes(term) ||
      (p.hsn_code && p.hsn_code.toLowerCase().includes(term))
    );
  }).sort((a, b) => {
    if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
    if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
    if (sortBy === 'price_asc') return parseFloat(a.base_price) - parseFloat(b.base_price);
    if (sortBy === 'price_desc') return parseFloat(b.base_price) - parseFloat(a.base_price);
    if (sortBy === 'stock_desc') return parseFloat(b.current_stock || 0) - parseFloat(a.current_stock || 0);
    if (sortBy === 'stock_asc') return parseFloat(a.current_stock || 0) - parseFloat(b.current_stock || 0);
    return 0;
  });

  const handleOpenAddModal = () => {
    setProductToEdit(null);
    setProductModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setProductToEdit(product);
    setProductModalOpen(true);
  };

  const handleProductSaved = () => {
    loadCatalogue();
  };

  // Stock status helper
  const getStockStatus = (prod) => {
    const current = parseFloat(prod.current_stock || 0);
    const minAlert = parseFloat(prod.min_stock_alert || 10);
    if (current <= 0) return { label: 'Out of Stock', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: XCircle };
    if (current <= minAlert) return { label: `Low Stock (${current})`, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: AlertTriangle };
    return { label: `In Stock (${current})`, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 };
  };

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
            Verified master inventory & wholesale pricing for frozen foods, sauces, dairy, spices, and packaging
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setPriceListModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs uppercase tracking-wider transition-all"
            title="Generate formatted wholesale price sheet for WhatsApp"
          >
            <Share2 className="w-4 h-4 text-emerald-400" />
            <span>WhatsApp Price List</span>
          </button>

          {hasRole(['ADMIN', 'OPERATOR']) && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Add New Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
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
            {cat.name} ({cat.product_count || products.filter(p => p.category_id === cat.id).length})
          </button>
        ))}
      </div>

      {/* Search, Filter Toolbar & View Toggle */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product name, SKU, brand, or packaging..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
          />
        </div>

        {/* Controls (Brand, Sort, View) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Brand Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Brands</option>
              {uniqueBrands.map(b => (
                <option key={b} value={b} className="bg-slate-900">{b}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="name_asc" className="bg-slate-900">Name (A–Z)</option>
              <option value="name_desc" className="bg-slate-900">Name (Z–A)</option>
              <option value="price_asc" className="bg-slate-900">Price (Low to High)</option>
              <option value="price_desc" className="bg-slate-900">Price (High to Low)</option>
              <option value="stock_desc" className="bg-slate-900">Stock (Highest First)</option>
              <option value="stock_asc" className="bg-slate-900">Stock (Lowest First)</option>
            </select>
          </div>

          {/* View Switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              title="Master Spreadsheet Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-400 font-semibold pl-2 hidden lg:block">
            Showing <span className="text-amber-400 font-bold">{filteredProducts.length}</span> SKUs
          </p>
        </div>
      </div>

      {/* Product Content: Grid Mode vs Table Mode */}
      {loading ? (
        <div className="bg-slate-900 rounded-xl border border-slate-800 py-16 text-center text-slate-500 text-xs">
          Loading master catalogue items...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-slate-900 rounded-xl border border-slate-800 py-16 text-center text-slate-500 text-xs">
          No products found matching your search or filters.
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p) => {
            const base = parseFloat(p.base_price);
            const tax = parseFloat(p.tax_rate || 0);
            const finalPrice = base + (base * (tax / 100));
            const stockStatus = getStockStatus(p);
            const StockIcon = stockStatus.icon;

            return (
              <div
                key={p.id}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 flex flex-col justify-between shadow-sm transition-all group relative"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono font-bold text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {p.sku}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {p.brand}
                    </span>
                  </div>

                  {/* Product Title */}
                  <h3 className="font-bold text-xs text-white group-hover:text-amber-400 transition-colors leading-snug line-clamp-2">
                    {p.name}
                  </h3>

                  {/* Packaging Unit & Category */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
                    <span>Pack: <strong className="text-slate-300">{p.packaging_unit}</strong></span>
                    <span className="text-[10px] text-slate-400 uppercase">{p.category_name}</span>
                  </div>

                  {/* Live Stock Availability Badge */}
                  <div className="mt-2.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${stockStatus.color}`}>
                      <StockIcon className="w-3 h-3 shrink-0" />
                      <span>{stockStatus.label}</span>
                    </span>
                  </div>
                </div>

                {/* Pricing Breakdown & Quick Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-end justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Wholesale Base</span>
                    <p className="text-base font-black font-mono text-amber-400">
                      ₹{base.toFixed(2)}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400">
                      +GST {tax}% = <span className="font-bold text-slate-300">₹{finalPrice.toFixed(2)}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {hasRole(['ADMIN', 'OPERATOR']) && (
                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 rounded-lg text-xs transition-colors"
                        title="Edit Master SKU"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* SPREADSHEET TABLE VIEW */
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Master SKU</th>
                  <th className="py-3 px-4">Product Description</th>
                  <th className="py-3 px-3">Brand</th>
                  <th className="py-3 px-3">Pack Unit</th>
                  <th className="py-3 px-3 text-center">Live Stock</th>
                  <th className="py-3 px-3 text-right">Base Rate (₹)</th>
                  <th className="py-3 px-3 text-right">GST Rate</th>
                  <th className="py-3 px-3 text-right">Bill Rate (₹)</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredProducts.map((p) => {
                  const base = parseFloat(p.base_price);
                  const tax = parseFloat(p.tax_rate || 0);
                  const finalPrice = base + (base * (tax / 100));
                  const stockStatus = getStockStatus(p);
                  const StockIcon = stockStatus.icon;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-amber-400">
                        {p.sku}
                      </td>
                      <td className="py-2.5 px-4">
                        <p className="font-bold text-slate-200">{p.name}</p>
                        <span className="text-[10px] text-slate-400">{p.category_name || 'General'}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-semibold">
                        {p.brand}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                        {p.packaging_unit}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${stockStatus.color}`}>
                          <StockIcon className="w-2.5 h-2.5" />
                          <span>{parseFloat(p.current_stock || 0).toFixed(0)}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                        ₹{base.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        {tax}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-200">
                        ₹{finalPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {hasRole(['ADMIN', 'OPERATOR']) && (
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 rounded-lg text-xs transition-colors"
                            title="Edit Master SKU"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProductModal
        isOpen={productModalOpen}
        onClose={() => {
          setProductModalOpen(false);
          setProductToEdit(null);
        }}
        productToEdit={productToEdit}
        categories={categories}
        onProductSaved={handleProductSaved}
      />

      <WhatsAppPriceListModal
        isOpen={priceListModalOpen}
        onClose={() => setPriceListModalOpen(false)}
        products={products}
        categories={categories}
      />
    </div>
  );
};
