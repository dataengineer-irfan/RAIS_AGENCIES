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
  ShoppingBag,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  TrendingUp,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { customerApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { CustomerModal } from '../components/CustomerModal';

export const CustomersPage = ({ 
  onOpenCustomerModal,
  onOpenPaymentForCustomer, 
  onOpenInvoiceForCustomer,
  onOpenOrderForCustomer
}) => {
  const { hasRole } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE
  
  // Selected Customer for Right Detail Inspector
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [activeInspectorTab, setActiveInspectorTab] = useState('overview'); // overview, ledger, actions
  const [copiedCode, setCopiedCode] = useState(false);

  // Modal
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async (selectId = null) => {
    setLoading(true);
    try {
      const data = await customerApi.list({ limit: 100 });
      const items = Array.isArray(data) ? data : (data?.items || data?.data || []);
      setCustomers(items);
      if (items.length > 0) {
        const initialId = selectId || items[0].id;
        setSelectedCustomerId(initialId);
        loadCustomerLedger(initialId);
      }
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerLedger = async (customerId) => {
    setLedgerLoading(true);
    try {
      const ledger = await customerApi.getLedger(customerId);
      setLedgerData(ledger);
    } catch (err) {
      console.error('Failed to load customer ledger:', err);
      setLedgerData(null);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomerId(customer.id);
    loadCustomerLedger(customer.id);
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendWhatsApp = (cust) => {
    const balance = cust.current_balance || 0;
    const text = `*RAIS AGENCIES — Customer Statement*%0A%0ADear ${cust.business_name || cust.contact_person},%0AYour current account balance with RAIS Agencies is *₹${Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}*.%0A%0AFor order bookings or billing queries, contact our Rayachoty hotline: *9347453135*.%0A%0A*RAIS Agencies*, Reddies Colony, Rayachoty.`;
    window.open(`https://wa.me/91${cust.phone}?text=${text}`, '_blank');
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = !searchTerm || (
      (c.business_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.contact_person || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.customer_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || '').includes(searchTerm)
    );
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden gap-2">
      
      {/* ─── TOP ACTION & SEARCH HEADER BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 shrink-0 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white">
                Customer & Outlet Directory
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-amber-400 rounded-full border border-slate-700 font-mono">
                {customers.length} Registered Outlets
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Master-Detail B2B Ledger, Credit Exposure & 1-Click WhatsApp Statements
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
              placeholder="Search outlet, code, phone..."
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-44 sm:w-56"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          {hasRole(['ADMIN', 'OPERATOR']) && (
            <button
              onClick={() => {
                setCustomerToEdit(null);
                setCustomerModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all hover:scale-105"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Outlet</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── MASTER-DETAIL SPLIT-PANE CONTAINER (100% Viewport-Locked) ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        
        {/* ─── LEFT MASTER PANE (42% Width = 5 cols) ─── */}
        <div className="lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            <span>Customer Accounts ({filteredCustomers.length})</span>
            <span>Balance Due</span>
          </div>

          {/* Master Scrollable List */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
            {loading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-slate-800/50 rounded-xl" />
                ))}
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No matching customer accounts found.
              </div>
            ) : (
              filteredCustomers.map(cust => {
                const isSelected = cust.id === selectedCustomerId;
                const balance = parseFloat(cust.current_balance || 0);

                return (
                  <div
                    key={cust.id}
                    onClick={() => handleSelectCustomer(cust)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="overflow-hidden pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[11px] text-amber-400">
                          {cust.customer_code}
                        </span>
                        <StatusBadge status={cust.status} />
                      </div>
                      <h4 className="font-bold text-white text-xs truncate mt-0.5">
                        {cust.business_name}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {cust.contact_person} • {cust.phone}
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <div className={`font-mono font-black text-xs ${balance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[9px] text-slate-500">
                          Limit: ₹{parseFloat(cust.credit_limit || 0).toLocaleString('en-IN')}
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
          {selectedCustomer ? (
            <div className="h-full flex flex-col overflow-hidden">
              
              {/* Inspector Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-800 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                      {selectedCustomer.customer_code}
                      <button 
                        onClick={() => handleCopyCode(selectedCustomer.customer_code)}
                        className="hover:text-white"
                        title="Copy Customer Code"
                      >
                        {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </span>
                    <StatusBadge status={selectedCustomer.status} />
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white mt-1">
                    {selectedCustomer.business_name}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {selectedCustomer.contact_person} • Ph: {selectedCustomer.phone}
                  </p>
                </div>

                {/* Direct Action Chips */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleSendWhatsApp(selectedCustomer)}
                    className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                    title="Send Statement via WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>
                  {hasRole(['ADMIN', 'OPERATOR']) && (
                    <button
                      onClick={() => {
                        setCustomerToEdit(selectedCustomer);
                        setCustomerModalOpen(true);
                      }}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                      title="Edit Customer Details"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Inspector Tab Bar */}
              <div className="flex items-center gap-1.5 pt-2 pb-3 border-b border-slate-800/80 shrink-0">
                {[
                  { id: 'overview', label: 'Dossier & Exposure', icon: ShieldCheck },
                  { id: 'ledger', label: 'Live Ledger History', icon: History },
                  { id: 'actions', label: 'Action Console', icon: CreditCard },
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
                
                {/* ─── TAB 1: OVERVIEW & CREDIT EXPOSURE ─── */}
                {activeInspectorTab === 'overview' && (
                  <div className="space-y-4">
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Current Balance</span>
                        <div className="text-base font-black font-mono text-amber-400 mt-1">
                          ₹{parseFloat(selectedCustomer.current_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Credit Limit</span>
                        <div className="text-base font-black font-mono text-white mt-1">
                          ₹{parseFloat(selectedCustomer.credit_limit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Payment Terms</span>
                        <div className="text-sm font-bold text-slate-300 mt-1">
                          {selectedCustomer.payment_terms_days || 15} Days Net
                        </div>
                      </div>
                    </div>

                    {/* Credit Utilization Progress */}
                    {parseFloat(selectedCustomer.credit_limit || 0) > 0 && (
                      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-semibold">Credit Exposure</span>
                          <span className="font-mono font-bold text-amber-400">
                            {Math.min(Math.round((parseFloat(selectedCustomer.current_balance || 0) / parseFloat(selectedCustomer.credit_limit || 1)) * 100), 100)}% utilized
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div 
                            className="bg-amber-400 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(Math.round((parseFloat(selectedCustomer.current_balance || 0) / parseFloat(selectedCustomer.credit_limit || 1)) * 100), 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Bound Metadata Details */}
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Registered Business Metadata
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-slate-300">
                        <div>
                          <span className="text-slate-500 text-[10px] block">GSTIN / Tax ID:</span>
                          <span className="font-mono font-bold">{selectedCustomer.tax_id || 'Unregistered / Retail'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Delivery Route / Territory:</span>
                          <span className="font-semibold">{selectedCustomer.city || 'Rayachoty'}, AP</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 text-[10px] block">Billing / Delivery Address:</span>
                          <span className="font-medium">{selectedCustomer.address || 'Reddies Colony, Rayachoty, Annamayya District'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 2: LIVE TRANSACTION LEDGER ─── */}
                {activeInspectorTab === 'ledger' && (
                  <div className="space-y-3">
                    {ledgerLoading ? (
                      <div className="space-y-2 animate-pulse py-4">
                        <div className="h-10 bg-slate-800 rounded" />
                        <div className="h-10 bg-slate-800 rounded" />
                        <div className="h-10 bg-slate-800 rounded" />
                      </div>
                    ) : !ledgerData || !ledgerData.entries || ledgerData.entries.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs">
                        No transactions recorded in customer ledger yet.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {ledgerData.entries.map((entry, idx) => (
                          <div 
                            key={idx}
                            className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white text-xs">{entry.reference_number || 'TRX'}</span>
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                                  entry.type === 'INVOICE' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                                }`}>
                                  {entry.type}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">{entry.date} • {entry.description}</p>
                            </div>
                            <div className="text-right">
                              <div className={`font-mono font-bold text-xs ${entry.type === 'INVOICE' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {entry.type === 'INVOICE' ? '+' : '-'}₹{parseFloat(entry.amount || 0).toFixed(2)}
                              </div>
                              <span className="text-[9px] text-slate-500 font-mono">
                                Run: ₹{parseFloat(entry.running_balance || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ─── TAB 3: ACTION CONSOLE ─── */}
                {activeInspectorTab === 'actions' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">
                      Execute primary commercial operations directly for <strong className="text-white">{selectedCustomer.business_name}</strong>:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        onClick={() => onOpenInvoiceForCustomer && onOpenInvoiceForCustomer(selectedCustomer)}
                        className="p-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-left text-amber-400 transition-all hover:scale-[1.02]"
                      >
                        <FileText className="w-5 h-5" />
                        <div>
                          <div className="font-bold text-xs text-white">Create GST Tax Invoice</div>
                          <span className="text-[10px] text-slate-400">Bill frozen food order</span>
                        </div>
                      </button>

                      <button
                        onClick={() => onOpenOrderForCustomer && onOpenOrderForCustomer(selectedCustomer)}
                        className="p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center gap-2.5 text-left text-blue-400 transition-all hover:scale-[1.02]"
                      >
                        <ShoppingBag className="w-5 h-5" />
                        <div>
                          <div className="font-bold text-xs text-white">Advance Order Booking</div>
                          <span className="text-[10px] text-slate-400">Reserve supplies for delivery</span>
                        </div>
                      </button>

                      <button
                        onClick={() => onOpenPaymentForCustomer && onOpenPaymentForCustomer(selectedCustomer)}
                        className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-left text-emerald-400 transition-all hover:scale-[1.02]"
                      >
                        <CreditCard className="w-5 h-5" />
                        <div>
                          <div className="font-bold text-xs text-white">Record Payment / Settlement</div>
                          <span className="text-[10px] text-slate-400">Collect UPI, cash or bank transfer</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleSendWhatsApp(selectedCustomer)}
                        className="p-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/30 rounded-xl flex items-center gap-2.5 text-left text-emerald-400 transition-all hover:scale-[1.02]"
                      >
                        <MessageSquare className="w-5 h-5" />
                        <div>
                          <div className="font-bold text-xs text-white">Send WhatsApp Reminder</div>
                          <span className="text-[10px] text-slate-400">Dispatch outstanding balance slip</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Select a customer from the master list to inspect.
            </div>
          )}
        </div>

      </div>

      {/* ─── CUSTOMER EDIT / CREATE MODAL ─── */}
      <CustomerModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        customerToEdit={customerToEdit}
        onCustomerSaved={(saved) => {
          setCustomerModalOpen(false);
          loadCustomers(saved?.id);
        }}
      />

    </div>
  );
};
