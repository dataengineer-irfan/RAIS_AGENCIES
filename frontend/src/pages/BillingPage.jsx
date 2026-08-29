import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  PlusCircle, 
  Printer, 
  Eye, 
  CreditCard, 
  Filter, 
  CheckCircle, 
  Ban, 
  X, 
  Calendar,
  Search
} from 'lucide-react';
import { billingApi, customerApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export const BillingPage = ({ onOpenInvoiceBuilder, onOpenPaymentForInvoice }) => {
  const { hasRole } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatusFilter, setActiveStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Status update modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusToSet, setStatusToSet] = useState('CANCELLED');
  const [statusReason, setStatusReason] = useState('');

  useEffect(() => {
    loadInvoices();
  }, [activeStatusFilter]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeStatusFilter !== 'ALL') {
        params.status = activeStatusFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      const data = await billingApi.listInvoices(params);
      setInvoices(data);
    } catch (err) {
      console.error('Failed to load invoices', err);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueDraft = async (invoiceId) => {
    try {
      await billingApi.issueInvoice(invoiceId);
      loadInvoices();
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        const updated = await billingApi.getInvoice(invoiceId);
        setSelectedInvoice(updated);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to issue invoice');
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    try {
      await billingApi.updateStatus(selectedInvoice.id, statusToSet, statusReason);
      setStatusModalOpen(false);
      setStatusReason('');
      loadInvoices();
      const updated = await billingApi.getInvoice(selectedInvoice.id);
      setSelectedInvoice(updated);
    } catch (err) {
      alert(err.response?.data?.message || 'Status change failed');
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(term) ||
      inv.customer_name.toLowerCase().includes(term) ||
      inv.customer_code.toLowerCase().includes(term)
    );
  });

  const statusTabs = [
    { id: 'ALL', label: 'All Invoices' },
    { id: 'ISSUED', label: 'Issued / Open' },
    { id: 'PARTIALLY_PAID', label: 'Partially Paid' },
    { id: 'PAID', label: 'Fully Paid' },
    { id: 'OVERDUE', label: 'Overdue' },
    { id: 'DRAFT', label: 'Drafts' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <span>Billing & Invoices Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative financial billing, invoice lifecycle, and payment reconciliation
          </p>
        </div>

        {hasRole(['ADMIN', 'OPERATOR']) && (
          <button
            onClick={onOpenInvoiceBuilder}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Tax Invoice</span>
          </button>
        )}
      </div>

      {/* Status Filter Tabs & Search Bar */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeStatusFilter === tab.id
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoice or customer..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3 text-right">Subtotal</th>
                <th className="py-3 px-3 text-right">Tax (GST)</th>
                <th className="py-3 px-3 text-right">Total</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-3 text-right font-bold">Outstanding</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-500 text-xs">
                    Loading invoices...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-500 text-xs">
                    No matching invoices found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-200">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="text-amber-400 hover:underline"
                      >
                        {inv.invoice_number}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">{inv.invoice_date}</td>
                    <td className="py-3 px-3 text-slate-200">
                      <p className="font-bold truncate max-w-[150px]">{inv.customer_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{inv.customer_code}</p>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">₹{parseFloat(inv.subtotal).toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">₹{parseFloat(inv.tax_amount).toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-200">₹{parseFloat(inv.total_amount).toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400">₹{parseFloat(inv.paid_amount).toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-amber-400">
                      ₹{parseFloat(inv.outstanding_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          title="View Invoice Details"
                          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={`/api/invoices/${inv.id}/print-html`}
                          target="_blank"
                          rel="noreferrer"
                          title="Print / PDF Document"
                          className="p-1.5 text-slate-400 hover:text-blue-400 rounded hover:bg-slate-800"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </a>
                        {['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status) && (
                          <button
                            onClick={() => onOpenPaymentForInvoice(inv)}
                            title="Record Payment"
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded hover:bg-emerald-500/10"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Details Drawer / Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">{selectedInvoice.invoice_number}</h3>
                  <p className="text-xs text-slate-400">{selectedInvoice.customer_name} ({selectedInvoice.customer_code})</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedInvoice.status} />
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto text-xs">
              {/* Top Meta Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Invoice Date</span>
                  <p className="font-bold text-slate-200 mt-0.5">{selectedInvoice.invoice_date}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Due Date</span>
                  <p className="font-bold text-slate-200 mt-0.5">{selectedInvoice.due_date}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Grand Total</span>
                  <p className="font-bold font-mono text-slate-200 mt-0.5">₹{parseFloat(selectedInvoice.total_amount).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Balance Due</span>
                  <p className="font-bold font-mono text-rose-400 mt-0.5">₹{parseFloat(selectedInvoice.outstanding_amount).toFixed(2)}</p>
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Billed Line Items</h4>
                <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="border-b border-slate-800 bg-slate-900/60 text-[10px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Price</th>
                        <th className="p-2.5 text-right">GST</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {selectedInvoice.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="p-2.5">
                            <p className="font-bold text-slate-200">{item.item_description}</p>
                            <p className="text-[10px] text-slate-500">{item.packaging_unit}</p>
                          </td>
                          <td className="p-2.5 text-center font-bold text-slate-300">{item.quantity}</td>
                          <td className="p-2.5 text-right font-mono text-slate-400">₹{parseFloat(item.unit_price).toFixed(2)}</td>
                          <td className="p-2.5 text-right font-mono text-slate-400">{item.tax_rate}%</td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-200">₹{parseFloat(item.line_total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Allocations History */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Settlement & Payment Allocations</h4>
                {selectedInvoice.allocations?.length === 0 ? (
                  <p className="text-slate-500 italic p-3 bg-slate-950 rounded-lg border border-slate-800">
                    No payments allocated to this invoice yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedInvoice.allocations?.map((alloc, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-200 font-mono">{alloc.payment_number}</p>
                          <p className="text-[10px] text-slate-500">{alloc.payment_date} via {alloc.payment_method}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-emerald-400">₹{parseFloat(alloc.allocated_amount).toFixed(2)}</p>
                          <span className="text-[9px] font-bold text-emerald-600 uppercase">Allocated</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Terms & Notes */}
              {selectedInvoice.notes && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Notes</h4>
                  <p className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 whitespace-pre-wrap">
                    {selectedInvoice.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
              <a
                href={`/api/invoices/${selectedInvoice.id}/print-html`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold uppercase tracking-wider text-xs"
              >
                <Printer className="w-4 h-4" />
                Print / Save PDF
              </a>

              <div className="flex items-center gap-2">
                {selectedInvoice.status === 'DRAFT' && (
                  <button
                    onClick={() => handleIssueDraft(selectedInvoice.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Issue Invoice
                  </button>
                )}

                {['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(selectedInvoice.status) && (
                  <button
                    onClick={() => {
                      onOpenPaymentForInvoice(selectedInvoice);
                      setSelectedInvoice(null);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider"
                  >
                    <CreditCard className="w-4 h-4" />
                    Record Settlement
                  </button>
                )}

                {hasRole('ADMIN') && ['ISSUED', 'DRAFT'].includes(selectedInvoice.status) && (
                  <button
                    onClick={() => setStatusModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg font-bold text-xs uppercase tracking-wider"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Cancel / Void
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Dialog */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Cancel or Void Invoice</h3>
            <p className="text-xs text-slate-400 mb-4">
              Cancelling/voiding locks the invoice and sets outstanding balance to ₹0.00.
            </p>
            <form onSubmit={handleStatusSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Target Status</label>
                <select
                  value={statusToSet}
                  onChange={(e) => setStatusToSet(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                >
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="VOID">VOID (Administrative correction)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Reason *</label>
                <textarea
                  required
                  rows={2}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="e.g. Order cancelled by customer before dispatch"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 font-bold rounded"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded"
                >
                  Confirm Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
