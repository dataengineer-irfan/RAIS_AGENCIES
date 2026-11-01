import React, { useState } from 'react';
import { Rocket, Gift, Check, Bell, Sparkles, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../context/StoreContext';

export const FUTURE_DROPS = [
  {
    id: "drop-1",
    name: "CHEF'S ART CHIPOTLE & PERI-PERI RETAIL SHAKERS",
    category: "Retail Seasonings",
    landingDate: "Arriving Tuesday",
    unit: "100g Dispenser Bottle",
    target: "Countertop Retail & Fries Dusting",
    image: "/assets/products/vkl_peri_peri_sprinkler.jpg",
    margin: "40% Retail Margin"
  },
  {
    id: "drop-2",
    name: "100% COMPOSTABLE ECO BURGER BOXES (E-FLUTE)",
    category: "Sustainable Packaging",
    landingDate: "Arriving Next Week",
    unit: "100 Pcs Case Pack",
    target: "Gourmet Burgers & Sandwich Outlets",
    image: "/assets/products/burger_boxes.jpg",
    margin: "Oil-Proof Fluting"
  }
];

export const FutureDropsSection = () => {
  const { language } = useStore();
  const [requestedSampleId, setRequestedSampleId] = useState(null);

  const handleRequestSample = (dropId) => {
    setRequestedSampleId(dropId);
    setTimeout(() => {
      alert("Sample requested! Our delivery van will bring 1 trial sample with your next confirmed order.");
    }, 250);
  };

  return (
    <div className="mx-3.5 my-4 p-4 rounded-3xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-indigo-100 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Rocket className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 font-mono">
              {language === 'te' ? 'రాబోయే కొత్త ఉత్పత్తులు' : 'Depot Launchpad'}
            </span>
            <h3 className="text-sm font-black text-slate-900 leading-tight">
              {language === 'te' ? 'భవిష్యత్ ఉత్పత్తులు & ఉచిత శాంపిల్స్' : 'Future Drops & Incoming Arrivals'}
            </h3>
          </div>
        </div>

        <span className="text-[10px] font-black text-indigo-700 bg-white px-2.5 py-1 rounded-full border border-indigo-200 font-mono shadow-2xs">
          Pre-Order
        </span>
      </div>

      <div className="space-y-2.5">
        {FUTURE_DROPS.map(drop => {
          const isRequested = requestedSampleId === drop.id;

          return (
            <div 
              key={drop.id}
              className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 p-1 shrink-0 flex items-center justify-center">
                  <img 
                    src={drop.image} 
                    alt={drop.name}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-mono font-black text-indigo-600 uppercase">{drop.category}</span>
                    <span className="text-[9px] text-slate-500 font-medium">• {drop.landingDate}</span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-xs truncate mt-0.5">
                    {drop.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">
                    {drop.target} • <span className="font-semibold text-emerald-700">{drop.margin}</span>
                  </p>
                </div>
              </div>

              {/* Sample Action */}
              <button
                onClick={() => handleRequestSample(drop.id)}
                disabled={isRequested}
                className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider shrink-0 transition flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs ${
                  isRequested
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                }`}
              >
                {isRequested ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Requested</span>
                  </>
                ) : (
                  <>
                    <Gift className="w-3.5 h-3.5" />
                    <span>Free Sample</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
