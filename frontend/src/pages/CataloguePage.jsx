import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowUp,
  ArrowDown,
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  FileImage,
  ShieldCheck,
  Snowflake,
  Truck,
  DollarSign,
  Download,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles
} from 'lucide-react';
import { catalogueApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ProductModal } from '../components/ProductModal';
import { WhatsAppPriceListModal } from '../components/WhatsAppPriceListModal';
import { OfficialFlyerModal } from '../components/OfficialFlyerModal';
import { getProductVisualIcon, PARTNER_BRANDS } from '../utils/productIcons';

export const CataloguePage = ({ onOpenOrderForProduct }) => {
  const { hasRole } = useAuth();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' (hierarchical table) or 'grid' (cards)
  const [loading, setLoading] = useState(true);

  // Multi-Column Sort State
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Collapsed Category Group IDs
  const [collapsedCategories, setCollapsedCategories] = useState({});

  // Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [priceListModalOpen, setPriceListModalOpen] = useState(false);
  const [flyerModalOpen, setFlyerModalOpen] = useState(false);

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
      setCategories(Array.isArray(cats) ? cats : []);
      setProducts(Array.isArray(prods) ? prods : (prods?.items || prods?.data || []));
    } catch (err) {
      console.error('Failed to load catalogue', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategoryCollapse = (catId) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const uniqueBrands = useMemo(() => {
    return Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort();
  }, [products]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = selectedCategory === 'ALL' || p.category_id === selectedCategory;
      const matchesBrand = selectedBrand === 'ALL' || p.brand === selectedBrand;
      if (!matchesCat || !matchesBrand) return false;

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        (p.name || '').toLowerCase().includes(term) ||
        (p.sku || '').toLowerCase().includes(term) ||
        (p.brand || '').toLowerCase().includes(term) ||
        (p.category_name || '').toLowerCase().includes(term)
      );
    }).sort((a, b) => {
      let aVal = a[sortField] ?? '';
      let bVal = b[sortField] ?? '';

      if (['base_price', 'tax_rate', 'current_stock', 'min_stock_alert'].includes(sortField)) {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [products, selectedCategory, selectedBrand, searchTerm, sortField, sortAsc]);

  // Grouped by Category for Hierarchical Matrix Cross-Tab
  const groupedCategories = useMemo(() => {
    const map = {};
    categories.forEach(c => {
      map[c.id] = { category: c, items: [] };
    });
    // Fallback category for unmapped
    map['other'] = { category: { id: 'other', name: 'General / Uncategorized' }, items: [] };

    filteredProducts.forEach(p => {
      const catId = p.category_id && map[p.category_id] ? p.category_id : 'other';
      map[catId].items.push(p);
    });

    return Object.values(map).filter(g => g.items.length > 0);
  }, [categories, filteredProducts]);

  const handleExportCSV = () => {
    const headers = ['SKU', 'Product Name', 'Brand', 'Category', 'Wholesale Price (₹)', 'Current Stock', 'Status'];
    const rows = filteredProducts.map(p => [
      `"${p.sku}"`,
      `"${p.name}"`,
      `"${p.brand || ''}"`,
      `"${p.category_name || ''}"`,
      p.base_price,
      p.current_stock,
      p.is_active ? 'ACTIVE' : 'INACTIVE'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RAIS_Catalogue_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden gap-2">
      
      {/* ─── TOP ACTION & TOOLBAR BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 shrink-0 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white">
                Commercial Product Catalogue Matrix
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-amber-400 rounded-full border border-slate-700 font-mono">
                {products.length} Active SKUs
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Pattern #3 Hierarchical Matrix Cross-Tab with Multi-Column Sorting & Brand Grouping
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search SKU, name, brand..."
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-36 sm:w-48"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer max-w-[130px] truncate"
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer max-w-[110px] truncate"
          >
            <option value="ALL">All Brands</option>
            {uniqueBrands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('matrix')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'matrix' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
              title="Hierarchical Matrix View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
              title="Product Cards Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action CTAs */}
          <button
            onClick={handleExportCSV}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setFlyerModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition-all"
            title="Commercial Catalogue Flyer"
          >
            <FileImage className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Flyer</span>
          </button>

          {hasRole(['ADMIN', 'OPERATOR']) && (
            <button
              onClick={() => {
                setProductToEdit(null);
                setProductModalOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all hover:scale-105"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ SKU</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── HIERARCHICAL MATRIX CROSS-TAB CONTAINER (100% Viewport-Locked) ─── */}
      <div className="flex-1 min-h-0 bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-xl flex flex-col overflow-hidden">
        
        {viewMode === 'matrix' ? (
          /* MATRIX TABLE MODE */
          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-950 z-20 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                <tr>
                  <th className="py-2.5 px-3 cursor-pointer select-none hover:text-white" onClick={() => handleSort('sku')}>
                    <div className="flex items-center gap-1">
                      <span>SKU Code</span>
                      {sortField === 'sku' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />) : <ArrowUpDown className="w-2.5 h-2.5 text-slate-600" />}
                    </div>
                  </th>
                  <th className="py-2.5 px-3 cursor-pointer select-none hover:text-white" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">
                      <span>Product Description</span>
                      {sortField === 'name' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />) : <ArrowUpDown className="w-2.5 h-2.5 text-slate-600" />}
                    </div>
                  </th>
                  <th className="py-2.5 px-3 cursor-pointer select-none hover:text-white" onClick={() => handleSort('brand')}>
                    <div className="flex items-center gap-1">
                      <span>Brand</span>
                      {sortField === 'brand' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />) : <ArrowUpDown className="w-2.5 h-2.5 text-slate-600" />}
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-right cursor-pointer select-none hover:text-white" onClick={() => handleSort('base_price')}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Wholesale Rate</span>
                      {sortField === 'base_price' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />) : <ArrowUpDown className="w-2.5 h-2.5 text-slate-600" />}
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-right cursor-pointer select-none hover:text-white" onClick={() => handleSort('current_stock')}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Stock (Pk)</span>
                      {sortField === 'current_stock' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />) : <ArrowUpDown className="w-2.5 h-2.5 text-slate-600" />}
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-500 text-xs">
                      Loading hierarchical catalogue matrix...
                    </td>
                  </tr>
                ) : groupedCategories.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-500 text-xs">
                      No matching product SKUs found.
                    </td>
                  </tr>
                ) : (
                  groupedCategories.map(group => {
                    const isCollapsed = collapsedCategories[group.category.id];
                    const catTotalStock = group.items.reduce((s, p) => s + (p.current_stock || 0), 0);
                    const catTotalVal = group.items.reduce((s, p) => s + ((p.current_stock || 0) * (p.base_price || 0)), 0);

                    return (
                      <React.Fragment key={group.category.id}>
                        {/* CATEGORY GROUP HEADER ROW */}
                        <tr 
                          onClick={() => toggleCategoryCollapse(group.category.id)}
                          className="bg-slate-950/90 border-t-2 border-b border-slate-800 cursor-pointer select-none hover:bg-slate-850 transition-colors"
                        >
                          <td colSpan="7" className="py-2 px-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {isCollapsed ? (
                                  <ChevronRight className="w-4 h-4 text-amber-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-amber-400" />
                                )}
                                <span className="font-bold text-white text-xs uppercase tracking-wider">
                                  {group.category.name}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-800 text-amber-400 font-mono">
                                  {group.items.length} SKUs
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
                                <span>Total Stock: <strong className="text-slate-200">{catTotalStock} pk</strong></span>
                                <span>Inventory Val: <strong className="text-emerald-400">₹{catTotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* CHILD SKU ROWS */}
                        {!isCollapsed && group.items.map(prod => {
                          const isLowStock = (prod.current_stock || 0) <= (prod.min_stock_alert || 5);

                          return (
                            <tr 
                              key={prod.id} 
                              className="border-b border-slate-800/50 hover:bg-slate-950/40 transition-colors group"
                            >
                              <td className="py-2 px-3 font-mono font-bold text-amber-400 text-xs pl-6">
                                {prod.sku}
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-200 text-xs group-hover:text-white">
                                    {prod.name}
                                  </span>
                                  {prod.unit && (
                                    <span className="text-[9px] text-slate-500 font-mono">({prod.unit})</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-slate-300 font-semibold text-xs">
                                {prod.brand || 'RAIS'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-white text-xs">
                                ₹{parseFloat(prod.base_price || 0).toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-xs">
                                <span className={isLowStock ? 'text-rose-400' : 'text-slate-200'}>
                                  {prod.current_stock || 0}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                  prod.is_active ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}>
                                  {prod.is_active ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {hasRole(['ADMIN', 'OPERATOR']) && (
                                    <button
                                      onClick={() => {
                                        setProductToEdit(prod);
                                        setProductModalOpen(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded transition-colors"
                                      title="Edit SKU"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* GRID CARDS MODE */
          <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-1">
            {filteredProducts.map(prod => (
              <div 
                key={prod.id}
                className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between hover:border-amber-500/40 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-amber-400">{prod.sku}</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase">{prod.brand}</span>
                  </div>
                  <h4 className="font-bold text-white text-xs mt-1 line-clamp-1 group-hover:text-amber-300">
                    {prod.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{prod.category_name}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">Base Rate</span>
                    <span className="text-sm font-black text-white font-mono">₹{parseFloat(prod.base_price || 0).toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-500 uppercase font-bold block">Stock</span>
                    <span className="text-xs font-bold text-slate-300 font-mono">{prod.current_stock || 0} pk</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ─── PRODUCT EDIT / CREATE MODAL ─── */}
      <ProductModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        productToEdit={productToEdit}
        categories={categories}
        onProductSaved={() => {
          setProductModalOpen(false);
          loadCatalogue();
        }}
      />

      {/* ─── OFFICIAL FLYER MODAL ─── */}
      <OfficialFlyerModal
        isOpen={flyerModalOpen}
        onClose={() => setFlyerModalOpen(false)}
        categories={categories}
        products={products}
      />

    </div>
  );
};
