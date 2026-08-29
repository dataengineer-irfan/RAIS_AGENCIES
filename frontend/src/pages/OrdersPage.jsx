import React, { useState, useEffect } from 'react';
import { ShoppingBag, PlusCircle, Search, FileText, CheckCircle2, Clock, X, ArrowRight, Eye } from 'lucide-react';
import { orderApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { OrderBuilderModal } from '../components/OrderBuilderModal';

export const OrdersPage = ({ onOpenBillingForInvoice }) => {
  const { hasRole } = useAuth();
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [convertingId, setConvertingId] = useState(null);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'ALL' ? { status: statusFilter } : {};
      const data = await orderApi.list(params);
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToInvoice = async (orderId) => {
    setConvertingId(orderId);
    try {
      const inv = await orderApi.convertToInvoice(orderId);
      await loadOrders();
      if (onOpenBillingForInvoice) {
        onOpenBillingForInvoice(inv);
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to convert order to invoice.');
    } finally {
      setConvertingId(null);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(term) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(term)) ||
      (o.customer_phone && o.customer_phone.includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-500" />
            <span>Orders & Bookings Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Customer bookings, stock reservation & 1-click invoice conversion
          </p>
        </div>

        {hasRole(['ADMIN', 'OPERATOR']) && (
          <button
            onClick={() => setOrderModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ New Order</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order number, customer name, or phone..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {['ALL', 'CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Items</th>
                <th className="py-3 px-3 text-right">Subtotal</th>
                <th className="py-3 px-3 text-right">Total (₹)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 text-xs">
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 text-xs">
                    No orders found. Click "+ New Order" to create one.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      {o.order_number}
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {o.order_date}
                    </td>
                    <td className="py-3 px-3 text-slate-200">
                      <p className="font-bold truncate max-w-[180px]">{o.customer_name}</p>
                      <p className="text-[10px] text-slate-500">{o.customer_phone}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono text-[11px]">
                        {o.items?.length || 0} SKUs
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">
                      ₹{parseFloat(o.subtotal).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-white">
                      ₹{parseFloat(o.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        o.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : o.status === 'CONFIRMED'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {o.status !== 'COMPLETED' && hasRole(['ADMIN', 'OPERATOR']) && (
                          <button
                            onClick={() => handleConvertToInvoice(o.id)}
                            disabled={convertingId === o.id}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded text-[10px] uppercase flex items-center gap-1 shadow-sm"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{convertingId === o.id ? 'Generating...' : 'Generate Invoice'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">{selectedOrder.order_number}</h3>
                  <p className="text-xs text-slate-400">{selectedOrder.customer_name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Order Date:</span>
                  <span className="font-semibold text-slate-200">{selectedOrder.order_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-bold text-amber-400 uppercase">{selectedOrder.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Subtotal:</span>
                  <span className="font-mono text-slate-200">₹{parseFloat(selectedOrder.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tax Amount:</span>
                  <span className="font-mono text-slate-200">₹{parseFloat(selectedOrder.tax_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800">
                  <span className="text-slate-300 font-bold">Total Order Value:</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">₹{parseFloat(selectedOrder.total_amount).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Line Items ({selectedOrder.items?.length})
                </h4>
                <div className="space-y-2">
                  {selectedOrder.items?.map((itm, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-200">{itm.item_name}</p>
                        <p className="text-[10px] text-slate-400">{itm.quantity} × ₹{parseFloat(itm.unit_price).toFixed(2)} ({itm.packaging_unit})</p>
                      </div>
                      <p className="font-mono font-bold text-slate-200">₹{parseFloat(itm.line_total).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              {selectedOrder.status !== 'COMPLETED' && hasRole(['ADMIN', 'OPERATOR']) && (
                <button
                  onClick={() => handleConvertToInvoice(selectedOrder.id)}
                  disabled={convertingId === selectedOrder.id}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <FileText className="w-4 h-4" />
                  <span>{convertingId === selectedOrder.id ? 'Generating...' : 'Generate Invoice'}</span>
                </button>
              )}
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg uppercase tracking-wider ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      <OrderBuilderModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        onOrderCreated={loadOrders}
      />
    </div>
  );
};
