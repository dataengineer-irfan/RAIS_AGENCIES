import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  MapPin, 
  CreditCard, 
  FileText, 
  ArrowUpRight, 
  ArrowDownLeft, 
  X, 
  Edit,
  History
} from 'lucide-react';
import { customerApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export const CustomersPage = ({ onOpenCustomerModal, onOpenPaymentForCustomer, onOpenInvoiceForCustomer }) => {
  const { hasRole } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await customerApi.list();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewLedger = async (cust) => {
    setSelectedCustomer(cust);
    setLedgerLoading(true);
    try {
      const ledger = await customerApi.getLedger(cust.id);
      setLedgerEntries(ledger);
    } catch (err) {
      console.error('Failed to load ledger', err);
    } finally {
      setLedgerLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.business_name.toLowerCase().includes(term) ||
      c.contact_person.toLowerCase().includes(term) ||
      c.customer_code.toLowerCase().includes(term) ||
      c.phone.includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            <span>Customer & Restaurant Directory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            B2B accounts, credit limits, real-time ledgers & transaction histories
          </p>
        </div>

        {hasRole(['ADMIN', 'OPERATOR']) && (
          <button
            onClick={() => onOpenCustomerModal(null)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by restaurant name, contact person, or phone..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>
        <p className="text-xs text-slate-400 font-semibold hidden sm:block">
          Total: <span className="text-amber-400 font-bold">{filteredCustomers.length}</span> accounts
        </p>
      </div>

      {/* Customers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            Loading customers...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            No customers found.
          </div>
        ) : (
          filteredCustomers.map((cust) => (
            <div
              key={cust.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {cust.customer_code}
                    </span>
                    <h3 className="font-bold text-sm text-white mt-1.5 leading-snug">{cust.business_name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>{cust.contact_person}</span>
                    </p>
                  </div>
                  <StatusBadge status={cust.status} />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{cust.phone}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span className="truncate">{cust.address_line1}, {cust.city}</span>
                  </div>
                </div>

                {/* Financial Health Box */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Total Invoiced</span>
                    <p className="font-mono font-bold text-slate-200 mt-0.5">₹{parseFloat(cust.total_invoiced).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Balance Due</span>
                    <p className={`font-mono font-bold mt-0.5 ${parseFloat(cust.outstanding_balance) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      ₹{parseFloat(cust.outstanding_balance).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleViewLedger(cust)}
                  className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Ledger History</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {hasRole(['ADMIN', 'OPERATOR']) && (
                    <>
                      <button
                        onClick={() => onOpenPaymentForCustomer(cust)}
                        title="Record Payment"
                        className="p-1.5 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 rounded-lg"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onOpenCustomerModal(cust)}
                        title="Edit Customer"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Customer Ledger Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedCustomer.business_name}</h3>
                  <p className="text-xs text-slate-400">Account Code: <span className="font-mono font-bold text-amber-400">{selectedCustomer.customer_code}</span></p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Balances Summary Banner */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Total Invoiced</span>
                <p className="font-mono font-bold text-slate-200 mt-0.5">₹{parseFloat(selectedCustomer.total_invoiced).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Total Paid</span>
                <p className="font-mono font-bold text-emerald-400 mt-0.5">₹{parseFloat(selectedCustomer.total_paid).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Live Outstanding</span>
                <p className="font-mono font-black text-amber-400 text-sm mt-0.5">₹{parseFloat(selectedCustomer.outstanding_balance).toFixed(2)}</p>
              </div>
            </div>

            {/* Timeline Ledger Table */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Chronological Statement & Ledger Timeline
              </h4>

              {ledgerLoading ? (
                <p className="text-xs text-slate-500 text-center py-8">Loading statement entries...</p>
              ) : ledgerEntries.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No billing or payment entries found.</p>
              ) : (
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 bg-slate-900/60 text-[10px] uppercase font-bold text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Reference</th>
                        <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                        <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                        <th className="py-2.5 px-3 text-right font-bold">Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 font-mono">
                      {ledgerEntries.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/30">
                          <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px]">{entry.date}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block font-bold ${entry.type === 'INVOICE' ? 'text-slate-200' : 'text-emerald-400'}`}>
                              {entry.reference}
                            </span>
                            <p className="font-sans text-[10px] text-slate-500 font-normal">{entry.description}</p>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-300">
                            {parseFloat(entry.debit) > 0 ? `₹${parseFloat(entry.debit).toFixed(2)}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400">
                            {parseFloat(entry.credit) > 0 ? `₹${parseFloat(entry.credit).toFixed(2)}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                            ₹{parseFloat(entry.running_balance).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg uppercase tracking-wider"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
