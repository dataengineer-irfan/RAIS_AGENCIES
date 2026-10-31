import React from 'react';
import { useStore } from '../context/StoreContext';
import { CheckCircle2, MessageSquare, Printer, Sparkles, X, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const OrderSuccessModal = () => {
  const { lastBookedOrder, setLastBookedOrder } = useStore();

  if (!lastBookedOrder) return null;

  const handleShareWhatsApp = () => {
    const itemsCount = lastBookedOrder.items ? lastBookedOrder.items.length : 0;
    const itemsSummary = (lastBookedOrder.items || []).slice(0, 4).map(itm => 
      `▫️ ${itm.product.name} (${itm.product.packaging_unit}) × ${itm.quantity}`
    ).join('\n');

    const msg = 
`✅ *ORDER BOOKED — RAIS AGENCIES*
📦 *Order #${lastBookedOrder.order_number || 'ORD-NEW'}*
🏪 *Outlet:* *${lastBookedOrder.outlet?.name || 'Customer'}*
━━━━━━━━━━━━━━━━━━━━
*Booked Items (${itemsCount}):*
${itemsSummary}
━━━━━━━━━━━━━━━━━━━━
🚚 *Delivery:* Tomorrow Morning (Rayachoty Van Route)
💰 *Total:* *₹${parseFloat(lastBookedOrder.total || 0).toFixed(0)}*
💵 *Settlement:* ${lastBookedOrder.paymentMode === 'COD' ? 'Cash on Delivery to Van' : 'Weekly Ledger'}
━━━━━━━━━━━━━━━━━━━━
📥 *Order Slip:* https://rais-frontend.onrender.com/bill.html?id=${lastBookedOrder.order_number}&type=order
❄️ _RAIS AGENCIES Rayachoty • 9347453135_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleOpenOrderSlip = () => {
    window.open(`https://rais-frontend.onrender.com/bill.html?id=${lastBookedOrder.order_number}&type=order`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 border border-emerald-500/30 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl relative"
      >
        <button
          onClick={() => setLastBookedOrder(null)}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/10 mb-4">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 font-mono">
          Booking Queued in Orders Hub
        </span>

        <h3 className="text-xl font-black text-white mt-1">
          Order #{lastBookedOrder.order_number} Confirmed!
        </h3>

        <p className="text-xs text-slate-300 mt-2 font-medium">
          Booked for <strong className="text-white">{lastBookedOrder.outlet?.name}</strong> • Total: <strong className="text-amber-400 font-mono">₹{parseFloat(lastBookedOrder.total || 0).toFixed(0)}</strong>
        </p>

        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 my-4 text-[11px] text-slate-300 text-left space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Route:</span>
            <span className="font-bold text-white">Rayachoty Morning Van</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Payment:</span>
            <span className="font-bold text-emerald-400">{lastBookedOrder.paymentMode === 'COD' ? 'Cash on Delivery' : 'Weekly Ledger'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleShareWhatsApp}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Share Booking Slip on WhatsApp</span>
          </button>

          <button
            onClick={handleOpenOrderSlip}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span>View Printable Order Slip</span>
          </button>

          <button
            onClick={() => setLastBookedOrder(null)}
            className="w-full py-2 text-slate-500 hover:text-slate-300 font-bold text-xs tracking-wider"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
