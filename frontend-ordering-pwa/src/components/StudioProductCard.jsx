import React from 'react';
import { useStore } from '../context/StoreContext';
import { Plus, Minus, Share2, Instagram, Eye, Sparkles, ThermometerSnowflake } from 'lucide-react';
import { motion } from 'framer-motion';

export const StudioProductCard = ({ product, onOpen3D }) => {
  const { cart, addToCart } = useStore();

  const cartEntry = cart[product.id];
  const quantity = cartEntry ? cartEntry.quantity : 0;

  const isPackaging = product.category === 'Packaging' || product.sku?.includes('BOX') || product.sku?.includes('PKG');
  const isFrozen = product.category === 'Fries' || product.category === 'Chicken' || product.category === 'Cheese';

  const discountPercent = product.mrp ? Math.round(((product.mrp - product.base_price) / product.mrp) * 100) : 0;

  const handleShareWhatsApp = (e) => {
    e.stopPropagation();
    const shareText = `Check wholesale depot pricing for *${product.name}* (${product.packaging_unit}) at ₹${product.base_price} on RAIS Direct: https://rais-frontend.onrender.com/catalogue.html`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  const handleInstagramDemo = (e) => {
    e.stopPropagation();
    window.open(`https://www.instagram.com/explore/tags/${encodeURIComponent((product.brand || 'raisagencies').replace(/[^a-zA-Z0-9]/g, ''))}/`, '_blank');
  };

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3.5 shadow-md flex justify-between gap-3 relative hover:border-slate-700 transition">
      
      {/* ─── LEFT COLUMN: DETAILS & PRICE ─── */}
      <div className="flex-1 min-w-0 pr-1 flex flex-col justify-between">
        <div>
          {/* Top Indicators: Veg/Non-Veg + Badges */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            {/* Iconic Swiggy Veg / Non-Veg Symbol */}
            {product.is_veg ? (
              <div className="w-4 h-4 rounded-xs border-2 border-emerald-500 flex items-center justify-center p-0.5" title="Pure Veg">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
            ) : (
              <div className="w-4 h-4 rounded-xs border-2 border-rose-500 flex items-center justify-center p-0.5" title="Non-Veg">
                <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[6px] border-b-rose-500" />
              </div>
            )}

            {product.is_bestseller && (
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-mono">
                ★ Bestseller
              </span>
            )}

            {product.is_retail && (
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                Retail
              </span>
            )}
          </div>

          {/* Product Title */}
          <h4 className="text-xs sm:text-sm font-black text-white leading-snug line-clamp-2">
            {product.name}
          </h4>

          {/* Pack Spec & Brand */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-1">
            <span className="text-amber-400 font-bold">{product.brand}</span>
            <span>•</span>
            <span className="text-slate-300 font-semibold">{product.packaging_unit}</span>
            {isFrozen && (
              <>
                <span>•</span>
                <span className="text-blue-400 font-semibold flex items-center gap-0.5">
                  <ThermometerSnowflake className="w-2.5 h-2.5" /> -18°C
                </span>
              </>
            )}
          </div>

          {/* Description */}
          <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Pricing Line */}
        <div className="pt-2 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm sm:text-base font-black text-white font-mono">
            ₹{product.base_price.toFixed(0)}
          </span>
          {product.mrp && product.mrp > product.base_price && (
            <>
              <span className="text-[10px] text-slate-500 line-through font-mono">
                ₹{product.mrp.toFixed(0)}
              </span>
              <span className="text-[10px] font-black text-emerald-400 font-mono">
                {discountPercent}% OFF
              </span>
            </>
          )}
        </div>
      </div>

      {/* ─── RIGHT COLUMN: PHOTO + ICONIC SWIGGY OVERLAPPING ADD BUTTON ─── */}
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center p-1.5 shrink-0">
        {/* Real Product Image */}
        <img 
          src={product.image_url} 
          alt={product.name}
          className="w-full h-full object-contain filter drop-shadow-md rounded-xl"
          onError={(e) => {
            e.target.src = '/assets/products/kfc_bucket.jpg';
          }}
        />

        {/* Action Pills in corners: WhatsApp Share & Instagram Reel */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
          <button
            onClick={handleShareWhatsApp}
            className="w-6 h-6 rounded-lg bg-slate-900/90 text-slate-400 hover:text-emerald-400 border border-slate-700/80 flex items-center justify-center shadow"
            title="Share Deal"
          >
            <Share2 className="w-3 h-3" />
          </button>
          <button
            onClick={handleInstagramDemo}
            className="w-6 h-6 rounded-lg bg-slate-900/90 text-slate-400 hover:text-rose-400 border border-slate-700/80 flex items-center justify-center shadow"
            title="Instagram Demo"
          >
            <Instagram className="w-3 h-3" />
          </button>
        </div>

        {/* 3D Button for Packaging */}
        {isPackaging && onOpen3D && (
          <button
            onClick={() => onOpen3D(product)}
            className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-amber-500/90 text-slate-950 font-black text-[8px] uppercase tracking-wider flex items-center gap-0.5 shadow font-mono"
          >
            <Eye className="w-2.5 h-2.5" />
            <span>3D</span>
          </button>
        )}

        {/* Iconic Swiggy Style ADD Button (Overlapping bottom edge) */}
        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 shadow-lg">
          {quantity === 0 ? (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => addToCart(product, 1)}
              className="px-5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-emerald-600 font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-1 border border-slate-200"
            >
              <span>ADD</span>
              <Plus className="w-3 h-3 stroke-[3]" />
            </motion.button>
          ) : (
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="flex items-center bg-emerald-600 rounded-xl overflow-hidden shadow-lg border border-emerald-500"
            >
              <button
                onClick={() => addToCart(product, -1)}
                className="w-7 h-7 flex items-center justify-center text-white active:bg-emerald-700 transition"
              >
                <Minus className="w-3 h-3 stroke-[3]" />
              </button>

              <span className="w-6 text-center font-mono font-black text-xs text-white">
                {quantity}
              </span>

              <button
                onClick={() => addToCart(product, 1)}
                className="w-7 h-7 flex items-center justify-center text-white active:bg-emerald-700 transition"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
              </button>
            </motion.div>
          )}
        </div>
      </div>

    </div>
  );
};
