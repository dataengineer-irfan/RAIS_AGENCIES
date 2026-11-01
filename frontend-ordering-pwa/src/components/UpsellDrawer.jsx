import React from 'react';
import { useStore } from '../context/StoreContext';
import { Sparkles, Plus, X, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const UpsellDrawer = () => {
  const { upsellProduct, setUpsellProduct, addToCart, language } = useStore();

  if (!upsellProduct) return null;

  const handleAddUpsell = () => {
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
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        {/* Dim Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setUpsellProduct(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        {/* Upsell Drawer Card */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative z-10 w-full max-w-md bg-white rounded-t-3xl shadow-2xl p-5 pb-8 border-t border-slate-100"
        >
          {/* Drawer Handle */}
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />

          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3.5">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-xl bg-orange-50 text-[#FC8019] flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-[#FC8019] font-mono">
                {language === 'te' ? 'కలిసి ఆర్డర్ చేసే వస్తువులు' : 'Frequently Bought Together'}
              </span>
            </div>

            <button
              onClick={() => setUpsellProduct(null)}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Upsell Item Details */}
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 p-1.5 shrink-0 flex items-center justify-center shadow-xs">
              <img 
                src={upsellProduct.image} 
                alt={upsellProduct.name}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight truncate">
                {upsellProduct.name}
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                {upsellProduct.reason}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-sm font-black text-slate-900 font-mono">
                  ₹{upsellProduct.price.toFixed(0)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium font-mono">
                  ({upsellProduct.unit})
                </span>
                <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  +35% Margin
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-4 flex items-center gap-2.5">
            <button
              onClick={() => setUpsellProduct(null)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              Skip
            </button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleAddUpsell}
              className="flex-1 py-3 rounded-2xl bg-[#FC8019] hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add to Booking (+₹{upsellProduct.price.toFixed(0)})</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
