import React, { useState, useEffect, useMemo } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { storeApi } from './services/api';
import { SWIGGY_CATEGORIES } from './services/catalogData';
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
import { Search, X, RefreshCw, PhoneCall, Sparkles } from 'lucide-react';

const StoreFeed = () => {
  const { activeCategory, searchQuery, setSearchQuery } = useStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected3DProduct, setSelected3DProduct] = useState(null);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const prods = await storeApi.getProducts();
      setProducts(prods);
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
        if (p.category_id !== activeCategory && p.category !== activeCategory) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const match = 
          (p.name || '').toLowerCase().includes(query) ||
          (p.sku || '').toLowerCase().includes(query) ||
          (p.brand || '').toLowerCase().includes(query) ||
          (p.category || '').toLowerCase().includes(query) ||
          (p.description || '').toLowerCase().includes(query);
        if (!match) return false;
      }

      return true;
    });
  }, [products, activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#070d17] text-slate-100 flex flex-col justify-start">
      
      {/* Centered Mobile-App Shell (Swiggy / Zomato Mobile Shell on Desktop) */}
      <div className="w-full max-w-xl mx-auto min-h-screen bg-slate-950 flex flex-col shadow-2xl relative border-x border-slate-900 pb-28">
        
        {/* 1. Swiggy Top Location Header */}
        <HeaderNav />

        {/* 2. Swiggy Search Bar */}
        <div className="px-3.5 pt-2.5 pb-1">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-amber-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 'Amul Fries', 'Breading', 'Tandoori Mayo'..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition shadow-inner font-sans"
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
        <CategoryBar categories={SWIGGY_CATEGORIES} />

        {/* 5. Product Feed (Iconic Swiggy Menu Rows) */}
        <main className="px-3.5 pt-3 flex-1">
          <div className="flex items-center justify-between pb-2 mb-2 text-xs font-bold text-slate-400 font-mono border-b border-slate-900">
            <span className="uppercase tracking-wider">
              Recommended Menu Items ({filteredProducts.length})
            </span>
            <span className="text-[10px] text-amber-400 font-semibold">
              Rayachoty Cold Depot
            </span>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500 space-y-3">
              <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
              <span className="text-xs font-semibold">Loading menu items...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-14 text-center space-y-2 bg-slate-900/50 rounded-2xl border border-slate-800 p-6 my-4">
              <p className="text-sm font-bold text-slate-300">No matching items found</p>
              <p className="text-xs text-slate-500">Try searching for fries, cheese, breading, or mayo</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 px-3 py-1.5 rounded-xl bg-slate-800 text-amber-400 font-bold text-xs"
              >
                Reset Search
              </button>
            </div>
          ) : (
            <div className="space-y-3">
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

        {/* 6. Future Drops & Launchpad */}
        <FutureDropsSection />

        {/* 7. Footer Contact */}
        <footer className="px-4 py-6 text-center text-xs text-slate-500 space-y-1.5 border-t border-slate-900 mt-6 bg-slate-950/90">
          <div className="flex items-center justify-center gap-2 text-amber-400 font-bold">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Rayachoty Depot Hotline: 9347453135 / 9573261696</span>
          </div>
          <p className="text-[11px] text-slate-600">
            Fresh frozen cold-chain at -18°C • Zero banking payment required • Pay cash upon morning van arrival
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
