import React from 'react';
import { useStore } from '../context/StoreContext';
import { ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const FloatingCartBar = () => {
  const { cartCount, cartTotal, cartItemsArray, setIsCheckoutOpen, language, upsellProduct } = useStore();

  if (cartCount === 0 || upsellProduct) return null;

  // Take top 3 item images for overlapping avatar stack
  const previewThumbnails = cartItemsArray.slice(0, 3).map(item => item.product.image_url);

  return (
    <AnimatePresence>
      <div className="fixed bottom-0 left-0 right-0 p-3 z-40 max-w-md mx-auto pointer-events-none">
        <motion.div
          initial={{ y: 70, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 70, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          onClick={() => setIsCheckoutOpen(true)}
          className="bg-gradient-to-r from-[#0C831F] via-[#0B751C] to-[#085E16] text-white rounded-2xl p-3 sm:p-3.5 shadow-[0_8px_30px_rgba(12,131,31,0.4)] flex items-center justify-between gap-3 cursor-pointer pointer-events-auto active:scale-[0.98] transition-all border border-emerald-400/40"
        >
          {/* Left: Overlapping Avatar Stack + Specs */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Thumbnail Stack */}
            <div className="flex items-center -space-x-3 shrink-0">
              {previewThumbnails.map((src, i) => (
                <div 
                  key={i} 
                  className="w-9 h-9 rounded-full bg-white border-2 border-emerald-700 overflow-hidden shadow-sm flex items-center justify-center p-0.5"
                  style={{ zIndex: 10 - i }}
                >
                  <img src={src} alt="item" className="w-full h-full object-contain" />
                </div>
              ))}
            </div>

            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 block font-mono">
                {cartCount} {cartCount === 1 ? 'ITEM IN BOOKING' : 'ITEMS IN BOOKING'}
              </span>
              <div className="text-base sm:text-lg font-black text-white font-mono leading-tight flex items-baseline gap-1.5">
                <span>₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
                <span className="text-[10px] font-semibold text-emerald-200 font-sans">
                  {language === 'te' ? 'డిపో ధర' : 'Wholesale Rate'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: CTA Button */}
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-emerald-800 text-xs font-black uppercase tracking-wider shrink-0 shadow-sm group">
            <span>{language === 'te' ? 'ఆర్డర్ చూడండి' : 'View Booking'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
