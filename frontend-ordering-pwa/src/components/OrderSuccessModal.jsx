import React from 'react';
import { useStore } from '../context/StoreContext';
import { CheckCircle2, MessageCircle, ArrowLeft, Calendar, Truck, FileText, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const OrderSuccessModal = () => {
  const { lastBookedOrder, setLastBookedOrder, language } = useStore();

  if (!lastBookedOrder) return null;

  const handleShareWhatsAppSlip = () => {
    const outlet = lastBookedOrder.outlet || {};
    const items = lastBookedOrder.items || [];
    const itemLines = items.map(it => `• ${it.product.name} (${it.quantity} × ₹${it.product.base_price}) = ₹${it.quantity * it.product.base_price}`).join('\n');

    const text = `*RAIS AGENCIES RAYACHOTY - ORDER BOOKING SLIP*\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `*Order ID:* ${lastBookedOrder.order_number || lastBookedOrder.id}\n` +
      `*Outlet:* ${outlet.name}\n` +
      `*Contact:* ${outlet.contact} (${outlet.phone})\n` +
      `*Delivery Route:* ${outlet.route}\n` +
      `*Settlement:* ${lastBookedOrder.paymentMode === 'COD' ? 'Cash on Delivery to Van' : 'Weekly Ledger'}\n` +
      `*Estimated Delivery:* Tomorrow Morning (6:30 AM - 10:00 AM)\n\n` +
      `*Items Booked:*\n${itemLines}\n\n` +
      `*Total Booking Value:* ₹${lastBookedOrder.total}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `_Dispatched from Rayachoty Central Cold Depot_`;

    const waUrl = `https://wa.me/919347453135?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 text-center border border-slate-100"
        >
          {/* Animated Success Ring */}
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
          </div>

          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-mono">
            {language === 'te' ? 'బుకింగ్ విజయవంతమైంది' : 'Booking Confirmed'}
          </span>

          <h2 className="text-lg font-black text-slate-900 mt-2">
            {language === 'te' ? 'ఆర్డర్ విజయవంతంగా నమోదైంది!' : 'Order Placed With Rayachoty Depot!'}
          </h2>

          <p className="text-xs text-slate-500 mt-1 font-mono">
            Booking ID: <span className="font-black text-slate-800">{lastBookedOrder.order_number || lastBookedOrder.id}</span>
          </p>

          {/* Delivery Card */}
          <div className="my-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Delivering To:</span>
              <span className="font-extrabold text-slate-900">{lastBookedOrder.outlet?.name}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Van Schedule:</span>
              <span className="font-extrabold text-emerald-700 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" /> Tomorrow Morning 6:30 AM
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Settlement:</span>
              <span className="font-black text-slate-800 font-mono">
                {lastBookedOrder.paymentMode === 'COD' ? 'Cash to Van Driver' : 'Weekly Ledger'} (₹{lastBookedOrder.total})
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleShareWhatsAppSlip}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 transition cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white/20" />
              <span>{language === 'te' ? 'వాట్సాప్‌లో స్లిప్ షేర్ చేయండి' : 'Send Slip To Driver on WhatsApp'}</span>
            </motion.button>

            <button
              onClick={() => setLastBookedOrder(null)}
              className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              {language === 'te' ? 'మెనూకి తిరిగి వెళ్ళండి' : 'Back to Wholesale Menu'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
