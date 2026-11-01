import React, { useState } from 'react';
import { useStore, SAMPLE_PILOT_OUTLETS } from '../context/StoreContext';
import { MapPin, ChevronDown, Globe, MessageCircle, X, Check, Store, Sparkles, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const HeaderNav = () => {
  const { selectedOutlet, setSelectedOutlet, language, toggleLanguage } = useStore();
  const [showOutletSheet, setShowOutletSheet] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-3.5 py-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          
          {/* Swiggy Style Location / Outlet Selector */}
          <button 
            onClick={() => setShowOutletSheet(true)}
            className="flex items-center gap-2.5 text-left min-w-0 group cursor-pointer active:scale-98 transition flex-1"
          >
            <div className="w-9 h-9 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FC8019] shrink-0 shadow-xs">
              <MapPin className="w-5 h-5 fill-[#FC8019]/20" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-xs sm:text-sm font-black text-slate-900 truncate group-hover:text-[#FC8019] transition">
                  {selectedOutlet.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#FC8019] shrink-0 group-hover:translate-y-0.5 transition-transform" />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium truncate">
                <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  Rayachoty Van Active
                </span>
                <span>•</span>
                <span className="truncate">{selectedOutlet.route}</span>
              </div>
            </div>
          </button>

          {/* Right Action Icons: Language Toggle & WhatsApp Direct */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-bold text-slate-700 transition active:scale-95 shadow-2xs"
              title="Toggle Telugu / English"
            >
              <Globe className="w-3.5 h-3.5 text-[#FC8019]" />
              <span className="font-semibold">{language === 'en' ? 'తెలుగు' : 'English'}</span>
            </button>

            {/* WhatsApp Help */}
            <a
              href="https://wa.me/919347453135?text=Hi%20RAIS%20Agencies%2C%20I%20am%20ordering%20from%20the%20Wholesale%20App"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 active:scale-95 transition shadow-2xs"
              title="Chat with Depot Dispatcher"
            >
              <MessageCircle className="w-4 h-4 fill-emerald-500/20" />
            </a>
          </div>

        </div>
      </header>

      {/* Swiggy-Style Clean Bottom Sheet for Location / Outlet Selection */}
      <AnimatePresence>
        {showOutletSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Dark Scrim Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOutletSheet(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative z-10 w-full max-w-md bg-white rounded-t-3xl shadow-2xl p-4 pb-8 max-h-[85vh] flex flex-col"
            >
              {/* Drawer Handle */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3" />

              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {language === 'te' ? 'మీ దుకాణం / హోటల్ ఎంచుకోండి' : 'Select Your Shop / Outlet'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'te' ? 'రాయచోటి డిపో డెలివరీ రూట్' : 'Rayachoty Depot Delivery Route & Driver'}
                  </p>
                </div>
                <button
                  onClick={() => setShowOutletSheet(false)}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Outlet Cards */}
              <div className="space-y-2.5 overflow-y-auto max-h-[58vh] pr-0.5 no-scrollbar">
                {SAMPLE_PILOT_OUTLETS.map(outlet => {
                  const isSelected = outlet.id === selectedOutlet.id;
                  return (
                    <div
                      key={outlet.id}
                      onClick={() => {
                        setSelectedOutlet(outlet);
                        setShowOutletSheet(false);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-orange-50/80 border-[#FC8019] shadow-sm ring-1 ring-[#FC8019]/30'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                          isSelected ? 'bg-[#FC8019] text-white shadow-sm' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Store className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                            <span>{outlet.name}</span>
                            {isSelected && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-[#FC8019] text-white font-black rounded-md uppercase tracking-wider">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <span>{outlet.contact}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-700">{outlet.phone}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Navigation className="w-3 h-3 text-[#FC8019]" />
                            <span>{outlet.route}</span>
                            <span>•</span>
                            <span className="font-semibold text-emerald-700">{outlet.distance} away</span>
                          </div>
                        </div>
                      </div>

                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'border-[#FC8019] bg-[#FC8019] text-white' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
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
