import React, { useState } from 'react';
import { Rocket, Gift, Check, Bell, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export const FUTURE_DROPS = [
  {
    id: "drop-1",
    name: "CHEF'S ART CHIPOTLE & PERI-PERI RETAIL SHAKERS",
    category: "Retail Seasonings",
    landingDate: "Arriving Tuesday",
    unit: "100g Dispenser Bottle",
    target: "Countertop Retail & Fries Dusting",
    image: "assets/products/breading_powder.jpg"
  },
  {
    id: "drop-2",
    name: "100% COMPOSTABLE ECO BURGER BOXES (E-FLUTE)",
    category: "Sustainable Packaging",
    landingDate: "Arriving Next Week",
    unit: "100 Pcs Case Pack",
    target: "Gourmet Burgers & Sandwich Outlets",
    image: "assets/products/burger_boxes.jpg"
  }
];

export const FutureDropsSection = () => {
  const [requestedSampleId, setRequestedSampleId] = useState(null);

  const handleRequestSample = (dropId) => {
    setRequestedSampleId(dropId);
    // Persist or trigger sample request flag
    setTimeout(() => {
      alert("Sample requested! Our delivery van will bring 1 trial sample with your next confirmed order.");
    }, 300);
  };

  return (
    <div className="mx-3.5 my-4 p-4 rounded-2xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-950 border border-indigo-500/30 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Rocket className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-300 font-mono">
              Depot Launchpad
            </span>
            <h3 className="text-xs sm:text-sm font-black text-white leading-tight">
              Future Drops & Incoming Arrivals
            </h3>
          </div>
        </div>

        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 font-mono">
          Pre-Order
        </span>
      </div>

      <div className="space-y-2.5">
        {FUTURE_DROPS.map(drop => {
          const isRequested = requestedSampleId === drop.id;

          return (
            <div 
              key={drop.id}
              className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 p-1 shrink-0 flex items-center justify-center">
                  <img 
                    src={drop.image} 
                    alt={drop.name}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-mono font-bold text-amber-400 uppercase">{drop.category}</span>
                    <span className="text-[9px] text-indigo-300 font-mono">• {drop.landingDate}</span>
                  </div>
                  <h4 className="font-bold text-white text-xs truncate mt-0.5">
                    {drop.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate">
                    {drop.target}
                  </p>
                </div>
              </div>

              {/* Sample Action */}
              <button
                onClick={() => handleRequestSample(drop.id)}
                disabled={isRequested}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider shrink-0 transition flex items-center gap-1 active:scale-95 ${
                  isRequested
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                }`}
              >
                {isRequested ? (
                  <>
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Sample Booked</span>
                  </>
                ) : (
                  <>
                    <Gift className="w-3 h-3" />
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
