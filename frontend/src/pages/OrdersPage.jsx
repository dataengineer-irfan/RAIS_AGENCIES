import React, { useState, useEffect, useMemo } from 'react';
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
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { orderApi } from '../services/api';
import { copyToClipboard, openWhatsApp } from '../utils/mobileHelpers';
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
  const [copiedCardOrderId, setCopiedCardOrderId] = useState(null);
  const [convertingId, setConvertingId] = useState(null);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

  // Modal
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

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
    setMobileView('detail');
  };

  const handleConvertToInvoice = async (orderId) => {
    setConvertingId(orderId);
    try {
      const inv = await orderApi.convertToInvoice(orderId);
      showToast(`Order converted to Invoice ${inv.invoice_number || 'INV'} successfully! Stock deducted.`, 'success');
      await loadOrders(orderId);
      if (onOpenBillingForInvoice) {
        setTimeout(() => {
          onOpenBillingForInvoice(inv);
        }, 800);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to convert order to invoice.';
      showToast(msg, 'error');
    } finally {
      setConvertingId(null);
    }
  };

  const handleCopyCode = async (code) => {
    await copyToClipboard(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendWhatsAppConfirmation = (ord) => {
    const total = parseFloat(ord.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const text = `*RAIS AGENCIES — Order Booking Confirmation*\n\nOrder Ref: *${ord.order_number}*\nCustomer: *${ord.customer_name}*\nTotal Amount: *₹${total}*\nStatus: *${ord.status}*\n\nThank you for ordering with RAIS Agencies, Rayachoty.`;
    openWhatsApp(ord.customer_phone || '9347453135', text);
  };

  // Micro-Metrics & Status Counts for 1-Click Ribbon
  const orderCounts = useMemo(() => {
    let pending = 0;
    let confirmed = 0;
    let completed = 0;
    let totalValue = 0;
    for (const ord of orders) {
      totalValue += parseFloat(ord.total_amount || 0);
      const st = (ord.status || '').toUpperCase();
      if (st === 'PENDING') pending++;
      else if (st === 'CONFIRMED') confirmed++;
      else if (st === 'COMPLETED') completed++;
    }
    return {
      total: orders.length,
      pending,
      confirmed,
      completed,
      totalValue
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase().trim();
      const matchHeader = (
        (o.order_number || '').toLowerCase().includes(term) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(term)) ||
        (o.customer_phone && o.customer_phone.includes(term))
      );
      if (matchHeader) return true;
      if (Array.isArray(o.items)) {
        return o.items.some(it => (it.item_description || it.product_name || '').toLowerCase().includes(term));
      }
      return false;
    });
  }, [orders, statusFilter, searchTerm]);

  const selectedOrder = selectedOrderDetails || orders.find(o => o.id === selectedOrderId);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden gap-2">
      
      {/* ─── DESKTOP UNIFIED COMMAND RIBBON (>= md) ─── */}
      <div className="hidden md:flex items-center justify-between gap-2.5 bg-slate-900/95 border border-slate-800 rounded-2xl px-3.5 py-1.5 shrink-0 shadow-md min-h-[46px]">
        {/* Left: Icon & Title */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-black text-white whitespace-nowrap">
              Orders Hub
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-amber-400 rounded-full border border-slate-700 font-mono">
              {loading && orders.length === 0 ? 'Syncing...' : `${filteredOrders.length}/${orders.length}`}
            </span>
          </div>
        </div>

        {/* Center: 1-Click Status Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All ({orderCounts.total})
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
            }`}
          >
            <span>⏳ Pending</span>
            <span className="font-mono text-[11px]">({orderCounts.pending})</span>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'CONFIRMED' ? 'ALL' : 'CONFIRMED')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              statusFilter === 'CONFIRMED'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-400'
                : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30'
            }`}
          >
            <span>✅ Confirmed</span>
            <span className="font-mono text-[11px]">({orderCounts.confirmed})</span>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
            }`}
          >
            <span>Done</span>
            <span className="font-mono text-[11px]">({orderCounts.completed})</span>
          </button>
        </div>

        {/* Center-Right: Omni-Search Input with Clear */}
        <div className="relative flex-1 max-w-[240px] min-w-[140px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search order #, customer, item..."
            className="w-full pl-8 pr-7 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold p-0.5"
            >
              ✕
            </button>
          )}
        </div>

        {/* Live Booking Value Micro-Ticker */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-slate-950/80 border border-slate-800 rounded-xl font-mono text-[11px] shrink-0">
          <span className="text-amber-400">Total Booked: <strong className="font-bold">₹{orderCounts.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></span>
        </div>

        {/* Right: + Booking CTA */}
        {hasRole(['ADMIN', 'OPERATOR']) && (
          <button
            onClick={() => setOrderModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all hover:scale-105 shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Booking</span>
          </button>
        )}
      </div>

      {/* ─── MOBILE COMPACT SEARCH & ACTION BAR (< md) ─── */}
      <div className="md:hidden flex flex-col gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-2 shrink-0 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${orders.length} orders...`}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold p-0.5"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer shrink-0 max-w-[95px]"
          >
            <option value="ALL">All ({orderCounts.total})</option>
            <option value="PENDING">Pending ({orderCounts.pending})</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Done</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {hasRole(['ADMIN', 'OPERATOR']) && (
            <button
              onClick={() => setOrderModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs shrink-0 shadow-sm active:scale-95 transition"
              title="Create Order Booking"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Order</span>
            </button>
          )}
        </div>

        {/* Mobile 1-Click Status Strip */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-[11px] font-mono">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2 py-0.5 rounded-lg whitespace-nowrap font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            All ({orderCounts.total})
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`px-2 py-0.5 rounded-lg whitespace-nowrap font-bold transition-all ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            }`}
          >
            ⏳ Pending ({orderCounts.pending})
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'CONFIRMED' ? 'ALL' : 'CONFIRMED')}
            className={`px-2 py-0.5 rounded-lg whitespace-nowrap font-bold transition-all ${
              statusFilter === 'CONFIRMED'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
            }`}
          >
            ✅ Confirmed ({orderCounts.confirmed})
          </button>
          <span className="text-slate-700 mx-0.5">|</span>
          <span className="text-amber-400/90 whitespace-nowrap px-1 py-0.5 font-bold">
            ₹{orderCounts.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toast && (
        <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all shrink-0 animate-in fade-in slide-in-from-top-2 ${
          toast.type === 'error'
            ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white p-1">
            ✕
          </button>
        </div>
      )}

      {/* ─── MASTER-DETAIL SPLIT-PANE CONTAINER (100% Viewport-Locked) ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        
        {/* ─── LEFT MASTER PANE (42% Width = 5 cols) ─── */}
        <div className={`${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'} lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-lg flex-col overflow-hidden`}>
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
                const isCopied = copiedCardOrderId === ord.id;

                const itemsList = Array.isArray(ord.items) ? ord.items : [];
                const firstItemName = itemsList.length > 0 ? (itemsList[0].item_description || itemsList[0].product_name) : null;
                const remainingItemsCount = itemsList.length > 1 ? itemsList.length - 1 : 0;

                return (
                  <div
                    key={ord.id}
                    onClick={() => handleSelectOrder(ord)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs group ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="overflow-hidden pr-2 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-[11px] text-amber-400 flex items-center gap-1">
                          {ord.order_number}
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await copyToClipboard(ord.order_number);
                              setCopiedCardOrderId(ord.id);
                              setTimeout(() => setCopiedCardOrderId(null), 1500);
                            }}
                            className="text-slate-500 hover:text-amber-300 p-0.5 rounded transition"
                            title="Copy Order #"
                          >
                            {isCopied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />}
                          </button>
                        </span>
                        <StatusBadge status={ord.status} />
                      </div>

                      <h4 className="font-bold text-white text-xs truncate mt-0.5">
                        {ord.customer_name}
                      </h4>

                      {/* Items Preview Chip */}
                      {firstItemName ? (
                        <p className="text-[11px] text-amber-200/80 truncate mt-0.5 flex items-center gap-1 font-mono">
                          <span className="text-slate-500 font-sans">📦</span>
                          <span>{firstItemName}</span>
                          {remainingItemsCount > 0 && (
                            <span className="text-[10px] text-slate-400 font-sans">+{remainingItemsCount} more</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {ord.order_date} • {ord.items_count || 0} line items
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <div className="font-mono font-black text-xs text-white">
                          ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[9px] text-slate-500 block">
                          {ord.delivery_date ? `Due ${ord.delivery_date}` : 'Standard'}
                        </span>
                      </div>

                      {/* Quick WhatsApp Confirmation Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendWhatsAppConfirmation(ord);
                        }}
                        className="p-1 rounded-lg bg-slate-800/80 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border border-slate-700/50 transition opacity-80 group-hover:opacity-100"
                        title="Share WhatsApp Booking Confirmation"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>

                      <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-600'}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── RIGHT DETAIL INSPECTOR (58% Width = 7 cols) ─── */}
        <div className={`${mobileView === 'list' ? 'hidden lg:flex' : 'flex'} lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-3 sm:p-4 shadow-xl flex flex-col overflow-hidden`}>
          {/* Mobile Back to List button */}
          <div className="lg:hidden pb-2 mb-2 border-b border-slate-800 flex items-center justify-between shrink-0">
            <button
              onClick={() => setMobileView('list')}
              className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Orders List</span>
            </button>
            <span className="text-[10px] text-slate-500 font-mono">
              {filteredOrders.length} Orders
            </span>
          </div>

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
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {item.brand && (
                                    <span className="font-mono text-[10px] text-amber-400 font-bold uppercase tracking-wider">{item.brand}</span>
                                  )}
                                  {item.product_sku && (
                                    <span className="font-mono text-[10px] text-slate-400">{item.product_sku}</span>
                                  )}
                                </div>
                                <h5 className="font-bold text-white text-xs truncate mt-0.5">
                                  {item.item_name || item.item_description || item.product_name || 'Item'}
                                </h5>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {item.quantity} {item.packaging_unit || 'units'} @ ₹{parseFloat(item.unit_price || 0).toFixed(2)}
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
