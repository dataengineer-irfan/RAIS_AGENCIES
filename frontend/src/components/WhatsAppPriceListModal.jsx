import React, { useState } from 'react';
import { X, Share2, Copy, CheckCircle2, FileText, Phone } from 'lucide-react';

export const WhatsAppPriceListModal = ({ isOpen, onClose, products, categories }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Build formatted WhatsApp pricing message
  const generatePriceText = () => {
    let text = `📦 *RAIS AGENCIES — WHOLESALE PRICE LIST*\n`;
    text += `📍 *Reddies Colony, Rayachoty (516269)*\n`;
    text += `📞 *Order Hotline: 9347453135*\n`;
    text += `─────────────────────────\n\n`;

    categories.forEach(cat => {
      const catProducts = products.filter(p => p.category_id === cat.id && p.is_active);
      if (catProducts.length > 0) {
        text += `🔹 *${cat.name.toUpperCase()}*\n`;
        catProducts.forEach(p => {
          const base = parseFloat(p.base_price);
          const tax = parseFloat(p.tax_rate);
          const total = base + (base * (tax / 100));
          text += `• ${p.name} (${p.packaging_unit})\n  Rate: *₹${base.toFixed(2)}* (+${tax}% GST = ₹${total.toFixed(2)})\n`;
        });
        text += `\n`;
      }
    });

    text += `─────────────────────────\n`;
    text += `*Payment Terms:* Due upon delivery / 15-day credit for verified partners.\n`;
    text += `*Same-Day Delivery in Rayachoty & Surrounding Hubs.*`;
    return text;
  };

  const priceText = generatePriceText();

  const handleCopy = () => {
    navigator.clipboard.writeText(priceText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">WhatsApp Wholesale Price List</h2>
              <p className="text-xs text-slate-400">Ready to copy and share directly with restaurant owners</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-6 space-y-4">
          <div className="relative">
            <textarea
              readOnly
              rows={12}
              value={priceText}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none select-all resize-none"
            />
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs flex items-center gap-2">
            <Phone className="w-4 h-4 shrink-0" />
            <span>Formatted with bold tags (*), category headers, and official Rayachoty hotline.</span>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg uppercase tracking-wider text-xs"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg uppercase tracking-wider text-xs shadow-lg shadow-emerald-600/20 transition-all"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy for WhatsApp</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
