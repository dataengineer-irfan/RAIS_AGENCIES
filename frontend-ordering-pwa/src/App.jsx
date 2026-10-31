import React, { useState, useEffect, useMemo } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { storeApi } from './services/api';
import { HeaderNav } from './components/HeaderNav';
import { PromoHeroCarousel } from './components/PromoHeroCarousel';
import { CategoryBar } from './components/CategoryBar';
import { StudioProductCard } from './components/StudioProductCard';
import { Packaging3DViewerModal } from './components/Packaging3DViewerModal';
import { UpsellDrawer } from './components/UpsellDrawer';
import { FutureDropsSection } from './components/FutureDropsSection';
import { FloatingCartBar } from './components/FloatingCartBar';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { Search, X, Sparkles, RefreshCw, PhoneCall } from 'lucide-react';

const StoreFeed = () => {
  const { activeCategory, searchQuery, setSearchQuery } = useStore();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected3DProduct, setSelected3DProduct] = useState(null);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        storeApi.getProducts(),
        storeApi.getCategories()
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter products by active category & omni search
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Category filter
      if (activeCategory === 'RETAIL') {
        if (!p.is_retail) return false;
      } else if (activeCategory !== 'ALL') {
        const pCat = String(p.category_id || p.category_name || '').toLowerCase();
        const activeLower = String(activeCategory).toLowerCase();
        if (!pCat.includes(activeLower) && p.category_id !== activeCategory) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const match = 
          (p.name || '').toLowerCase().includes(query) ||
          (p.sku || '').toLowerCase().includes(query) ||
          (p.brand || '').toLowerCase().includes(query) ||
          (p.description || '').toLowerCase().includes(query);
        if (!match) return false;
      }

      return true;
    });
  }, [products, activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col max-w-xl mx-auto pb-28 relative">
      {/* 1. Header Navigation */}
      <HeaderNav />

      {/* 2. Omni Product Search Bar */}
      <div className="px-3.5 pt-2.5 pb-1">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search fries, breading, mayo, boxes, retail packs..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition shadow-inner font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Promotional Hero Carousel */}
      <PromoHeroCarousel />

      {/* 4. Sticky Category Bar */}
      <CategoryBar categories={categories} />

      {/* 5. Product Grid Feed */}
      <main className="px-3.5 pt-3">
        <div className="flex items-center justify-between pb-2 mb-2 text-xs font-bold text-slate-400 font-mono">
          <span className="uppercase tracking-wider">
            Available SKUs ({filteredProducts.length})
          </span>
          <span className="text-[10px] text-amber-400/90">
            Rayachoty Central Depot
          </span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-500 space-y-3">
            <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
            <span className="text-xs font-semibold">Loading wholesale catalogue...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-14 text-center space-y-2 bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
            <p className="text-sm font-bold text-slate-300">No matching products found</p>
            <p className="text-xs text-slate-500">Try searching for fries, cheese, breading, or mayo</p>
            <button
              onClick={() => {
                setSearchQuery('');
              }}
              className="mt-2 px-3 py-1.5 rounded-xl bg-slate-800 text-amber-400 font-bold text-xs"
            >
              Reset Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredProducts.map(product => (
              <StudioProductCard 
                key={product.id || product.sku}
                product={product}
                onOpen3D={(prod) => setSelected3DProduct(prod)}
              />
            ))}
          </div>
        )}
      </main>

      {/* 6. Future Drops & Free Sample Launchpad */}
      <FutureDropsSection />

      {/* 7. Bottom Contact & Guarantee Footer */}
      <footer className="px-4 py-6 text-center text-xs text-slate-500 space-y-1.5 border-t border-slate-900 mt-6">
        <div className="flex items-center justify-center gap-2 text-amber-400/90 font-bold">
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Rayachoty Depot Hotline: 9347453135 / 9573261696</span>
        </div>
        <p className="text-[11px] text-slate-600">
          Fresh frozen cold-chain at -18°C • Zero banking payment required • Pay driver upon van arrival
        </p>
      </footer>

      {/* Modals & Drawers */}
      <Packaging3DViewerModal 
        product={selected3DProduct}
        onClose={() => setSelected3DProduct(null)}
      />
      <UpsellDrawer />
      <FloatingCartBar />
      <CheckoutModal />
      <OrderSuccessModal />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <StoreFeed />
    </StoreProvider>
  );
}
