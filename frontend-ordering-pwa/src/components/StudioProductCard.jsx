import React from 'react';
import { useStore } from '../context/StoreContext';
import { Plus, Minus, Share2, Instagram, Box, Sparkles, ThermometerSnowflake, TrendingUp, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

export const StudioProductCard = ({ product, onOpen3D }) => {
  const { cart, addToCart, language } = useStore();

  const cartEntry = cart[product.id];
  const quantity = cartEntry ? cartEntry.quantity : 0;

  const isPackaging = product.category === 'Packaging' || product.sku?.includes('BOX') || product.sku?.includes('PKG') || product.name?.includes('BUCKET');
  const isFrozen = product.category === 'Fries' || product.category === 'Chicken' || product.category === 'Cheese' || product.sku?.includes('VEG') || product.sku?.includes('AMUL');

  const discountPercent = product.mrp ? Math.round(((product.mrp - product.base_price) / product.mrp) * 100) : 0;

  const handleShareWhatsApp = (e) => {
    e.stopPropagation();
    const shareText = `Wholesale Depot Price for *${product.name}* (${product.packaging_unit}): ₹${product.base_price} on RAIS Agencies Rayachoty. Book delivery van dispatch now!`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  const handleInstagramDemo = (e) => {
    e.stopPropagation();
    window.open(`https://www.instagram.com/explore/tags/${encodeURIComponent((product.brand || 'raisagencies').replace(/[^a-zA-Z0-9]/g, ''))}/`, '_blank');
  };

  const handleAddClick = (e) => {
    addToCart(product, 1, true, e);
  };

  return (
    <div className="bg-white rounded-3xl p-4 shadow-[0_2px_14px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-slate-100/90 flex justify-between gap-3.5 relative transition-all duration-200">
      
      {/* ─── LEFT COLUMN: DETAILS & PRICE ─── */}
      <div className="flex-1 min-w-0 pr-1 flex flex-col justify-between">
        <div>
          {/* Top Indicators: Veg/Non-Veg + Badges */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            {/* Iconic Swiggy Veg / Non-Veg Symbol */}
            {product.is_veg ? (
              <div className="w-4 h-4 rounded-xs border-2 border-emerald-600 flex items-center justify-center p-0.5" title="Pure Veg">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              </div>
            ) : (
              <div className="w-4 h-4 rounded-xs border-2 border-rose-600 flex items-center justify-center p-0.5" title="Non-Veg">
                <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[6px] border-b-rose-600" />
              </div>
            )}

            {product.is_bestseller && (
              <span className="text-[9px] font-black uppercase tracking-wider text-[#FC8019] bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200 font-mono">
                ★ BESTSELLER
              </span>
            )}

            {product.is_retail && (
              <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-mono">
                RETAIL READY
              </span>
            )}

            {isPackaging && (
              <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 font-mono flex items-center gap-0.5">
                <Box className="w-2.5 h-2.5 text-indigo-600" />
                3D PACK
              </span>
            )}
          </div>

          {/* Product Title */}
          <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug line-clamp-2">
            {product.name}
          </h4>

          {/* Pack Spec & Brand */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1 flex-wrap">
            <span className="text-[#FC8019] font-bold">{product.brand}</span>
            <span>•</span>
            <span className="text-slate-700 font-semibold">{product.packaging_unit}</span>
            {isFrozen && (
              <>
                <span>•</span>
                <span className="text-blue-600 font-semibold flex items-center gap-0.5 text-[11px]">
                  <ThermometerSnowflake className="w-3 h-3 text-blue-500" /> -18°C Deep Frozen
                </span>
              </>
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
            {language === 'te' && product.description_te ? product.description_te : product.description}
          </p>

          {/* Profit Margin Pill for QSR */}
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/80 text-[10px] font-bold text-emerald-800">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span>High QSR Margin • Wholesale Depot Rate</span>
          </div>
        </div>

        {/* Pricing Line */}
        <div className="pt-2.5 flex items-baseline gap-2 flex-wrap">
          <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
            ₹{product.base_price.toFixed(0)}
          </span>
          {product.mrp && product.mrp > product.base_price && (
            <>
              <span className="text-xs text-slate-400 line-through font-mono">
                ₹{product.mrp.toFixed(0)}
              </span>
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-mono">
                {discountPercent}% OFF
              </span>
            </>
          )}
        </div>
      </div>

      {/* ─── RIGHT COLUMN: PHOTO + ICONIC SWIGGY OVERLAPPING ADD BUTTON ─── */}
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center p-2 shrink-0 self-start shadow-xs">
        {/* Real Product Image */}
        <img 
          src={product.image_url} 
          alt={product.name}
          className="w-full h-full object-contain filter drop-shadow-md rounded-xl transition-transform duration-200 group-hover:scale-105"
          onError={(e) => {
            e.target.src = '/assets/products/kfc_bucket.jpg';
          }}
        />

        {/* Action Pills in corners: WhatsApp Share & Instagram Reel */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
          <button
            onClick={handleShareWhatsApp}
            className="w-6 h-6 rounded-full bg-white text-slate-500 hover:text-emerald-600 border border-slate-200 flex items-center justify-center shadow-xs transition"
            title="Share Wholesale Deal on WhatsApp"
          >
            <Share2 className="w-3 h-3" />
          </button>
          <button
            onClick={handleInstagramDemo}
            className="w-6 h-6 rounded-full bg-white text-slate-500 hover:text-rose-500 border border-slate-200 flex items-center justify-center shadow-xs transition"
            title="Instagram Reel Demo"
          >
            <Instagram className="w-3 h-3" />
          </button>
        </div>

        {/* 3D Button for Packaging */}
        {isPackaging && onOpen3D && (
          <button
            onClick={() => onOpen3D(product)}
            className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-indigo-600 text-white font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-sm active:scale-95 transition"
            title="Inspect 3D Model"
          >
            <Box className="w-2.5 h-2.5" />
            <span>3D</span>
          </button>
        )}

        {/* Iconic Swiggy Style ADD Button (Overlapping bottom edge) */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 shadow-md rounded-xl">
          {quantity === 0 ? (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleAddClick}
              className="px-6 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 font-black text-xs uppercase tracking-wider shadow-sm flex items-center gap-1 border-2 border-emerald-600 transition"
            >
              <span>ADD</span>
              <Plus className="w-3.5 h-3.5 stroke-[3] text-emerald-700" />
            </motion.button>
          ) : (
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="flex items-center bg-emerald-600 text-white rounded-xl shadow-md overflow-hidden border border-emerald-700"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(product, -1, false);
                }}
                className="w-8 h-8 flex items-center justify-center hover:bg-emerald-700 active:bg-emerald-800 transition"
                title="Decrease"
              >
                <Minus className="w-3.5 h-3.5 stroke-[3]" />
              </button>

              <span className="w-8 text-center text-xs font-black font-mono select-none">
                {quantity}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(product, 1, false, e);
                }}
                className="w-8 h-8 flex items-center justify-center hover:bg-emerald-700 active:bg-emerald-800 transition"
                title="Increase"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </motion.div>
          )}
        </div>
      </div>

    </div>
  );
};
