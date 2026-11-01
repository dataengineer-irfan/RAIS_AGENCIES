import React from 'react';
import { useStore } from '../context/StoreContext';
import { SWIGGY_CATEGORIES } from '../services/catalogData';
import { motion } from 'framer-motion';

export const CategoryBar = ({ categories = SWIGGY_CATEGORIES }) => {
  const { activeCategory, setActiveCategory, language } = useStore();

  return (
    <div className="sticky top-[58px] z-25 bg-white/95 backdrop-blur-md border-b border-slate-100 px-3.5 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
      <div className="max-w-md mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          const label = language === 'te' ? (cat.name_te || cat.name) : cat.name;

          return (
            <motion.button
              key={cat.id}
              whileTap={{ scale: 0.94 }}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#FC8019] text-white shadow-md shadow-orange-500/25 font-black ring-2 ring-[#FC8019]/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200/80'
              }`}
            >
              <span className="text-sm">{cat.icon}</span>
              <span>{label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
