import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Tag } from 'lucide-react';

const SWIGGY_BANNERS = [
  {
    id: "banner-1",
    badge: "DEPOT SPECIAL COMBO",
    title: "Order 10 KG Amul Fries, Get 1 KG Peri-Peri Seasoning Sample!",
    subtitle: "Boost QSR snack margins by 35% with signature spice dusting.",
    image: "/assets/products/amul_french_fries_6mm.jpg",
    theme: "from-amber-600/90 to-amber-950/90"
  },
  {
    id: "banner-2",
    badge: "NEW ARRIVAL",
    title: "1000ml Broasted Chicken Buckets With Steam-Release Lids",
    subtitle: "Stops crust sogginess during bike parcel deliveries. 100 pcs case pack.",
    image: "/assets/products/kfc_bucket.jpg",
    theme: "from-rose-600/90 to-red-950/90"
  },
  {
    id: "banner-3",
    badge: "WHOLESALE CHEESE",
    title: "Milky Mist Pizza Mozzarella & Cheddar Burger Slices",
    subtitle: "High-stretch golden melt for pizzerias and burger cafes in Rayachoty.",
    image: "/assets/products/milky_mist_mozzarella_1kg.jpg",
    theme: "from-blue-600/90 to-slate-950/90"
  }
];

export const PromoHeroCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % SWIGGY_BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const banner = SWIGGY_BANNERS[currentIndex];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 shadow-xl mx-3.5 my-2.5">
      <AnimatePresence mode="wait">
        <motion.div
          key={banner.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={`p-3.5 sm:p-4 bg-gradient-to-br ${banner.theme} flex items-center justify-between gap-3 text-white min-h-[115px]`}
        >
          {/* Text Left */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-[9px] font-black uppercase tracking-wider text-amber-300 border border-amber-400/30 mb-1.5 font-mono">
              <Sparkles className="w-2.5 h-2.5" />
              <span>{banner.badge}</span>
            </div>

            <h3 className="text-xs sm:text-sm font-black leading-snug line-clamp-2 drop-shadow-sm">
              {banner.title}
            </h3>

            <p className="text-[10px] text-slate-200/90 line-clamp-1 mt-1 font-medium">
              {banner.subtitle}
            </p>
          </div>

          {/* Real Product Image Right */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-950/40 border border-white/10 shrink-0 shadow-lg relative flex items-center justify-center p-1">
            <img 
              src={banner.image} 
              alt={banner.title}
              className="w-full h-full object-contain"
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots Indicator */}
      <div className="absolute bottom-2 left-4 flex items-center gap-1.5">
        {SWIGGY_BANNERS.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all ${
              idx === currentIndex ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/40'
            }`}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
