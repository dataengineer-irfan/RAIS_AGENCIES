import React, { useState } from 'react';
import { useStore, SAMPLE_PILOT_OUTLETS } from '../context/StoreContext';
import { MapPin, ChevronDown, Globe, MessageCircle, X, Check, Building2, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const HeaderNav = () => {
  const { selectedOutlet, setSelectedOutlet, language, toggleLanguage } = useStore();
  const [showOutletSheet, setShowOutletSheet] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-850 px-3.5 py-2.5">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
          
          {/* Swiggy Style Location / Outlet Selector */}
          <button 
            onClick={() => setShowOutletSheet(true)}
            className="flex items-center gap-2 text-left min-w-0 group cursor-pointer active:scale-98 transition"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
              <MapPin className="w-4 h-4 fill-amber-500/20" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs sm:text-sm font-black text-white truncate group-hover:text-amber-400 transition">
                  {selectedOutlet.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:translate-y-0.5 transition-transform" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium truncate block">
                Rayachoty Depot Route • Morning Van
              </span>
            </div>
          </button>

          {/* Right Action Icons: Language Toggle & WhatsApp Direct */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300 hover:text-white transition active:scale-95"
              title="Toggle Telugu / English"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'en' ? 'తెలుగు' : 'English'}</span>
            </button>

            {/* WhatsApp Help */}
            <a
              href="https://wa.me/919347453135?text=Hi%20RAIS%20Agencies%2C%20I%20need%20assistance%20with%20an%20order"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center justify-center text-emerald-400 active:scale-95 transition"
              title="Chat with Depot Dispatcher"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          </div>

        </div>
      </header>

      {/* Swiggy-Style Clean Bottom Sheet for Location / Outlet Selection (Zero Overlap!) */}
      <AnimatePresence>
        {showOutletSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Dark Backdrop Scrim */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOutletSheet(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="relative z-10 w-full max-w-xl bg-slate-900 border-t border-slate-800 rounded-t-3xl shadow-2xl p-4 pb-8 max-h-[85vh] flex flex-col"
            >
              {/* Drawer Handle */}
              <div className="w-10 h-1 bg-slate-750 rounded-full mx-auto mb-3" />

              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div>
                  <h3 className="text-sm font-black text-white">Select Your Shop / Outlet</h3>
                  <p className="text-[11px] text-slate-400">Choose your restaurant or retail account for delivery</p>
                </div>
                <button
                  onClick={() => setShowOutletSheet(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Outlet Cards */}
              <div className="space-y-2 overflow-y-auto max-h-[60vh] pr-0.5 no-scrollbar">
                {SAMPLE_PILOT_OUTLETS.map(outlet => {
                  const isSelected = outlet.id === selectedOutlet.id;
                  return (
                    <div
                      key={outlet.id}
                      onClick={() => {
                        setSelectedOutlet(outlet);
                        setShowOutletSheet(false);
                      }}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/60 shadow-md ring-1 ring-amber-500/20'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isSelected ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-850 text-slate-400'
                        }`}>
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                            <span>{outlet.name}</span>
                            {isSelected && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black rounded-md font-mono">
                                SELECTED
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {outlet.contact} • {outlet.phone} • {outlet.route}
                          </div>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-amber-500 bg-amber-500 text-slate-950' : 'border-slate-700'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
