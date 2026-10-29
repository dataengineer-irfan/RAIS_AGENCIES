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
  Tag,
  Download,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
  MessageSquare,
  Globe,
  ExternalLink
} from 'lucide-react';
import { catalogueApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ProductModal } from '../components/ProductModal';
import { WhatsAppPriceListModal } from '../components/WhatsAppPriceListModal';
import { OfficialFlyerModal } from '../components/OfficialFlyerModal';
import { QuickPriceModal } from '../components/QuickPriceModal';
import { BulkPriceAdjustModal } from '../components/BulkPriceAdjustModal';
import { getProductVisualIcon, ProductVisualBadge, PARTNER_BRANDS } from '../utils/productIcons';

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
  const [quickPriceProduct, setQuickPriceProduct] = useState(null);
  const [bulkPriceModalOpen, setBulkPriceModalOpen] = useState(false);

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

  const handleToggleExpandAll = () => {
    const isAnyCollapsed = Object.values(collapsedCategories).some(v => v === true);
    if (isAnyCollapsed) {
      // Expand all
      setCollapsedCategories({});
    } else {
      // Collapse all
      const newCollapsed = {};
      categories.forEach(c => { newCollapsed[c.id] = true; });
      newCollapsed['other'] = true;
      setCollapsedCategories(newCollapsed);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleSortChange = (value) => {
    switch (value) {
      case 'sku_asc':
        setSortField('sku');
        setSortAsc(true);
        break;
      case 'name_asc':
        setSortField('name');
        setSortAsc(true);
        break;
      case 'name_desc':
        setSortField('name');
        setSortAsc(false);
        break;
      case 'price_desc':
        setSortField('base_price');
        setSortAsc(false);
        break;
      case 'price_asc':
        setSortField('base_price');
        setSortAsc(true);
        break;
      case 'stock_desc':
        setSortField('current_stock');
        setSortAsc(false);
        break;
      case 'stock_asc':
        setSortField('current_stock');
        setSortAsc(true);
        break;
      default:
        break;
    }
  };

  const currentSortKey = useMemo(() => {
    if (sortField === 'sku' && sortAsc) return 'sku_asc';
    if (sortField === 'name' && sortAsc) return 'name_asc';
    if (sortField === 'name' && !sortAsc) return 'name_desc';
    if (sortField === 'base_price' && !sortAsc) return 'price_desc';
    if (sortField === 'base_price' && sortAsc) return 'price_asc';
    if (sortField === 'current_stock' && !sortAsc) return 'stock_desc';
    if (sortField === 'current_stock' && sortAsc) return 'stock_asc';
    return 'name_asc';
  }, [sortField, sortAsc]);

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
      {/* ─── TOP ACTION & FILTER HEADER BAR ─── */}
      {/* ─── DESKTOP UNIFIED COMMAND RIBBON (>= md) ─── */}
      <div className="hidden md:flex flex-col gap-2 bg-slate-900/95 border border-slate-800 rounded-2xl p-2.5 shrink-0 shadow-md">
        {/* Tier 1: Title, Count Badge & Utility Action Launchers */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Icon & Title */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Package className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-white whitespace-nowrap">
                Product Catalogue
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-amber-400 rounded-full border border-slate-700 font-mono">
                {filteredProducts.length}/{products.length} SKUs
              </span>
            </div>
          </div>

          {/* Right: Action Launchers (Clean, Spaced, No Overlap) */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {/* View Toggle */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('matrix')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'matrix' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="List / Matrix View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="Cards Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            {viewMode === 'matrix' && (
              <button
                onClick={handleToggleExpandAll}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                title="Expand / Collapse All Categories"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {Object.values(collapsedCategories).some(v => v === true) ? 'Expand' : 'Collapse'}
                </span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setPriceListModalOpen(true)}
              className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
              title="WhatsApp Wholesale Price List"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={() => setFlyerModalOpen(true)}
              className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
              title="Official PDF Price Flyer"
            >
              <FileImage className="w-3.5 h-3.5" />
              <span>Price Flyer</span>
            </button>

            <a
              href="/catalogue.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-sm"
              title="Open Public Customer Photo Catalogue (Photos & Pack Sizes)"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Photo Catalogue</span>
              <ExternalLink className="w-3 h-3 text-amber-400/80" />
            </a>

            {hasRole(['ADMIN', 'OPERATOR']) && (
              <>
                <button
                  onClick={() => setBulkPriceModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all shrink-0"
                  title="Category Bulk Wholesale Price Adjuster"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>₹ Bulk Rates</span>
                </button>

                <button
                  onClick={() => {
                    setProductToEdit(null);
                    setProductModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all hover:scale-105 shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ SKU</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tier 2: Search Input, Category Filter Pills, Brand & Sort */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
          {/* Search Input with Clear */}
          <div className="relative min-w-[180px] max-w-[240px] shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter SKU, name, brand..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-inner font-sans"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold p-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {/* 1-Click Category Filter Pills (Full Room, Horizontal Scroll) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0 py-0.5">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                selectedCategory === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All ({products.length})
            </button>
            {categories.map(c => {
              const count = products.filter(p => p.category_id === c.id).length;
              const isSelected = selectedCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(isSelected ? 'ALL' : c.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{c.name}</span>
                  <span className="font-mono text-[10px] opacity-80">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Brand Filter */}
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer max-w-[130px] truncate shrink-0 shadow-inner"
            title="Filter by Brand"
          >
            <option value="ALL">All Brands ({uniqueBrands.length})</option>
            {uniqueBrands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Sort Filter */}
          <select
            value={currentSortKey}
            onChange={(e) => handleSortChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer shrink-0 shadow-inner"
            title="Sort Products"
          >
            <option value="name_asc">🔤 Name (A → Z)</option>
            <option value="name_desc">🔤 Name (Z → A)</option>
            <option value="sku_asc">🏷️ SKU (A → Z)</option>
            <option value="price_desc">💰 Price: High → Low</option>
            <option value="price_asc">💰 Price: Low → High</option>
            <option value="stock_desc">📦 Stock: High → Low</option>
            <option value="stock_asc">📦 Stock: Low → High</option>
          </select>
        </div>
      </div>

        {/* ─── MOBILE FILTER & CHIP CONTROLS (< md) ─── */}
        <div className="md:hidden flex flex-col gap-2">
          {/* Mobile Search & View Switcher */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search SKU, name, brand..."
                className="w-full pl-9 pr-7 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-sm"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                  ✕
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 shrink-0">
              <button
                onClick={() => setViewMode('matrix')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'matrix' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* WhatsApp Price List Share Button */}
            <button
              onClick={() => setPriceListModalOpen(true)}
              className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl shrink-0"
              title="WhatsApp Price List"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {hasRole(['ADMIN', 'OPERATOR']) && (
              <button
                onClick={() => {
                  setProductToEdit(null);
                  setProductModalOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md shrink-0 active:scale-95 transition"
                title="Add New SKU"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ SKU</span>
              </button>
            )}
          </div>

          {/* Mobile Secondary Row: Brand & Sort Slicers */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer truncate"
              title="Filter by Brand"
            >
              <option value="ALL">All Brands ({uniqueBrands.length})</option>
              {uniqueBrands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <select
              value={currentSortKey}
              onChange={(e) => handleSortChange(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer truncate"
              title="Sort Products"
            >
              <option value="name_asc">🔤 Name (A-Z)</option>
              <option value="sku_asc">🏷️ SKU (A-Z)</option>
              <option value="price_desc">💰 Price (High-Low)</option>
              <option value="price_asc">💰 Price (Low-High)</option>
              <option value="stock_desc">📦 Stock (High-Low)</option>
              <option value="stock_asc">📦 Stock (Low-High)</option>
            </select>
          </div>

          {/* Swipeable Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                selectedCategory === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 border border-slate-800 text-slate-400'
              }`}
            >
              All SKUs ({products.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(selectedCategory === c.id ? 'ALL' : c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  selectedCategory === c.id
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 border border-slate-800 text-slate-400'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

      {/* ─── HIERARCHICAL MATRIX / CARDS CONTAINER ─── */}
      <div className="flex-1 min-h-0 bg-slate-900 rounded-2xl border border-slate-800 p-2 sm:p-3 shadow-xl flex flex-col overflow-hidden">
        
        {viewMode === 'matrix' ? (
          /* MATRIX MODE: Native mobile card layout on mobile, full scrollable table on tablet/desktop */
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            
            {/* MOBILE-ONLY CARD LIST (< 640px) */}
            <div className="sm:hidden flex-1 min-h-0 overflow-y-auto space-y-3 pr-0.5">
              {loading ? (
                <div className="space-y-2 p-2 animate-pulse">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-20 bg-slate-800/50 rounded-xl" />
                  ))}
                </div>
              ) : groupedCategories.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No matching product SKUs found.
                </div>
              ) : (
                groupedCategories.map(group => {
                  const isCollapsed = collapsedCategories[group.category.id];
                  const catTotalStock = group.items.reduce((s, p) => s + (parseFloat(p.current_stock) || 0), 0);
                  const catTotalVal = group.items.reduce((s, p) => s + ((parseFloat(p.current_stock) || 0) * (parseFloat(p.base_price) || 0)), 0);

                  return (
                    <div key={group.category.id} className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                      {/* Mobile Category Banner */}
                      <button
                        onClick={() => toggleCategoryCollapse(group.category.id)}
                        className="w-full py-2.5 px-3 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-2">
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-amber-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-amber-400" />
                          )}
                          <span className="font-bold text-white text-xs uppercase tracking-wider">
                            {group.category.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-400 font-mono">
                            {group.items.length}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          ₹{catTotalVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </button>

                      {/* Mobile SKU Card Rows */}
                      {!isCollapsed && (
                        <div className="p-2 space-y-2 bg-slate-900/40">
                          {group.items.map(prod => {
                            const isLowStock = (prod.current_stock || 0) <= (prod.min_stock_alert || 5);
                            return (
                              <div 
                                key={prod.id}
                                className="p-2.5 rounded-xl border border-slate-800/80 bg-slate-950/80 flex flex-col gap-1.5 shadow-sm"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-[11px] text-amber-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700 shadow-xs">
                                      {prod.sku}
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-400">
                                      {prod.brand || 'RAIS'}
                                    </span>
                                  </div>
                                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                    prod.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                                  }`}>
                                    {prod.is_active ? 'ACTIVE' : 'INACTIVE'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 min-w-0">
                                  <ProductVisualBadge product={prod} size="sm" />
                                  <h4 className="font-bold text-white text-xs leading-snug truncate">
                                    {prod.name} {prod.unit ? <span className="text-[10px] text-slate-500 font-normal">({prod.unit})</span> : ''}
                                  </h4>
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 mt-0.5">
                                  <div>
                                    <span className="text-[10px] text-slate-400 block">Wholesale Rate</span>
                                    <button
                                      type="button"
                                      onClick={() => hasRole(['ADMIN', 'OPERATOR']) && setQuickPriceProduct(prod)}
                                      className="inline-flex items-center gap-1 group/price hover:text-amber-300 transition-colors text-left"
                                      title="1-Tap Quick Price Tweak"
                                    >
                                      <span className="font-mono font-black text-sm text-amber-400 group-hover/price:underline">
                                        ₹{parseFloat(prod.base_price || 0).toFixed(2)}
                                      </span>
                                      {hasRole(['ADMIN', 'OPERATOR']) && (
                                        <Edit3 className="w-3 h-3 text-slate-500 group-hover/price:text-amber-400 opacity-60 group-hover/price:opacity-100" />
                                      )}
                                    </button>
                                  </div>

                                  <div className="text-right flex items-center gap-3">
                                    <div>
                                      <span className="text-[10px] text-slate-400 block">Depot Stock</span>
                                      <span className={`font-mono font-bold text-xs ${isLowStock ? 'text-rose-400' : 'text-slate-200'}`}>
                                        {prod.current_stock || 0} pk
                                      </span>
                                    </div>

                                    {hasRole(['ADMIN', 'OPERATOR']) && (
                                      <button
                                        onClick={() => {
                                          setProductToEdit(prod);
                                          setProductModalOpen(true);
                                        }}
                                        className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                                        title="Edit SKU"
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
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* DESKTOP/TABLET HORIZONTAL SCROLLABLE TABLE (>= 640px) */}
            <div className="hidden sm:block flex-1 min-h-0 overflow-auto">
              <table className="w-full min-w-[650px] text-left text-xs border-collapse">
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
                    const catTotalStock = group.items.reduce((s, p) => s + (parseFloat(p.current_stock) || 0), 0);
                    const catTotalVal = group.items.reduce((s, p) => s + ((parseFloat(p.current_stock) || 0) * (parseFloat(p.base_price) || 0)), 0);

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
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-mono">
                                  {group.items.length} SKUs
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
                                <span>Total Stock: <strong className="text-slate-200">{catTotalStock.toLocaleString('en-IN')} pk</strong></span>
                                <span>Inventory Val: <strong className="text-emerald-400">₹{catTotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
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
                              <td className="py-2 px-3 pl-6">
                                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 border border-slate-700 shadow-xs tracking-wide inline-block">
                                  {prod.sku}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <ProductVisualBadge product={prod} size="xs" />
                                  <span className="font-bold text-slate-200 text-xs group-hover:text-white truncate">
                                    {prod.name}
                                  </span>
                                  {prod.unit && (
                                    <span className="text-[9px] text-slate-500 font-mono shrink-0">({prod.unit})</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-slate-300 font-semibold text-xs">
                                {prod.brand || 'RAIS'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-white text-xs">
                                <button
                                  type="button"
                                  onClick={() => hasRole(['ADMIN', 'OPERATOR']) && setQuickPriceProduct(prod)}
                                  className="inline-flex items-center justify-end gap-1 group/price hover:text-amber-300 transition-colors ml-auto"
                                  title="1-Tap Quick Price Tweak"
                                >
                                  <span className="font-mono font-bold text-amber-400 group-hover/price:underline">
                                    ₹{parseFloat(prod.base_price || 0).toFixed(2)}
                                  </span>
                                  {hasRole(['ADMIN', 'OPERATOR']) && (
                                    <Edit3 className="w-3 h-3 text-slate-500 group-hover/price:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                                </button>
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
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 border border-slate-700 shadow-xs tracking-wide">
                      {prod.sku}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{prod.brand || 'RAIS'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 min-w-0">
                    <ProductVisualBadge product={prod} size="sm" />
                    <h4 className="font-bold text-white text-xs truncate group-hover:text-amber-300">
                      {prod.name}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{prod.category_name}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-bold block">Base Rate</span>
                    <button
                      type="button"
                      onClick={() => hasRole(['ADMIN', 'OPERATOR']) && setQuickPriceProduct(prod)}
                      className="inline-flex items-center gap-1 group/price hover:text-amber-300 transition-colors text-left"
                      title="1-Tap Quick Price Tweak"
                    >
                      <span className="text-sm font-extrabold text-amber-400 font-mono group-hover/price:underline">
                        ₹{parseFloat(prod.base_price || 0).toFixed(2)}
                      </span>
                      {hasRole(['ADMIN', 'OPERATOR']) && (
                        <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover/price:text-amber-400" />
                      )}
                    </button>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 uppercase font-bold block">Stock</span>
                    <span className="text-xs font-bold text-slate-200 font-mono">{prod.current_stock || 0} pk</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ─── QUICK PRICE TWEAK MODAL ─── */}
      <QuickPriceModal
        isOpen={Boolean(quickPriceProduct)}
        onClose={() => setQuickPriceProduct(null)}
        product={quickPriceProduct}
        onPriceUpdated={() => {
          setQuickPriceProduct(null);
          loadCatalogue();
        }}
      />

      {/* ─── BULK PRICE ADJUST MODAL ─── */}
      <BulkPriceAdjustModal
        isOpen={bulkPriceModalOpen}
        onClose={() => setBulkPriceModalOpen(false)}
        categories={categories}
        products={products}
        onPricesUpdated={() => {
          setBulkPriceModalOpen(false);
          loadCatalogue();
        }}
      />

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
