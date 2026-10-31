import React from 'react';
import { useStore } from '../context/StoreContext';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const FloatingCartBar = () => {
  const { cartCount, cartTotal, setIsCheckoutOpen } = useStore();

  if (cartCount === 0) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-0 left-0 right-0 p-3.5 z-40 max-w-xl mx-auto pointer-events-none">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 280 }}
          onClick={() => setIsCheckoutOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl p-3 sm:p-3.5 shadow-2xl shadow-emerald-950/80 flex items-center justify-between gap-3 cursor-pointer pointer-events-auto active:scale-[0.99] transition border border-emerald-400/30"
        >
          {/* Left: Cart Specs */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black/25 flex items-center justify-center font-bold text-white shrink-0 relative">
              <ShoppingBag className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center shadow">
                {cartCount}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block font-mono">
                {cartCount} {cartCount === 1 ? 'Wholesale Item' : 'Wholesale Items'} Selected
              </span>
              <div className="text-sm sm:text-base font-black text-white font-mono leading-none mt-0.5">
                ₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                <span className="text-[10px] font-medium text-emerald-100 font-sans ml-1">
                  (Estimated Total)
                </span>
              </div>
            </div>
          </div>

          {/* Right: CTA */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/25 text-xs font-black uppercase tracking-wider text-emerald-100 shrink-0">
            <span>View Booking</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
