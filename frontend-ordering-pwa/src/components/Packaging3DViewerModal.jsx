import React, { useState } from 'react';
import { X, Sparkles, Plus, Check, ShieldCheck, Flame, Rotate3d } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../context/StoreContext';

export const Packaging3DViewerModal = ({ product, onClose }) => {
  const { addToCart } = useStore();
  const [rotationY, setRotationY] = useState(25);
  const [added, setAdded] = useState(false);

  if (!product) return null;

  const isBucket = product.name?.includes('BUCKET') || product.sku?.includes('BOX-08');

  const handleAddCase = () => {
    addToCart(product, 1, false);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Rotate3d className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 font-mono">
                Interactive 3D Packaging Studio
              </span>
              <h3 className="text-xs sm:text-sm font-black text-white truncate max-w-[240px]">
                {product.name}
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3D Visualizer Canvas (Interactive CSS 3D Perspective Box) */}
        <div className="p-6 bg-radial from-slate-850 to-slate-950 flex flex-col items-center justify-center relative min-h-[220px] overflow-hidden select-none">
          <div 
            style={{ perspective: '800px' }}
            className="w-full flex items-center justify-center py-4"
          >
            <motion.div
              style={{
                transform: `rotateY(${rotationY}deg) rotateX(10deg)`,
                transformStyle: 'preserve-3d',
                transition: 'transform 0.1s ease-out'
              }}
              className="relative w-40 h-40 flex items-center justify-center filter drop-shadow-[0_20px_25px_rgba(0,0,0,0.7)]"
            >
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-full h-full object-contain pointer-events-none"
              />
            </motion.div>
          </div>

          {/* Interactive Rotation Slider */}
          <div className="w-full max-w-[220px] flex items-center gap-2 mt-3 z-10">
            <span className="text-[10px] text-slate-500 font-mono">0°</span>
            <input 
              type="range"
              min="-180"
              max="180"
              value={rotationY}
              onChange={(e) => setRotationY(Number(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-[10px] text-slate-500 font-mono">360°</span>
          </div>
          <span className="text-[9px] text-slate-400 mt-1 font-mono">Drag slider to inspect packaging angles</span>
        </div>

        {/* Commercial Specifications List */}
        <div className="p-4 space-y-2.5 bg-slate-950/70 text-xs border-t border-slate-800">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold">Steam-Release Lids</span>
                <span className="text-[11px] text-white font-medium">Stops soggy crusts during van dispatch</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-2">
              <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold">Food-Grade Kraft</span>
                <span className="text-[11px] text-white font-medium">100% greaseproof & oil-barrier certified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Case Pack Price</span>
            <span className="text-base font-black text-amber-400 font-mono">
              ₹{parseFloat(product.base_price).toFixed(0)} <span className="text-xs text-slate-400 font-sans font-medium">({product.packaging_unit})</span>
            </span>
          </div>

          <button
            onClick={handleAddCase}
            disabled={added}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg ${
              added 
                ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 active:scale-95'
            }`}
          >
            {added ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Added to Booking!</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add Case to Cart</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
