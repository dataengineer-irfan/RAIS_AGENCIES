import React, { useState, useEffect } from 'react';
import { FALLBACK_PROMOS } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Tag, ChevronLeft, ChevronRight } from 'lucide-react';

export const PromoHeroCarousel = ({ onSelectPromo }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-slide every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % FALLBACK_PROMOS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const promo = FALLBACK_PROMOS[currentIndex];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 shadow-xl bg-slate-900 mx-3.5 my-2.5">
      <AnimatePresence mode="wait">
        <motion.div
          key={promo.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={`p-4 bg-gradient-to-br ${promo.theme} flex items-center justify-between gap-3 text-white min-h-[110px]`}
        >
          {/* Text Left */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-[9px] font-black uppercase tracking-wider text-amber-300 border border-amber-400/30 mb-1.5 font-mono">
              <Sparkles className="w-2.5 h-2.5" />
              <span>{promo.badge}</span>
            </div>

            <h3 className="text-xs sm:text-sm font-black leading-snug line-clamp-2 drop-shadow-sm">
              {promo.title}
            </h3>

            <p className="text-[10px] text-slate-200/90 line-clamp-1 mt-1 font-medium">
              {promo.subtitle}
            </p>
          </div>

          {/* Image Right */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-black/30 border border-white/10 shrink-0 shadow-lg relative flex items-center justify-center">
            <img 
              src={promo.image} 
              alt={promo.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=300';
              }}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots Indicator */}
      <div className="absolute bottom-2 left-4 flex items-center gap-1.5">
        {FALLBACK_PROMOS.map((_, idx) => (
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
