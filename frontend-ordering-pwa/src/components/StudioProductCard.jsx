import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Plus, Minus, Share2, Instagram, Eye, Sparkles, Check, Package, ThermometerSnowflake } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const StudioProductCard = ({ product, onOpen3D }) => {
  const { cart, addToCart, language } = useStore();
  const [copiedShare, setCopiedShare] = useState(false);

  const cartEntry = cart[product.id];
  const quantity = cartEntry ? cartEntry.quantity : 0;

  const isPackaging = product.sku?.includes('BOX') || product.sku?.includes('PKG') || product.name?.includes('BUCKET') || product.name?.includes('BOX');
  const isFrozen = product.sku?.includes('VEG') || product.sku?.includes('CHK') || product.name?.includes('FRIES');

  const handleShareWhatsApp = (e) => {
    e.stopPropagation();
    const shareText = `Check wholesale depot pricing for *${product.name}* (${product.packaging_unit}) at ₹${product.base_price} on RAIS Direct: https://rais-frontend.onrender.com/catalogue.html`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  const handleInstagramDemo = (e) => {
    e.stopPropagation();
    // Opens official Instagram culinary demo or search tag
    window.open(`https://www.instagram.com/explore/tags/${encodeURIComponent((product.brand || 'raisagencies').replace(/[^a-zA-Z0-9]/g, ''))}/`, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.25 }}
      className="bg-slate-900/90 rounded-2xl border border-slate-800/80 p-3 sm:p-3.5 shadow-lg flex flex-col justify-between hover:border-slate-700/80 transition-colors relative overflow-hidden group"
    >
      {/* Top Graphic Area */}
      <div>
        {/* Floating Badges */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="flex items-center gap-1 flex-wrap">
            {product.is_bestseller && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider font-mono flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Top Seller</span>
              </span>
            )}
            {product.is_retail ? (
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold font-mono">
                🏪 Retail Ready
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[9px] font-bold font-mono">
                📦 Case Pack
              </span>
            )}
          </div>

          {/* Social Links: WhatsApp Share & Instagram Demo */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleShareWhatsApp}
              className="p-1 rounded-lg bg-slate-800/80 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border border-slate-700/60 transition active:scale-95"
              title="Share SKU to WhatsApp"
            >
              <Share2 className="w-3 h-3" />
            </button>
            <button
              onClick={handleInstagramDemo}
              className="p-1 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 transition active:scale-95"
              title="Watch Instagram Demo / Recipe"
            >
              <Instagram className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Product Studio Image Showcase */}
        <div className="relative w-full h-32 sm:h-36 rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 flex items-center justify-center p-2 mb-2.5 group-hover:scale-[1.01] transition-transform">
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-full object-contain filter drop-shadow-md"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300';
            }}
          />

          {/* Cold Chain Badge */}
          {isFrozen && (
            <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-blue-950/80 backdrop-blur-md text-blue-300 border border-blue-500/30 text-[9px] font-bold flex items-center gap-1 font-mono">
              <ThermometerSnowflake className="w-2.5 h-2.5" />
              <span>-18°C</span>
            </div>
          )}

          {/* 3D Interactive View Button for Packaging */}
          {isPackaging && onOpen3D && (
            <button
              onClick={() => onOpen3D(product)}
              className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-amber-500/90 text-slate-950 font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-md hover:bg-amber-400 active:scale-95 transition"
            >
              <Eye className="w-2.5 h-2.5" />
              <span>3D Preview</span>
            </button>
          )}
        </div>

        {/* Product Titles */}
        <div>
          <span className="text-[10px] font-bold text-amber-400/90 uppercase tracking-wider block font-mono">
            {product.brand || 'RAIS Master'}
          </span>
          <h4 className="text-xs sm:text-sm font-black text-white leading-tight line-clamp-2 mt-0.5">
            {product.name}
          </h4>
          <p className="text-[10px] text-slate-400 line-clamp-1 mt-1 font-sans">
            {product.description || `Fresh wholesale pack • ${product.packaging_unit}`}
          </p>
        </div>
      </div>

      {/* Bottom Price & Swiggy-Style + ADD Stepper */}
      <div className="pt-3 mt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] text-slate-500 block uppercase font-bold font-mono">Depot Rate</span>
          <div className="flex items-baseline gap-1">
            <span className="text-sm sm:text-base font-black text-white font-mono">
              ₹{parseFloat(product.base_price).toFixed(0)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              /{product.packaging_unit}
            </span>
          </div>
        </div>

        {/* Swiggy-Style Bouncy Stepper Button */}
        <div>
          {quantity === 0 ? (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => addToCart(product, 1)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>ADD</span>
            </motion.button>
          ) : (
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="flex items-center bg-slate-950 border border-amber-500/50 rounded-xl overflow-hidden shadow-lg shadow-amber-500/10"
            >
              <button
                onClick={() => addToCart(product, -1)}
                className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white bg-slate-850 active:bg-slate-800 transition"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3 h-3 stroke-[3]" />
              </button>

              <span className="w-7 text-center font-mono font-black text-xs text-amber-400">
                {quantity}
              </span>

              <button
                onClick={() => addToCart(product, 1)}
                className="w-8 h-8 flex items-center justify-center text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-300 font-bold transition"
                aria-label="Increase quantity"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
