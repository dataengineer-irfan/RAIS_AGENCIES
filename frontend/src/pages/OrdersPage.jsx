import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  PlusCircle, 
  Search, 
  FileText, 
  CheckCircle2, 
  Clock, 
  X, 
  ArrowRight, 
  Eye,
  MessageSquare,
  Printer,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  Package,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { orderApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { OrderBuilderModal } from '../components/OrderBuilderModal';
import { StatusBadge } from '../components/StatusBadge';

export const OrdersPage = ({ onOpenBillingForInvoice }) => {
  const { hasRole } = useAuth();
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Master-Detail State
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeInspectorTab, setActiveInspectorTab] = useState('items'); // items, details, actions
  const [copiedCode, setCopiedCode] = useState(false);
  const [convertingId, setConvertingId] = useState(null);

  // Modal
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async (selectId = null) => {
    setLoading(true);
    try {
      const params = statusFilter !== 'ALL' ? { status: statusFilter } : {};
      const data = await orderApi.list(params);
      const items = Array.isArray(data) ? data : (data?.items || data?.data || []);
      setOrders(items);
      if (items.length > 0) {
        const initialId = selectId || items[0].id;
        setSelectedOrderId(initialId);
        loadOrderDetails(initialId);
      } else {
        setSelectedOrderId(null);
        setSelectedOrderDetails(null);
      }
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetails = async (orderId) => {
    setDetailsLoading(true);
    try {
      const details = await orderApi.get(orderId);
      setSelectedOrderDetails(details);
    } catch (err) {
      console.error('Failed to load order details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSelectOrder = (order) => {
    setSelectedOrderId(order.id);
    loadOrderDetails(order.id);
  };

  const handleConvertToInvoice = async (orderId) => {
    setConvertingId(orderId);
    try {
      const inv = await orderApi.convertToInvoice(orderId);
      await loadOrders(orderId);
      if (onOpenBillingForInvoice) {
        onOpenBillingForInvoice(inv);
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to convert order to invoice.');
    } finally {
      setConvertingId(null);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendWhatsAppConfirmation = (ord) => {
    const total = parseFloat(ord.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const text = `*RAIS AGENCIES — Order Booking Confirmation*%0A%0AOrder Ref: *${ord.order_number}*%0ACustomer: *${ord.customer_name}*%0ATotal Amount: *₹${total}*%0AStatus: *${ord.status}*%0A%0AThank you for ordering with RAIS Agencies, Rayachoty.`;
    window.open(`https://wa.me/91${ord.customer_phone || '9347453135'}?text=${text}`, '_blank');
  };

  const filteredOrders = orders.filter(o => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (o.order_number || '').toLowerCase().includes(term) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(term)) ||
      (o.customer_phone && o.customer_phone.includes(term))
    );
  });

  const selectedOrder = selectedOrderDetails || orders.find(o => o.id === selectedOrderId);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden gap-2">
      
      {/* ─── TOP ACTION & FILTER HEADER BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 shrink-0 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white">
                Orders & Advance Bookings Hub
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-amber-400 rounded-full border border-slate-700 font-mono">
                {orders.length} Bookings
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Master-Detail Supply Reservation & 1-Click Tax Invoice Conversion
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search order # or customer..."
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-44 sm:w-56"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {hasRole(['ADMIN', 'OPERATOR']) && (
            <button
              onClick={() => setOrderModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all hover:scale-105"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Booking</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── MASTER-DETAIL SPLIT-PANE CONTAINER (100% Viewport-Locked) ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        
        {/* ─── LEFT MASTER PANE (42% Width = 5 cols) ─── */}
        <div className="lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            <span>Advance Orders ({filteredOrders.length})</span>
            <span>Total Value</span>
          </div>

          {/* Master Scrollable List */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
            {loading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-slate-800/50 rounded-xl" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No matching order bookings found.
              </div>
            ) : (
              filteredOrders.map(ord => {
                const isSelected = ord.id === selectedOrderId;
                const total = parseFloat(ord.total_amount || 0);

                return (
                  <div
                    key={ord.id}
                    onClick={() => handleSelectOrder(ord)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="overflow-hidden pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[11px] text-amber-400">
                          {ord.order_number}
                        </span>
                        <StatusBadge status={ord.status} />
                      </div>
                      <h4 className="font-bold text-white text-xs truncate mt-0.5">
                        {ord.customer_name}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {ord.order_date} • {ord.items_count || (ord.items ? ord.items.length : 0)} line items
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <div className="font-mono font-black text-xs text-white">
                          ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[9px] text-slate-500">
                          {ord.delivery_date ? `Due ${ord.delivery_date}` : 'Standard Delivery'}
                        </span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-600'}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── RIGHT DETAIL INSPECTOR (58% Width = 7 cols) ─── */}
        <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-col overflow-hidden">
          {selectedOrder ? (
            <div className="h-full flex flex-col overflow-hidden">
              
              {/* Inspector Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-800 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                      {selectedOrder.order_number}
                      <button 
                        onClick={() => handleCopyCode(selectedOrder.order_number)}
                        className="hover:text-white"
                        title="Copy Order #"
                      >
                        {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </span>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white mt-1">
                    {selectedOrder.customer_name}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Booked on {selectedOrder.order_date} {selectedOrder.customer_phone ? `• Ph: ${selectedOrder.customer_phone}` : ''}
                  </p>
                </div>

                {/* Direct Action Chips */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedOrder.status !== 'COMPLETED' && hasRole(['ADMIN', 'OPERATOR']) && (
                    <button
                      onClick={() => handleConvertToInvoice(selectedOrder.id)}
                      disabled={convertingId === selectedOrder.id}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-md shadow-amber-500/20 transition-all hover:scale-105 disabled:opacity-50"
                      title="Convert Order to Official GST Tax Invoice"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{convertingId === selectedOrder.id ? 'Converting...' : 'Convert to Invoice'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleSendWhatsAppConfirmation(selectedOrder)}
                    className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all"
                    title="Send WhatsApp Confirmation"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Inspector Tab Bar */}
              <div className="flex items-center gap-1.5 pt-2 pb-3 border-b border-slate-800/80 shrink-0">
                {[
                  { id: 'items', label: 'Itemized Line Items', icon: Package },
                  { id: 'details', label: 'Booking & Delivery Info', icon: Calendar },
                  { id: 'actions', label: 'Action Console', icon: CheckCircle2 },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeInspectorTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveInspectorTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Inspector Content Area (Internal Scroll) */}
              <div className="flex-1 min-h-0 overflow-y-auto pt-3 pr-1">
                
                {/* ─── TAB 1: ITEMIZED ORDER ITEMS ─── */}
                {activeInspectorTab === 'items' && (
                  <div className="space-y-3">
                    {detailsLoading ? (
                      <div className="space-y-2 animate-pulse py-4">
                        <div className="h-10 bg-slate-800 rounded" />
                        <div className="h-10 bg-slate-800 rounded" />
                      </div>
                    ) : !selectedOrder.items || selectedOrder.items.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-xs">
                        No line items recorded on this booking.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="space-y-1.5">
                          {selectedOrder.items.map((item, idx) => (
                            <div 
                              key={idx}
                              className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs"
                            >
                              <div className="overflow-hidden pr-2">
                                <span className="font-mono text-[10px] text-amber-400 font-bold">{item.product_sku || 'SKU'}</span>
                                <h5 className="font-bold text-white text-xs truncate mt-0.5">{item.product_name}</h5>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {item.quantity} units @ ₹{parseFloat(item.unit_price || 0).toFixed(2)}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-mono font-bold text-white text-xs">
                                  ₹{parseFloat(item.line_total || item.total_amount || 0).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Order Subtotal & Total Banner */}
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Pricing Structure</span>
                            <span className="text-slate-300 font-mono">
                              Direct Wholesale • No Tax Added
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Grand Booking Total</span>
                            <span className="text-base font-black text-amber-400 font-mono">
                              ₹{parseFloat(selectedOrder.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── TAB 2: BOOKING & DELIVERY INFO ─── */}
                {activeInspectorTab === 'details' && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Delivery Schedule & Logistics
                      </h4>
                      <div className="grid grid-cols-2 gap-2.5 text-slate-300">
                        <div>
                          <span className="text-slate-500 text-[10px] block">Booking Date:</span>
                          <span className="font-mono font-bold">{selectedOrder.order_date}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Target Delivery Date:</span>
                          <span className="font-mono font-bold">{selectedOrder.delivery_date || 'Same Day / Immediate'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 text-[10px] block">Delivery Instructions / Notes:</span>
                          <span className="font-medium">{selectedOrder.notes || 'Standard frozen food delivery route to outlet.'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 3: ACTION CONSOLE ─── */}
                {activeInspectorTab === 'actions' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">
                      Operations available for booking <strong className="text-white">{selectedOrder.order_number}</strong>:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedOrder.status !== 'COMPLETED' && hasRole(['ADMIN', 'OPERATOR']) && (
                        <button
                          onClick={() => handleConvertToInvoice(selectedOrder.id)}
                          disabled={convertingId === selectedOrder.id}
                          className="p-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-left text-amber-400 transition-all hover:scale-[1.02]"
                        >
                          <FileText className="w-5 h-5" />
                          <div>
                            <div className="font-bold text-xs text-white">Convert to Invoice</div>
                            <span className="text-[10px] text-slate-400">Generate invoice & deduct warehouse stock</span>
                          </div>
                        </button>
                      )}

                      <button
                        onClick={() => handleSendWhatsAppConfirmation(selectedOrder)}
                        className="p-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/30 rounded-xl flex items-center gap-2.5 text-left text-emerald-400 transition-all hover:scale-[1.02]"
                      >
                        <MessageSquare className="w-5 h-5" />
                        <div>
                          <div className="font-bold text-xs text-white">Send WhatsApp Summary</div>
                          <span className="text-[10px] text-slate-400">Dispatch booking confirmation slip</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Select an order from the master list to inspect.
            </div>
          )}
        </div>

      </div>

      {/* ─── ORDER BUILDER MODAL ─── */}
      <OrderBuilderModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        onOrderCreated={(newOrd) => {
          setOrderModalOpen(false);
          loadOrders(newOrd?.id);
        }}
      />

    </div>
  );
};
