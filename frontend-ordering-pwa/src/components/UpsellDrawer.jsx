import React from 'react';
import { useStore } from '../context/StoreContext';
import { Sparkles, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const UpsellDrawer = () => {
  const { upsellProduct, setUpsellProduct, addToCart } = useStore();

  if (!upsellProduct) return null;

  const handleAdd = () => {
    addToCart({
      id: upsellProduct.sku,
      sku: upsellProduct.sku,
      name: upsellProduct.name,
      base_price: upsellProduct.price,
      packaging_unit: upsellProduct.unit,
      image_url: upsellProduct.image
    }, 1, false);
    setUpsellProduct(null);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setUpsellProduct(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs pointer-events-auto"
        />

        {/* Slide-Up Card */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-xl bg-slate-900 border-t border-amber-500/30 rounded-t-3xl p-4 shadow-2xl pointer-events-auto pb-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-wider font-mono">Frequently Bought Together</span>
            </div>
            <button
              onClick={() => setUpsellProduct(null)}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="py-3.5 flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 p-1 shrink-0 flex items-center justify-center">
              <img 
                src={upsellProduct.image} 
                alt={upsellProduct.name}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-black text-white leading-snug truncate">
                {upsellProduct.name}
              </h4>
              <p className="text-[11px] text-amber-200/90 line-clamp-2 mt-0.5 font-medium">
                {upsellProduct.reason}
              </p>
              <div className="text-xs font-black text-white font-mono mt-1">
                ₹{upsellProduct.price} <span className="text-[10px] text-slate-400 font-sans font-normal">({upsellProduct.unit})</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => setUpsellProduct(null)}
              className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs uppercase tracking-wider transition"
            >
              Skip
            </button>

            <button
              onClick={handleAdd}
              className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add to Booking</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
