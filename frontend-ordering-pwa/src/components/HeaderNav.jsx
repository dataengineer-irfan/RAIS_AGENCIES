import React, { useState } from 'react';
import { useStore, SAMPLE_PILOT_OUTLETS } from '../context/StoreContext';
import { Store, Phone, Globe, ChevronDown, Sparkles, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const HeaderNav = () => {
  const { selectedOutlet, setSelectedOutlet, language, toggleLanguage } = useStore();
  const [showOutletSelector, setShowOutletSelector] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-3.5 py-2.5">
      <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
        
        {/* Left: Branding & Outlet Selector */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center font-black text-slate-950 text-base shadow-md shadow-amber-500/20 shrink-0">
            R
          </div>

          <div className="min-w-0">
            <button 
              onClick={() => setShowOutletSelector(!showOutletSelector)}
              className="flex items-center gap-1 text-left group"
            >
              <div className="truncate">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block font-mono">
                  {selectedOutlet.type || 'Wholesale Depot Outlet'}
                </span>
                <h1 className="text-xs sm:text-sm font-black text-white truncate flex items-center gap-1 group-hover:text-amber-300 transition">
                  <span>{selectedOutlet.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:rotate-180 transition-transform" />
                </h1>
              </div>
            </button>
          </div>
        </div>

        {/* Right: Language Switcher & WhatsApp Direct Hotline */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300 hover:text-white transition active:scale-95"
            title="Toggle English / Telugu Language"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'en' ? 'తెలుగు' : 'English'}</span>
          </button>

          {/* WhatsApp Direct Hotline */}
          <a
            href="https://wa.me/919347453135?text=Hi%20RAIS%20Agencies%2C%20I%20need%20assistance%20with%20an%20order"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-[11px] font-bold text-emerald-300 transition active:scale-95"
            title="Chat with Depot Dispatcher"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Help</span>
          </a>
        </div>

      </div>

      {/* Outlet Selector Dropdown Modal */}
      <AnimatePresence>
        {showOutletSelector && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 p-3 bg-slate-900/98 backdrop-blur-xl border-b border-slate-800 shadow-2xl z-50 max-w-xl mx-auto"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
              <span>Select Your Shop / Outlet:</span>
              <button 
                onClick={() => setShowOutletSelector(false)}
                className="text-amber-400 hover:text-amber-300 font-bold"
              >
                Done
              </button>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto no-scrollbar">
              {SAMPLE_PILOT_OUTLETS.map(outlet => {
                const isSelected = outlet.id === selectedOutlet.id;
                return (
                  <button
                    key={outlet.id}
                    onClick={() => {
                      setSelectedOutlet(outlet);
                      setShowOutletSelector(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between text-xs ${
                      isSelected 
                        ? 'bg-amber-500/15 border-amber-500/50 text-white' 
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{outlet.name}</span>
                        {isSelected && <span className="text-[9px] px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black rounded">CURRENT</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {outlet.contact} • {outlet.phone} • {outlet.route}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
