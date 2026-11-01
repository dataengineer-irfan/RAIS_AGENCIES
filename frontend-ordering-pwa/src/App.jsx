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
import { Search, X, RefreshCw, PhoneCall, Sparkles, Plus, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StoreFeed = () => {
  const { activeCategory, searchQuery, setSearchQuery, language, flyingParticles } = useStore();
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
    <div className="min-h-screen bg-[#E5E7EB] text-slate-900 flex flex-col justify-start">
      
      {/* Centered Mobile-App Shell (Swiggy / Zomato Mobile Shell on Desktop) */}
      <div className="w-full max-w-md mx-auto min-h-screen bg-[#F6F7F9] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.12)] relative border-x border-slate-200 pb-28">
        
        {/* 1. Swiggy Top Location Header */}
        <HeaderNav />

        {/* 2. Swiggy Search Bar */}
        <div className="px-3.5 pt-2.5 pb-1">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#FC8019] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'te' ? "'ఫ్రైస్', 'చీజ్', 'బ్రెడ్డింగ్', 'మాయో' శోధించండి..." : "Search 'Amul Fries', 'Breading', 'Tandoori Mayo'..."}
              className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FC8019] focus:ring-2 focus:ring-orange-500/20 transition shadow-xs font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 text-slate-400 hover:text-slate-600"
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
          <div className="flex items-center justify-between pb-2 mb-2 text-xs font-extrabold text-slate-600 border-b border-slate-200/80">
            <span className="uppercase tracking-wider">
              {language === 'te' ? 'రాయచోటి మెనూ ఉత్పత్తులు' : 'Recommended Depot Menu'} ({filteredProducts.length})
            </span>
            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              Rayachoty Cold Depot
            </span>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <RefreshCw className="w-7 h-7 animate-spin text-[#FC8019]" />
              <span className="text-xs font-semibold">Loading wholesale catalog...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-14 text-center space-y-2 bg-white rounded-3xl border border-slate-200/80 p-6 my-4 shadow-xs">
              <p className="text-sm font-bold text-slate-700">No matching items found</p>
              <p className="text-xs text-slate-500">Try searching for fries, cheese, breading, or mayo</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 px-4 py-2 rounded-xl bg-orange-50 text-[#FC8019] border border-orange-200 font-bold text-xs"
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
        <footer className="px-4 py-6 text-center text-xs text-slate-500 space-y-2 border-t border-slate-200 mt-6 bg-white">
          <div className="flex items-center justify-center gap-1.5 text-slate-800 font-extrabold">
            <PhoneCall className="w-4 h-4 text-[#FC8019]" />
            <span>Rayachoty Depot Hotline: 9347453135 / 9573261696</span>
          </div>
          <p className="text-[11px] text-slate-500">
            RAIS Agencies Wholesale • Exclusive Foodservice Distributor for Rayachoty QSR & Retail
          </p>
          <div className="text-[10px] text-emerald-700 font-bold flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Morning Van Dispatches: 6:30 AM Daily to All Rayachoty Routes</span>
          </div>
        </footer>

        {/* Modals & Floating Components */}
        <FloatingCartBar />
        <UpsellDrawer />
        <CheckoutModal />
        <OrderSuccessModal />
        
        {selected3DProduct && (
          <Packaging3DViewerModal 
            product={selected3DProduct}
            onClose={() => setSelected3DProduct(null)}
          />
        )}

        {/* Flying particle effect when adding items */}
        {flyingParticles.map(p => (
          <motion.div
            key={p.id}
            initial={{ left: p.x - 12, top: p.y - 12, scale: 1, opacity: 1 }}
            animate={{ 
              left: window.innerWidth / 2 - 12, 
              top: window.innerHeight - 50, 
              scale: 0.2, 
              opacity: 0 
            }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-50 w-6 h-6 rounded-full bg-[#0C831F] text-white flex items-center justify-center shadow-lg pointer-events-none"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </motion.div>
        ))}

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
