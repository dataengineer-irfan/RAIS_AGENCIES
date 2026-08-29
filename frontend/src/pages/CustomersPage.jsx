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
  Edit,
  History,
  Eye,
  ShoppingBag
} from 'lucide-react';
import { customerApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { CustomerProfileModal } from '../components/CustomerProfileModal';
import { CustomerModal } from '../components/CustomerModal';

export const CustomersPage = ({ 
  onOpenPaymentForCustomer, 
  onOpenInvoiceForCustomer,
  onOpenOrderForCustomer
}) => {
  const { hasRole } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerForProfile, setSelectedCustomerForProfile] = useState(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);

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
            onClick={() => {
              setCustomerToEdit(null);
              setCustomerModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ New Customer</span>
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
            No customers found. Click "+ New Customer" to add one.
          </div>
        ) : (
          filteredCustomers.map((cust) => (
            <div
              key={cust.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-all cursor-pointer group"
              onClick={() => setSelectedCustomerForProfile(cust)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {cust.customer_code}
                    </span>
                    <h3 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors mt-1.5 leading-snug">
                      {cust.business_name}
                    </h3>
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
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Total Invoiced</span>
                    <p className="font-bold text-slate-200 mt-0.5">₹{parseFloat(cust.total_invoiced).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Balance Due</span>
                    <p className={`font-bold mt-0.5 ${parseFloat(cust.outstanding_balance) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      ₹{parseFloat(cust.outstanding_balance).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div 
                className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedCustomerForProfile(cust)}
                  className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Workspace</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {hasRole(['ADMIN', 'OPERATOR']) && (
                    <>
                      <button
                        onClick={() => onOpenOrderForCustomer(cust)}
                        title="New Order"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                      <button
                        onClick={() => onOpenPaymentForCustomer(cust)}
                        title="Record Payment"
                        className="p-1.5 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 rounded-lg"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setCustomerToEdit(cust);
                          setCustomerModalOpen(true);
                        }}
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

      {/* Customer Workspace Modal */}
      <CustomerProfileModal
        isOpen={!!selectedCustomerForProfile}
        onClose={() => setSelectedCustomerForProfile(null)}
        customer={selectedCustomerForProfile}
        onOpenOrder={(cust) => {
          setSelectedCustomerForProfile(null);
          onOpenOrderForCustomer(cust);
        }}
        onOpenInvoice={(cust) => {
          setSelectedCustomerForProfile(null);
          onOpenInvoiceForCustomer(cust);
        }}
        onOpenPayment={(cust) => {
          setSelectedCustomerForProfile(null);
          onOpenPaymentForCustomer(cust);
        }}
      />

      {/* Add / Edit Customer Modal */}
      <CustomerModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        customerToEdit={customerToEdit}
        onCustomerSaved={loadCustomers}
      />
    </div>
  );
};
