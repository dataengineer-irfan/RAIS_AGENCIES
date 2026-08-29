import React from 'react';
import { X, Printer, Download, ExternalLink, Sparkles, Phone, MapPin } from 'lucide-react';

export const OfficialFlyerModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    const printWin = window.open('/assets/brochure.jpg', '_blank');
    if (printWin) {
      printWin.onload = () => {
        printWin.print();
      };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <span>Official RAIS Agencies Product & Price Flyer</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Authorized Marketing Brochure • Rayachoty Frozen Food Hub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all"
              title="Print Marketing Flyer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print</span>
            </button>
            <a
              href="/assets/brochure.jpg"
              download="RAIS-Agencies-Official-Flyer.jpg"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black transition-all shadow-md shadow-amber-500/20"
              title="Download High-Res JPG"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable High-Res Image View */}
        <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-950/90">
          <img
            src="/assets/brochure.jpg"
            alt="RAIS Agencies Official Brochure"
            className="rounded-xl border border-slate-800/80 shadow-2xl max-w-full h-auto object-contain"
          />
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Phone className="w-3.5 h-3.5" />
              <strong>9347453135 / 9573261696</strong>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400 hidden sm:flex">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              Near Reddies Colony, Rayachoty (516269)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Direct B2B Wholesale Distribution
          </span>
        </div>

      </div>
    </div>
  );
};
