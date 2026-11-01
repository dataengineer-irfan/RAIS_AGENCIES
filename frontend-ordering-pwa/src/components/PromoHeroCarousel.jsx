import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Zap, Gift, ShieldAlert } from 'lucide-react';
import { useStore } from '../context/StoreContext';

const SWIGGY_BANNERS = [
  {
    id: "banner-1",
    tag: "DEPOT SPECIAL COMBO",
    title: "Order 10 KG Amul Fries, Get 1 KG Peri-Peri Seasoning FREE!",
    subtitle: "Boost snack margins by 35% with our signature spice shaker.",
    image: "/assets/products/amul_french_fries_6mm.jpg",
    gradient: "from-[#FF6A00] via-[#EE0979] to-[#FF6A00]",
    badgeBg: "bg-white/20 text-white",
    cta: "Claim Combo"
  },
  {
    id: "banner-2",
    tag: "PACKAGING EXCLUSIVE",
    title: "1000ml Broasted Chicken Buckets With Steam-Release Lids",
    subtitle: "Delivers hot crispy fried chicken without soggy crusts. 100 pcs case pack.",
    image: "/assets/products/kfc_bucket.jpg",
    gradient: "from-[#8E2DE2] to-[#4A00E0]",
    badgeBg: "bg-white/20 text-white",
    cta: "View 3D Model"
  },
  {
    id: "banner-3",
    tag: "DIRECT FROM AMUL & MILKY MIST",
    title: "Milky Mist Pizza Mozzarella & Cheddar Slices In Stock",
    subtitle: "High-stretch golden melt for Rayachoty pizzerias and burger cafes.",
    image: "/assets/products/milky_mist_mozzarella_1kg.jpg",
    gradient: "from-[#11998e] to-[#38ef7d]",
    badgeBg: "bg-black/20 text-white",
    cta: "Order Cheese"
  }
];

export const PromoHeroCarousel = () => {
  const { language } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % SWIGGY_BANNERS.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const banner = SWIGGY_BANNERS[currentIndex];

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-lg mx-3.5 my-3 bg-slate-900">
      <AnimatePresence mode="wait">
        <motion.div
          key={banner.id}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className={`p-4 bg-gradient-to-r ${banner.gradient} flex items-center justify-between gap-3 text-white min-h-[135px] relative overflow-hidden`}
        >
          {/* Subtle Decorative Background Wave */}
          <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />

          {/* Left Text Column */}
          <div className="flex-1 min-w-0 pr-1 relative z-10">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md mb-2 shadow-2xs ${banner.badgeBg}`}>
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>{banner.tag}</span>
            </div>

            <h3 className="text-sm sm:text-base font-black leading-snug drop-shadow-sm text-white">
              {banner.title}
            </h3>

            <p className="text-[11px] text-white/90 line-clamp-1 mt-1 font-medium">
              {banner.subtitle}
            </p>

            <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-white bg-black/25 px-2.5 py-1 rounded-full backdrop-blur-xs">
              <span>{banner.cta}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* Right Product Image with Glowing Studio Lighting */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shrink-0 shadow-xl relative flex items-center justify-center p-2 z-10">
            <img 
              src={banner.image} 
              alt={banner.title}
              className="w-full h-full object-contain filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.3)] transition-transform duration-300 hover:scale-105"
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots Indicator */}
      <div className="absolute bottom-2.5 left-4 flex items-center gap-1.5 z-20">
        {SWIGGY_BANNERS.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'w-6 bg-white shadow-sm' : 'w-1.5 bg-white/40'
            }`}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
