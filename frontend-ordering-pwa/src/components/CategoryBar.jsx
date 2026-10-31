import React from 'react';
import { useStore } from '../context/StoreContext';
import { FALLBACK_CATEGORIES } from '../services/api';
import { motion } from 'framer-motion';

export const CategoryBar = ({ categories = FALLBACK_CATEGORIES }) => {
  const { activeCategory, setActiveCategory, language } = useStore();

  return (
    <div className="sticky top-[58px] z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-3.5 py-2">
      <div className="max-w-xl mx-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          const label = language === 'te' ? (cat.name_te || cat.name) : cat.name;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 shrink-0 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400 font-black'
                  : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800/80 hover:bg-slate-850'
              }`}
            >
              <span className="text-sm">{cat.icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
