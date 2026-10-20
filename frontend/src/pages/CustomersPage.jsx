import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronRight,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  DollarSign,
  Building2,
  ArrowLeft,
  Trash2,
  X
} from 'lucide-react';
import { customerApi, billingApi, getLocalCachedSnapshot } from '../services/api';
import { copyToClipboard, openWhatsApp } from '../utils/mobileHelpers';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { CustomerModal } from '../components/CustomerModal';
import { ThermalReceiptModal } from '../components/ThermalReceiptModal';
import { Printer } from 'lucide-react';

export const CustomersPage = ({ 
  onOpenCustomerModal,
  onOpenPaymentForCustomer, 
  onOpenInvoiceForCustomer,
  onOpenOrderForCustomer
}) => {
  const { hasRole } = useAuth();
  const [customers, setCustomers] = useState(() => {
    const cached = getLocalCachedSnapshot('customers_list');
    return Array.isArray(cached) ? cached : (cached?.items || cached?.data || []);
  });
  const [loading, setLoading] = useState(() => {
    const cached = getLocalCachedSnapshot('customers_list');
    const items = Array.isArray(cached) ? cached : (cached?.items || cached?.data || []);
    return items.length === 0;
  });
  
  // Slicers & Filter State (Power BI Style)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE
  const [areaFilter, setAreaFilter] = useState('ALL'); // ALL, Rayachoty, Madanapalle, Kadapa, Chinnamandem
  const [balanceFilter, setBalanceFilter] = useState('ALL'); // ALL, HAS_DUE, ZERO_DUE
  const [sortBy, setSortBy] = useState('BALANCE_DESC'); // BALANCE_DESC, NAME_ASC, LIMIT_DESC, CODE_ASC
  
  // Selected Customer for Right Detail Inspector
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [thermalModal, setThermalModal] = useState({ isOpen: false, invoiceId: null });
  const [activeInspectorTab, setActiveInspectorTab] = useState('overview'); // overview, invoices, ledger, actions
  const [copiedCode, setCopiedCode] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // Modal
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    customer: null,
    isDeleting: false,
    error: null
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async (selectId = null) => {
    if (customers.length === 0) setLoading(true);
    try {
      const data = await customerApi.list({ limit: 100 });
      const items = Array.isArray(data) ? data : (data?.items || data?.data || []);
      if (items.length > 0) {
        setCustomers(items);
        const initialId = selectId || (selectedCustomerId && items.some(i => i.id === selectedCustomerId) ? selectedCustomerId : items[0].id);
        setSelectedCustomerId(initialId);
        loadCustomerLedger(initialId);
        loadCustomerInvoices(initialId);
      }
    } catch (err) {
      console.warn('Failed to refresh customers from network (preserved cached state):', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerLedger = async (customerId) => {
    setLedgerLoading(true);
    try {
      const ledger = await customerApi.getLedger(customerId);
      setLedgerData(Array.isArray(ledger) ? ledger : (ledger?.entries || []));
    } catch (err) {
      console.error('Failed to load customer ledger:', err);
      setLedgerData([]);
    } finally {
      setLedgerLoading(false);
    }
  };

  const loadCustomerInvoices = async (customerId) => {
    setInvoicesLoading(true);
    try {
      const invs = await billingApi.listInvoices({ customer_id: customerId });
      setCustomerInvoices(Array.isArray(invs) ? invs : []);
    } catch (err) {
      console.error('Failed to load customer invoices:', err);
      setCustomerInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleSelectCustomer = (customer, initialTab = null) => {
    setSelectedCustomerId(customer.id);
    loadCustomerLedger(customer.id);
    loadCustomerInvoices(customer.id);
    if (initialTab) {
      setActiveInspectorTab(initialTab);
    }
    setMobileView('detail');
  };

  const handleCopyCode = async (code) => {
    await copyToClipboard(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendWhatsApp = (cust) => {
    const balance = cust.outstanding_balance || 0;
    const text = `*RAIS AGENCIES — Customer Statement*\n\nDear ${cust.business_name || cust.contact_person},\nYour current account balance with RAIS Agencies is *₹${Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}*.\n\nFor wholesale order bookings, pricing or direct settlement, contact Rayachoty Depot: *9347453135*.\n\n*RAIS Agencies*, Reddies Colony, Rayachoty.`;
    openWhatsApp(cust.phone, text);
  };

  const handleDeleteCustomer = async () => {
    if (!deleteConfirmModal.customer) return;
    setDeleteConfirmModal(prev => ({ ...prev, isDeleting: true, error: null }));
    try {
      await customerApi.delete(deleteConfirmModal.customer.id);
      setDeleteConfirmModal({ isOpen: false, customer: null, isDeleting: false, error: null });
      await loadCustomers();
      setMobileView('list');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to delete customer';
      setDeleteConfirmModal(prev => ({ ...prev, isDeleting: false, error: msg }));
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setAreaFilter('ALL');
    setBalanceFilter('ALL');
    setSortBy('BALANCE_DESC');
  };

  // ─── POWER BI REACTIVE SLICING & FILTERING ───
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // 1. Omni-Search Query: Matches Outlet name, contact person, customer code, phone, area, and purchased products/SKUs!
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || (
        (c.business_name || '').toLowerCase().includes(q) ||
        (c.contact_person || '').toLowerCase().includes(q) ||
        (c.customer_code || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.address_line1 || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q) ||
        (Array.isArray(c.top_items) && c.top_items.some(item => (item || '').toLowerCase().includes(q)))
      );

      // 2. Status Slicer
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

      // 3. Area / Route Slicer
      const addr = (c.address_line1 || '') + ' ' + (c.city || '');
      let matchesArea = true;
      if (areaFilter === 'RAYACHOTY_TOWN') {
        matchesArea = addr.toLowerCase().includes('rayachoty') || addr.toLowerCase().includes('reddies') || addr.toLowerCase().includes('bazaar') || addr.toLowerCase().includes('junction');
      } else if (areaFilter === 'MADANAPALLE_RD') {
        matchesArea = addr.toLowerCase().includes('madanapalle') || addr.toLowerCase().includes('bypass');
      } else if (areaFilter === 'KADAPA_RD') {
        matchesArea = addr.toLowerCase().includes('kadapa') || addr.toLowerCase().includes('chittoor');
      } else if (areaFilter === 'CHINNAMANDEM') {
        matchesArea = addr.toLowerCase().includes('chinnamandem') || addr.toLowerCase().includes('sambepalli') || addr.toLowerCase().includes('galiveedu');
      }

      // 4. Financial Due Slicer
      const bal = parseFloat(c.outstanding_balance || 0);
      let matchesBalance = true;
      if (balanceFilter === 'HAS_DUE') {
        matchesBalance = bal > 0.01;
      } else if (balanceFilter === 'ZERO_DUE') {
        matchesBalance = bal <= 0.01;
      }

      return matchesSearch && matchesStatus && matchesArea && matchesBalance;
    }).sort((a, b) => {
      if (sortBy === 'NAME_ASC') {
        return (a.business_name || '').localeCompare(b.business_name || '');
      } else if (sortBy === 'BALANCE_DESC') {
        const diff = parseFloat(b.outstanding_balance || 0) - parseFloat(a.outstanding_balance || 0);
        if (Math.abs(diff) > 0.001) return diff;
        return (a.business_name || '').localeCompare(b.business_name || '');
      } else if (sortBy === 'REVENUE_DESC') {
        const diff = parseFloat(b.total_invoiced || 0) - parseFloat(a.total_invoiced || 0);
        if (Math.abs(diff) > 0.001) return diff;
        return (a.business_name || '').localeCompare(b.business_name || '');
      } else if (sortBy === 'PAID_DESC') {
        const diff = parseFloat(b.total_paid || 0) - parseFloat(a.total_paid || 0);
        if (Math.abs(diff) > 0.001) return diff;
        return (a.business_name || '').localeCompare(b.business_name || '');
      } else if (sortBy === 'PROFIT_DESC') {
        const diff = parseFloat(b.gross_profit || 0) - parseFloat(a.gross_profit || 0);
        if (Math.abs(diff) > 0.001) return diff;
        return (a.business_name || '').localeCompare(b.business_name || '');
      } else if (sortBy === 'LIMIT_DESC') {
        return parseFloat(b.credit_limit || 0) - parseFloat(a.credit_limit || 0);
      } else if (sortBy === 'CODE_ASC') {
        return (a.customer_code || '').localeCompare(b.customer_code || '');
      }
      return 0;
    });
  }, [customers, searchTerm, statusFilter, areaFilter, balanceFilter, sortBy]);

  // Slicer Stats
  const totalOutlets = customers.length;
  const filteredCount = filteredCustomers.length;
  const totalReceivables = filteredCustomers.reduce((acc, c) => acc + parseFloat(c.outstanding_balance || 0), 0);
  const totalRevenue = filteredCustomers.reduce((acc, c) => acc + parseFloat(c.total_invoiced || 0), 0);
  const totalPaid = filteredCustomers.reduce((acc, c) => acc + parseFloat(c.total_paid || 0), 0);
  const totalProfit = filteredCustomers.reduce((acc, c) => acc + parseFloat(c.gross_profit || 0), 0);
  const overallMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';
  const totalCreditExposure = customers.reduce((acc, c) => acc + parseFloat(c.credit_limit || 0), 0);
  const customersWithDues = customers.filter(c => parseFloat(c.outstanding_balance || 0) > 0.01).length;

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || filteredCustomers[0] || customers[0];

  const selectedCustomerBilledRev = parseFloat(selectedCustomer?.total_invoiced || 0);
  const selectedCustomerProfit = parseFloat(selectedCustomer?.gross_profit || 0);
  const selectedCustomerCogs = Math.max(0, selectedCustomerBilledRev - selectedCustomerProfit);
  const selectedCustomerMarginPct = selectedCustomerBilledRev > 0 
    ? ((selectedCustomerProfit / selectedCustomerBilledRev) * 100).toFixed(1) 
    : '0.0';
  const selectedCustomerMarkupPct = selectedCustomerCogs > 0 
    ? ((selectedCustomerProfit / selectedCustomerCogs) * 100).toFixed(1) 
    : '0.0';
  const selectedCustomerPaid = parseFloat(selectedCustomer?.total_paid || 0);
  const selectedCustomerRealizationPct = selectedCustomerBilledRev > 0 
    ? Math.min(100, Math.round((selectedCustomerPaid / selectedCustomerBilledRev) * 100)) 
    : 0;
  const selectedCustomerBalance = parseFloat(selectedCustomer?.outstanding_balance || 0);

  const filteredCustomerInvoices = useMemo(() => {
    if (!invoiceSearch.trim()) return customerInvoices;
    const q = invoiceSearch.toLowerCase().trim();
    return customerInvoices.filter(inv => {
      const numMatch = (inv.invoice_number || '').toLowerCase().includes(q);
      const dateMatch = (inv.invoice_date || '').includes(q);
      const statusMatch = (inv.status || '').toLowerCase().includes(q);
      const itemsMatch = Array.isArray(inv.items) && inv.items.some(it => 
        (it.item_description || '').toLowerCase().includes(q) ||
        (it.product?.name || '').toLowerCase().includes(q)
      );
      return numMatch || dateMatch || statusMatch || itemsMatch;
    });
  }, [customerInvoices, invoiceSearch]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden gap-1.5 font-sans">
      
      {/* ─── ROW 1: DESKTOP SLEEK COMMAND RIBBON (Single Unified 46px Header) ─── */}
      <div className="hidden md:flex bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 shrink-0 shadow-md items-center justify-between gap-2 text-xs">
        {/* Left: Omni-Search Input (with Instant Clear button) */}
        <div className="relative flex-1 min-w-[220px] max-w-[320px] lg:max-w-[360px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search outlets, phone, or items (e.g. Fries, Cheese)..."
            className="w-full pl-8 pr-7 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-sans shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 text-xs font-bold"
              title="Clear Search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Center: 1-Click Interactive Pill Sorters */}
        <div className="flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mr-1 hidden xl:inline">Sort:</span>
          {[
            { id: 'BALANCE_DESC', label: '🚨 Due ↓' },
            { id: 'REVENUE_DESC', label: '💰 Revenue ↓' },
            { id: 'PAID_DESC', label: '💳 Collections ↓' },
            { id: 'PROFIT_DESC', label: '📈 Profit ↓' },
            { id: 'NAME_ASC', label: '🔤 A → Z' },
          ].map((pill) => {
            const isActive = sortBy === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setSortBy(pill.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20 font-black'
                    : 'bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Territory / Route Slicer Dropdown */}
        <div className="flex items-center gap-1 shrink-0">
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
            title="Filter by Territory / Delivery Route"
          >
            <option value="ALL">All Territories ({totalOutlets})</option>
            <option value="RAYACHOTY_TOWN">Rayachoty Town</option>
            <option value="MADANAPALLE_RD">Madanapalle Rd</option>
            <option value="KADAPA_RD">Kadapa Bypass</option>
            <option value="CHINNAMANDEM">Chinnamandem</option>
          </select>
        </div>

        {/* Right: Live Financial Micro-Ticker + Action */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Micro-Ticker Badge */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-slate-950/80 border border-slate-800 rounded-lg text-[11px] font-mono">
            <span className="text-slate-400 font-sans font-bold">
              <strong className="text-white font-mono">{filteredCount}</strong>/{totalOutlets}
            </span>
            <span className="text-slate-700">•</span>
            <span className="text-amber-300">
              <span className="text-slate-500 text-[10px] font-sans font-semibold">Rev:</span> ₹{totalRevenue >= 100000 ? `${(totalRevenue / 100000).toFixed(1)}L` : Math.round(totalRevenue).toLocaleString('en-IN')}
            </span>
            <span className="text-slate-700">•</span>
            <span className="text-emerald-400">
              <span className="text-slate-500 text-[10px] font-sans font-semibold">Paid:</span> ₹{totalPaid >= 100000 ? `${(totalPaid / 100000).toFixed(1)}L` : Math.round(totalPaid).toLocaleString('en-IN')}
            </span>
            <span className="text-slate-700">•</span>
            <span className="text-purple-300 font-bold">
              <span className="text-slate-500 text-[10px] font-sans font-semibold">Profit:</span> ₹{totalProfit >= 100000 ? `${(totalProfit / 100000).toFixed(1)}L` : Math.round(totalProfit).toLocaleString('en-IN')} ({overallMargin}%)
            </span>
            <span className="text-slate-700">•</span>
            <span className="text-rose-400 font-bold">
              <span className="text-slate-500 text-[10px] font-sans font-semibold">Due:</span> ₹{Math.round(totalReceivables).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Reset Filters button */}
          {(searchTerm || statusFilter !== 'ALL' || areaFilter !== 'ALL' || balanceFilter !== 'ALL' || sortBy !== 'BALANCE_DESC') && (
            <button
              onClick={handleResetFilters}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title="Reset All Slicers"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Add Customer Action */}
          {hasRole(['ADMIN', 'OPERATOR']) && (
            <button
              onClick={() => {
                setCustomerToEdit(null);
                setCustomerModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all hover:scale-105 shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Outlet</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── ROW 1 (MOBILE): NATIVE MOBILE SEARCH, COMPACT FILTERS & STATS (< md) ─── */}
      <div className="md:hidden flex flex-col gap-1.5 shrink-0">
        {/* Mobile Search, Quick Sort & + Outlet Bar */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search outlets, phone, area..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-sm"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold p-0.5">
                ✕
              </button>
            )}
          </div>

          {/* Compact Sort Select on Mobile */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl px-2 py-1.5 focus:outline-none shrink-0"
            title="Sort Outlets"
          >
            <option value="BALANCE_DESC">🚨 Due ↓</option>
            <option value="REVENUE_DESC">💰 Revenue ↓</option>
            <option value="PAID_DESC">💳 Paid ↓</option>
            <option value="PROFIT_DESC">📈 Profit ↓</option>
            <option value="NAME_ASC">🔤 A → Z</option>
            <option value="LIMIT_DESC">💳 Limit ↓</option>
            <option value="CODE_ASC">🏷️ Code</option>
          </select>

          {hasRole(['ADMIN', 'OPERATOR']) && (
            <button
              onClick={() => {
                setCustomerToEdit(null);
                setCustomerModalOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 shrink-0"
              title="Add New Customer Outlet"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Outlet</span>
            </button>
          )}
        </div>

        {/* Swipeable Horizontal Filter & Ranking Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
          <button
            onClick={() => { setAreaFilter('ALL'); setBalanceFilter('ALL'); setSortBy('BALANCE_DESC'); }}
            className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              areaFilter === 'ALL' && balanceFilter === 'ALL' && sortBy === 'BALANCE_DESC'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            All Outlets ({totalOutlets})
          </button>

          <button
            onClick={() => setSortBy(sortBy === 'REVENUE_DESC' ? 'BALANCE_DESC' : 'REVENUE_DESC')}
            className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              sortBy === 'REVENUE_DESC'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-300'
            }`}
          >
            💰 Top Revenue
          </button>

          <button
            onClick={() => setSortBy(sortBy === 'PAID_DESC' ? 'BALANCE_DESC' : 'PAID_DESC')}
            className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              sortBy === 'PAID_DESC'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-300'
            }`}
          >
            💳 Top Collections
          </button>

          <button
            onClick={() => setSortBy(sortBy === 'PROFIT_DESC' ? 'BALANCE_DESC' : 'PROFIT_DESC')}
            className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              sortBy === 'PROFIT_DESC'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-300'
            }`}
          >
            📈 Top Profit
          </button>

          <button
            onClick={() => setBalanceFilter(balanceFilter === 'HAS_DUE' ? 'ALL' : 'HAS_DUE')}
            className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              balanceFilter === 'HAS_DUE'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            🚨 Balance Due ({customersWithDues})
          </button>

          <button
            onClick={() => setAreaFilter(areaFilter === 'RAYACHOTY_TOWN' ? 'ALL' : 'RAYACHOTY_TOWN')}
            className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              areaFilter === 'RAYACHOTY_TOWN'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            Rayachoty Town
          </button>

          <button
            onClick={() => setAreaFilter(areaFilter === 'MADANAPALLE_RD' ? 'ALL' : 'MADANAPALLE_RD')}
            className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              areaFilter === 'MADANAPALLE_RD'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            Madanapalle Rd
          </button>

          <button
            onClick={() => setAreaFilter(areaFilter === 'CHINNAMANDEM' ? 'ALL' : 'CHINNAMANDEM')}
            className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              areaFilter === 'CHINNAMANDEM'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            Chinnamandem
          </button>
        </div>

        {/* Mobile Quick Metric Strip: Clean, Smooth 4-stat responsive summary */}
        <div className="grid grid-cols-4 gap-1 px-2.5 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl text-center shadow-sm">
          <div className="flex flex-col items-center justify-center">
            <span className="text-[9px] uppercase font-bold text-slate-500 font-sans">Outlets</span>
            <span className="text-xs font-black text-white font-mono">{filteredCount}</span>
          </div>
          <div className="flex flex-col items-center justify-center border-l border-slate-800/80">
            <span className="text-[9px] uppercase font-bold text-amber-500 font-sans">Revenue</span>
            <span className="text-xs font-black text-amber-400 font-mono">
              ₹{totalRevenue >= 100000 ? `${(totalRevenue / 100000).toFixed(1)}L` : Math.round(totalRevenue).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center border-l border-slate-800/80">
            <span className="text-[9px] uppercase font-bold text-emerald-500 font-sans">Paid</span>
            <span className="text-xs font-black text-emerald-400 font-mono">
              ₹{totalPaid >= 100000 ? `${(totalPaid / 100000).toFixed(1)}L` : Math.round(totalPaid).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center border-l border-slate-800/80">
            <span className="text-[9px] uppercase font-bold text-purple-400 font-sans">Profit</span>
            <span className="text-xs font-black text-purple-300 font-mono">
              ₹{totalProfit >= 100000 ? `${(totalProfit / 100000).toFixed(1)}L` : Math.round(totalProfit).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* ─── MOBILE VIEW SWITCHER (< lg) ─── */}
      <div className="lg:hidden flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
        <button
          onClick={() => setMobileView('list')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileView === 'list'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Outlets ({filteredCustomers.length})</span>
        </button>
        <button
          onClick={() => setMobileView('detail')}
          disabled={!selectedCustomer}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileView === 'detail'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white disabled:opacity-40'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Outlet Detail</span>
        </button>
      </div>

      {/* ─── ROW 3: POWER BI MASTER-DETAIL SPLIT CANVAS ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-hidden">
        
        {/* ─── LEFT MASTER PANE (38% Width = 5 cols) ─── */}
        <div className={`${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'} lg:col-span-5 bg-slate-900 rounded-xl border border-slate-800 p-2.5 shadow-lg flex-col overflow-hidden`}>
          <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            <span>Customer Accounts ({filteredCustomers.length})</span>
            <span>Balance Due</span>
          </div>

          {/* Master Scrollable List */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {loading ? (
              <div className="space-y-2 animate-pulse p-2">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-16 bg-slate-800/50 rounded-xl" />
                ))}
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-600" />
                <p>No customer accounts match active slicers.</p>
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-[11px] font-bold"
                >
                  Reset Slicers
                </button>
              </div>
            ) : (
              filteredCustomers.map(cust => {
                const isSelected = cust.id === (selectedCustomer?.id || selectedCustomerId);
                const balance = parseFloat(cust.outstanding_balance || 0);
                const creditLimit = parseFloat(cust.credit_limit || 0);
                const utilization = creditLimit > 0 ? Math.min(Math.round((balance / creditLimit) * 100), 100) : 0;

                return (
                  <div
                    key={cust.id}
                    onClick={() => handleSelectCustomer(cust)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/30'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="overflow-hidden pr-2 flex-1">
                      {/* Line 1: Code, Business Name, Location */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-[11px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {cust.customer_code}
                        </span>
                        <h4 className="font-bold text-white text-xs truncate max-w-[200px] sm:max-w-[260px]">
                          {cust.business_name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono truncate">
                          📍 {cust.city || 'Rayachoty'}
                        </span>
                      </div>
                      
                      {/* Line 2: Contact, Phone & Top Purchased Items */}
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] truncate mt-0.5 flex-wrap">
                        <span>{cust.contact_person} • {cust.phone}</span>
                        {Array.isArray(cust.top_items) && cust.top_items.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {cust.top_items.slice(0, 2).map((item, idx) => (
                              <span key={idx} className="text-[9px] bg-slate-900 text-amber-300/90 px-1.5 py-0.2 rounded border border-amber-500/20 font-sans truncate max-w-[120px]" title={item}>
                                🏷️ {item}
                              </span>
                            ))}
                            {cust.top_items.length > 2 && (
                              <span className="text-[9px] text-slate-500 font-mono">+{cust.top_items.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Line 3: Commercial Performance Pills with Dynamic Active Metric Highlight */}
                      <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-slate-800/60 text-[10px] font-mono flex-wrap">
                        {/* REV */}
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-all ${
                          sortBy === 'REVENUE_DESC'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-black ring-1 ring-amber-500/30'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}>
                          <span className="text-[9px] font-bold text-slate-500 font-sans">REV:</span>
                          <span className="font-bold">₹{Math.round(parseFloat(cust.total_invoiced || 0)).toLocaleString('en-IN')}</span>
                        </span>

                        {/* PAID */}
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-all ${
                          sortBy === 'PAID_DESC'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-black ring-1 ring-emerald-500/30'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                        }`}>
                          <span className="text-[9px] font-bold text-emerald-500 font-sans">PAID:</span>
                          <span className="font-bold">₹{Math.round(parseFloat(cust.total_paid || 0)).toLocaleString('en-IN')}</span>
                        </span>

                        {/* PROFIT */}
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-all ${
                          sortBy === 'PROFIT_DESC'
                            ? 'bg-purple-500/25 text-purple-200 border-purple-400/50 font-black ring-1 ring-purple-500/40'
                            : 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                        }`}>
                          <span className="text-[9px] font-bold text-purple-400 font-sans">PROFIT:</span>
                          <span className="font-bold">₹{Math.round(parseFloat(cust.gross_profit || 0)).toLocaleString('en-IN')}</span>
                          {parseFloat(cust.total_invoiced || 0) > 0 && (
                            <span className="text-[8px] text-purple-400/80 font-normal">
                              ({Math.round((parseFloat(cust.gross_profit || 0) / parseFloat(cust.total_invoiced || 1)) * 100)}%)
                            </span>
                          )}
                        </span>

                        {/* Invoices & Ledger Quick Jump Buttons */}
                        <div className="flex items-center gap-1 ml-auto">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCustomer(cust, 'invoices');
                            }}
                            className="text-[10px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-1.5 py-0.5 rounded border border-blue-500/20 flex items-center gap-0.5 transition-colors"
                          >
                            <FileText className="w-2.5 h-2.5" />
                            <span>Invoices</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCustomer(cust, 'ledger');
                            }}
                            className="text-[10px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-0.5 transition-colors"
                          >
                            <History className="w-2.5 h-2.5" />
                            <span>Ledger</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2 pl-2">
                      <div>
                        <div className={`font-mono font-black text-xs ${
                          sortBy === 'BALANCE_DESC' ? 'ring-1 ring-amber-500/40 px-1 rounded bg-amber-500/10 ' : ''
                        }${
                          creditLimit > 0 && balance > creditLimit 
                            ? 'text-rose-400' 
                            : balance > 0 
                              ? 'text-amber-400' 
                              : 'text-emerald-400'
                        }`}>
                          ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[9px] text-slate-500 font-mono">
                            Limit: ₹{(creditLimit / 1000).toFixed(0)}k
                          </span>
                        </div>
                        {creditLimit > 0 && balance > creditLimit && (
                          <div className="mt-0.5">
                            <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              Limit Exceeded (+₹{Math.round(balance - creditLimit)})
                            </span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-600'}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── RIGHT DETAIL INSPECTOR (62% Width = 7 cols) ─── */}
        <div className={`${mobileView === 'list' ? 'hidden lg:flex' : 'flex'} lg:col-span-7 bg-slate-900 rounded-xl border border-slate-800 p-2.5 sm:p-3 shadow-xl flex-col overflow-hidden`}>
          {/* Mobile Back to List button */}
          <div className="lg:hidden pb-2 mb-2 border-b border-slate-800 flex items-center justify-between shrink-0">
            <button
              onClick={() => setMobileView('list')}
              className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Outlets List</span>
            </button>
            <span className="text-[10px] text-slate-500 font-mono">
              {filteredCustomers.length} Outlets
            </span>
          </div>
          {selectedCustomer ? (
            <div className="h-full flex flex-col overflow-hidden">
              
              {/* Sleek Modern Inspector Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800 shrink-0">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-amber-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700 shadow-xs flex items-center gap-1.5">
                      {selectedCustomer.customer_code}
                      <button 
                        onClick={() => handleCopyCode(selectedCustomer.customer_code)}
                        className="hover:text-white transition-colors"
                        title="Copy Customer Code"
                      >
                        {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>
                    </span>
                    <StatusBadge status={selectedCustomer.status} />
                    <span className="text-[11px] text-slate-400 font-medium">
                      📍 {selectedCustomer.city || 'Rayachoty'}, AP
                    </span>
                  </div>
                  
                  <h2 className="text-base sm:text-lg font-black text-white mt-1 tracking-tight">
                    {selectedCustomer.business_name}
                  </h2>
                  <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-0.5 flex-wrap">
                    <span>Contact: <strong className="text-slate-200">{selectedCustomer.contact_person || 'Authorized Dealer'}</strong></span>
                    <span>•</span>
                    <span>Ph: <strong className="text-slate-200 font-mono">{selectedCustomer.phone}</strong></span>
                    {(selectedCustomer.first_invoice_date || selectedCustomer.customer_since || selectedCustomer.created_at) && (
                      <>
                        <span>•</span>
                        <span className="text-amber-400/90 font-medium">
                          🤝 Associated Since: {new Date(selectedCustomer.first_invoice_date || selectedCustomer.customer_since || selectedCustomer.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Primary Quick-Action Launchers Ribbon */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:justify-end">
                  <button
                    onClick={() => onOpenInvoiceForCustomer && onOpenInvoiceForCustomer(selectedCustomer)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
                    title="Create Commercial Invoice"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>+ Invoice</span>
                  </button>

                  <button
                    onClick={() => onOpenOrderForCustomer && onOpenOrderForCustomer(selectedCustomer)}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 active:scale-95"
                    title="Book Wholesale Order"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Order</span>
                  </button>

                  <button
                    onClick={() => onOpenPaymentForCustomer && onOpenPaymentForCustomer(selectedCustomer)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 active:scale-95"
                    title="Record Cash/UPI Payment"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay</span>
                  </button>

                  <button
                    onClick={() => handleSendWhatsApp(selectedCustomer)}
                    className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all"
                    title="Send Statement via WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>

                  {hasRole(['ADMIN', 'OPERATOR']) && (
                    <>
                      <button
                        onClick={() => {
                          setCustomerToEdit(selectedCustomer);
                          setCustomerModalOpen(true);
                        }}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                        title="Edit Customer Profile"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setDeleteConfirmModal({
                            isOpen: true,
                            customer: selectedCustomer,
                            isDeleting: false,
                            error: null
                          });
                        }}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all"
                        title="Delete Outlet Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Persistent Commercial Standing Strip (5-Card Complete Economics Strip) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 py-2 border-b border-slate-800 shrink-0">
                <div className="p-2 bg-slate-950/80 border border-amber-500/20 rounded-lg shadow-sm">
                  <span className="text-[9px] font-bold text-amber-500 uppercase block font-sans">💰 Billed Revenue</span>
                  <div className="text-xs sm:text-sm font-black font-mono text-white mt-0.5 truncate">
                    ₹{selectedCustomerBilledRev.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-2 bg-slate-950/80 border border-slate-700/60 rounded-lg shadow-sm">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block font-sans">📦 Procurement COGS</span>
                  <div className="text-xs sm:text-sm font-black font-mono text-slate-300 mt-0.5 truncate">
                    ₹{selectedCustomerCogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-2 bg-slate-950/80 border border-purple-500/20 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-purple-400 uppercase font-sans">📈 Gross Profit</span>
                    {selectedCustomerBilledRev > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                        {selectedCustomerMarginPct}%
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm font-black font-mono text-purple-300 mt-0.5 truncate">
                    ₹{selectedCustomerProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-2 bg-slate-950/80 border border-emerald-500/20 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-emerald-400 uppercase font-sans">💳 Collections</span>
                    {selectedCustomerBilledRev > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                        {selectedCustomerRealizationPct}%
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm font-black font-mono text-emerald-400 mt-0.5 truncate">
                    ₹{selectedCustomerPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className={`p-2 bg-slate-950/80 border rounded-lg shadow-sm col-span-2 sm:col-span-1 ${
                  selectedCustomerBalance > 0.01 ? 'border-rose-500/30' : 'border-emerald-500/20'
                }`}>
                  <span className={`text-[9px] font-bold uppercase block font-sans ${selectedCustomerBalance > 0.01 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {selectedCustomerBalance > 0.01 ? '🚨 Balance Due' : '✅ Balance Due'}
                  </span>
                  <div className={`text-xs sm:text-sm font-black font-mono mt-0.5 truncate ${selectedCustomerBalance > 0.01 ? 'text-rose-300' : 'text-emerald-400'}`}>
                    ₹{selectedCustomerBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Frequent SKUs Pill Strip */}
              {Array.isArray(selectedCustomer.top_items) && selectedCustomer.top_items.length > 0 && (
                <div className="flex items-center gap-1.5 py-1.5 border-b border-slate-800/80 shrink-0 overflow-x-auto no-scrollbar text-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 font-sans">Frequent SKUs:</span>
                  {selectedCustomer.top_items.map((sku, idx) => (
                    <span key={idx} className="text-[10px] bg-slate-950 text-slate-300 px-2 py-0.5 rounded-full border border-slate-800 font-mono whitespace-nowrap shrink-0">
                      📦 {sku}
                    </span>
                  ))}
                </div>
              )}

              {/* Inspector Tab Navigation Bar */}
              <div className="flex items-center gap-1.5 pt-2 pb-2 border-b border-slate-800/80 shrink-0 overflow-x-auto no-scrollbar">
                {[
                  { id: 'overview', label: '360° Dossier', icon: ShieldCheck },
                  { id: 'invoices', label: `Invoices (${customerInvoices.length})`, icon: FileText },
                  { id: 'ledger', label: `Ledger (${Array.isArray(ledgerData) ? ledgerData.length : 0})`, icon: History },
                  { id: 'actions', label: 'Operations', icon: SlidersHorizontal },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeInspectorTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveInspectorTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Inspector Tab Viewport (Internal Scroll) */}
              <div className="flex-1 min-h-0 overflow-y-auto pt-2.5 pr-1 custom-scrollbar space-y-3">
                
                {/* ─── TAB 1: 360° DOSSIER & FINANCIAL EXPOSURE ─── */}
                {activeInspectorTab === 'overview' && (
                  <div className="space-y-3">
                    {/* Financial Matrix Cards */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Current Balance Due</span>
                        <div className="text-base font-black font-mono text-emerald-400 mt-0.5">
                          ₹{parseFloat(selectedCustomer.outstanding_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Credit Ceiling</span>
                        <div className="text-base font-black font-mono text-white mt-0.5">
                          ₹{parseFloat(selectedCustomer.credit_limit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Billing Standard</span>
                        <div className="text-xs font-bold text-purple-300 mt-1 truncate">
                          Cash on Delivery
                        </div>
                      </div>
                    </div>

                    {/* Credit Utilization Progress */}
                    {parseFloat(selectedCustomer.credit_limit || 0) > 0 && (() => {
                      const curBal = parseFloat(selectedCustomer.outstanding_balance || 0);
                      const curLim = parseFloat(selectedCustomer.credit_limit || 1);
                      const utilRate = Math.round((curBal / curLim) * 100);
                      const isBreach = curBal > curLim;
                      return (
                        <div className={`p-3 rounded-xl space-y-1.5 border ${
                          isBreach 
                            ? 'bg-rose-500/10 border-rose-500/30' 
                            : 'bg-slate-950/70 border-slate-800'
                        }`}>
                          <div className="flex items-center justify-between text-xs">
                            <span className={isBreach ? 'text-rose-400 font-bold' : 'text-slate-400 font-semibold'}>
                              {isBreach ? '🚨 Credit Limit Exceeded' : 'Credit Exposure Rate'}
                            </span>
                            <span className={`font-mono font-bold ${isBreach ? 'text-rose-400' : 'text-amber-400'}`}>
                              {utilRate}% utilized {isBreach ? `(+₹${(curBal - curLim).toFixed(2)})` : ''}
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                            <div 
                              className={`h-full rounded-full transition-all ${isBreach ? 'bg-rose-500' : utilRate > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.min(utilRate, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Account Profitability & Wholesale Economics Breakdown */}
                    <div className="bg-slate-950/70 border border-purple-500/30 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">📈</span>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Account Profitability & Wholesale Economics
                          </h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          parseFloat(selectedCustomerMarginPct) >= 10
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : parseFloat(selectedCustomerMarginPct) >= 5
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}>
                          {parseFloat(selectedCustomerMarginPct) >= 10 ? '🟢 High Margin (>10%)' : parseFloat(selectedCustomerMarginPct) >= 5 ? '🟡 Standard Wholesale' : '🔵 High Volume / Slim'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Total Billed Revenue</span>
                          <span className="font-mono font-bold text-white text-sm">
                            ₹{selectedCustomerBilledRev.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-0.5 font-mono">{customerInvoices.length} Invoices</span>
                        </div>

                        <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Procurement Cost (COGS)</span>
                          <span className="font-mono font-bold text-slate-300 text-sm">
                            ₹{selectedCustomerCogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-0.5 font-mono">Wholesale Cost Base</span>
                        </div>

                        <div className="p-2.5 bg-slate-900/80 rounded-lg border border-purple-500/30">
                          <span className="text-[10px] text-purple-400 block font-bold">Net Gross Profit</span>
                          <span className="font-mono font-black text-purple-300 text-sm">
                            ₹{selectedCustomerProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-purple-400/80 block mt-0.5 font-mono">Margin: {selectedCustomerMarginPct}%</span>
                        </div>

                        <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Avg Profit / Invoice</span>
                          <span className="font-mono font-bold text-emerald-400 text-sm">
                            ₹{customerInvoices.length > 0 ? (selectedCustomerProfit / customerInvoices.length).toFixed(2) : '0.00'}
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-0.5 font-mono">Markup: {selectedCustomerMarkupPct}% on cost</span>
                        </div>
                      </div>

                      {/* Visual Revenue vs COGS vs Profit split bar */}
                      {selectedCustomerBilledRev > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Cost Breakdown</span>
                            <span>Procurement COGS ({(100 - parseFloat(selectedCustomerMarginPct)).toFixed(1)}%) • Gross Profit ({selectedCustomerMarginPct}%)</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden flex border border-slate-800">
                            <div 
                              className="bg-slate-600 h-full transition-all" 
                              style={{ width: `${Math.max(0, 100 - parseFloat(selectedCustomerMarginPct))}%` }} 
                              title="Procurement Cost" 
                            />
                            <div 
                              className="bg-purple-500 h-full transition-all" 
                              style={{ width: `${Math.min(100, parseFloat(selectedCustomerMarginPct))}%` }} 
                              title="Gross Profit" 
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Business Metadata & Route */}
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Registered Business Metadata & Logistics
                      </h4>
                      <div className="grid grid-cols-2 gap-2.5 text-slate-300">
                        <div>
                          <span className="text-slate-500 text-[10px] block">Billing / Tax Classification:</span>
                          <span className="font-mono font-bold">{selectedCustomer.tax_id || 'Direct Wholesale / Retail'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Delivery Route / Territory:</span>
                          <span className="font-semibold text-white">📍 {selectedCustomer.city || 'Rayachoty'}, AP</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 text-[10px] block">Billing & Delivery Address:</span>
                          <span className="font-medium text-slate-200">{selectedCustomer.address || selectedCustomer.address_line1 || 'Reddies Colony, Rayachoty, Annamayya District'}</span>
                        </div>
                        {selectedCustomer.notes && (
                          <div className="col-span-2 pt-1 border-t border-slate-900">
                            <span className="text-slate-500 text-[10px] block">Account Notes:</span>
                            <span className="italic text-slate-400">{selectedCustomer.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 2: COMMERCIAL INVOICES STREAM ─── */}
                {activeInspectorTab === 'invoices' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 pb-1 flex-wrap">
                      <div className="relative flex-1 min-w-[180px] max-w-[320px]">
                        <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={invoiceSearch}
                          onChange={(e) => setInvoiceSearch(e.target.value)}
                          placeholder="Filter invoices or items..."
                          className="w-full pl-7 pr-6 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-sans shadow-inner"
                        />
                        {invoiceSearch && (
                          <button onClick={() => setInvoiceSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold p-0.5">✕</button>
                        )}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">
                        {filteredCustomerInvoices.length} of {customerInvoices.length} Invoices
                      </span>
                      <button
                        onClick={() => onOpenInvoiceForCustomer && onOpenInvoiceForCustomer(selectedCustomer)}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-sm transition-all shrink-0"
                      >
                        <FileText className="w-3 h-3" />
                        <span>+ New Invoice</span>
                      </button>
                    </div>

                    {invoicesLoading ? (
                      <div className="space-y-2 animate-pulse py-4">
                        <div className="h-14 bg-slate-800 rounded-xl" />
                        <div className="h-14 bg-slate-800 rounded-xl" />
                      </div>
                    ) : filteredCustomerInvoices.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-xs space-y-2">
                        <FileText className="w-8 h-8 mx-auto text-slate-600" />
                        <p>{invoiceSearch ? 'No invoices match your item/invoice search.' : 'No invoices created for this outlet yet.'}</p>
                        {invoiceSearch ? (
                          <button onClick={() => setInvoiceSearch('')} className="px-2.5 py-1 bg-slate-800 text-amber-400 rounded-lg text-xs font-bold">Clear Filter</button>
                        ) : (
                          <button
                            onClick={() => onOpenInvoiceForCustomer && onOpenInvoiceForCustomer(selectedCustomer)}
                            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition-all"
                          >
                            Create First Invoice
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredCustomerInvoices.map((inv) => (
                          <div 
                            key={inv.id}
                            className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 sm:p-3 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                          >
                            <div className="min-w-0 pr-2 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-amber-400 text-xs">{inv.invoice_number}</span>
                                <StatusBadge status={inv.status} />
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {inv.invoice_date} {inv.due_date ? `| Due: ${inv.due_date}` : ''}
                                </span>
                              </div>
                              {Array.isArray(inv.items) && inv.items.length > 0 && (
                                <p className="text-[10px] text-slate-400 mt-1 truncate">
                                  📦 {inv.items.map(it => `${it.quantity}x ${it.item_description}`).join(', ')}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                              <div className="text-right">
                                <div className="font-mono font-bold text-slate-200 text-xs">
                                  ₹{parseFloat(inv.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </div>
                                <span className={`text-[10px] font-mono block ${parseFloat(inv.outstanding_amount || 0) > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                                  Due: ₹{parseFloat(inv.outstanding_amount || 0).toFixed(2)}
                                </span>
                              </div>

                              <button
                                onClick={() => setThermalModal({ isOpen: true, invoiceId: inv.id })}
                                className="p-1.5 bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1"
                                title="Print Thermal Slip"
                              >
                                <Printer className="w-3 h-3" />
                                <span className="hidden sm:inline">Slip</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ─── TAB 3: LIVE TRANSACTION LEDGER STREAM ─── */}
                {activeInspectorTab === 'ledger' && (
                  <div className="space-y-2.5">
                    {ledgerLoading ? (
                      <div className="space-y-2 animate-pulse py-4">
                        <div className="h-10 bg-slate-800 rounded-xl" />
                        <div className="h-10 bg-slate-800 rounded-xl" />
                        <div className="h-10 bg-slate-800 rounded-xl" />
                      </div>
                    ) : !Array.isArray(ledgerData) || ledgerData.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                        <History className="w-8 h-8 mx-auto text-slate-600" />
                        <p>No ledger transactions recorded for this customer yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {ledgerData.map((entry, idx) => {
                          const isOpening = entry.type === 'OPENING';
                          const isInvoice = entry.type === 'INVOICE';
                          const isPayment = entry.type === 'PAYMENT';
                          const debitVal = parseFloat(entry.debit || 0);
                          const creditVal = parseFloat(entry.credit || 0);

                          return (
                            <div 
                              key={idx}
                              className={`p-2.5 rounded-xl border text-xs transition-colors flex items-center justify-between ${
                                isOpening 
                                  ? 'bg-amber-500/10 border-amber-500/30' 
                                  : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-white text-xs">
                                    {entry.reference || (isOpening ? 'OB' : 'TRX')}
                                  </span>
                                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${
                                    isOpening ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                                    isInvoice ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                                    'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  }`}>
                                    {entry.type}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                  {entry.date} • {entry.description}
                                </p>
                              </div>
                              
                              <div className="text-right shrink-0">
                                <div className="font-mono font-bold text-xs">
                                  {debitVal > 0 && <span className="text-rose-400">+₹{parseFloat(debitVal || 0).toFixed(2)}</span>}
                                  {creditVal > 0 && <span className="text-emerald-400">-₹{parseFloat(creditVal || 0).toFixed(2)}</span>}
                                  {debitVal === 0 && creditVal === 0 && <span className="text-slate-500">₹0.00</span>}
                                </div>
                                <span className="text-[9px] text-amber-400 font-mono font-semibold block">
                                  Bal: ₹{parseFloat(entry.running_balance || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ─── TAB 3: OPERATIONS CONSOLE ─── */}
                {activeInspectorTab === 'actions' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">
                      Primary commercial actions for <strong className="text-white">{selectedCustomer.business_name}</strong>:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        onClick={() => onOpenInvoiceForCustomer && onOpenInvoiceForCustomer(selectedCustomer)}
                        className="p-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-left text-amber-400 transition-all hover:scale-[1.02]"
                      >
                        <FileText className="w-5 h-5 shrink-0" />
                        <div>
                          <div className="font-bold text-xs text-white">Create Wholesale Invoice</div>
                          <span className="text-[10px] text-slate-400">Direct cash invoice with UPI QR</span>
                        </div>
                      </button>

                      <button
                        onClick={() => onOpenOrderForCustomer && onOpenOrderForCustomer(selectedCustomer)}
                        className="p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center gap-2.5 text-left text-blue-400 transition-all hover:scale-[1.02]"
                      >
                        <ShoppingBag className="w-5 h-5 shrink-0" />
                        <div>
                          <div className="font-bold text-xs text-white">Advance Order Booking</div>
                          <span className="text-[10px] text-slate-400">Reserve supplies for delivery route</span>
                        </div>
                      </button>

                      <button
                        onClick={() => onOpenPaymentForCustomer && onOpenPaymentForCustomer(selectedCustomer)}
                        className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-left text-emerald-400 transition-all hover:scale-[1.02]"
                      >
                        <CreditCard className="w-5 h-5 shrink-0" />
                        <div>
                          <div className="font-bold text-xs text-white">Record Cash / UPI Settlement</div>
                          <span className="text-[10px] text-slate-400">Collect UPI, cash or bank transfer</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleSendWhatsApp(selectedCustomer)}
                        className="p-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/30 rounded-xl flex items-center gap-2.5 text-left text-emerald-400 transition-all hover:scale-[1.02]"
                      >
                        <MessageSquare className="w-5 h-5 shrink-0" />
                        <div>
                          <div className="font-bold text-xs text-white">Send WhatsApp Statement</div>
                          <span className="text-[10px] text-slate-400">Instant dispatch via 9347453135</span>
                        </div>
                      </button>

                      {hasRole(['ADMIN', 'OPERATOR']) && (
                        <button
                          onClick={() => setDeleteConfirmModal({
                            isOpen: true,
                            customer: selectedCustomer,
                            isDeleting: false,
                            error: null
                          })}
                          className="p-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-left text-rose-400 transition-all hover:scale-[1.02]"
                        >
                          <Trash2 className="w-5 h-5 shrink-0" />
                          <div>
                            <div className="font-bold text-xs text-rose-300">Delete Outlet Account</div>
                            <span className="text-[10px] text-slate-400">Permanently remove customer from system</span>
                          </div>
                        </button>
                      )}
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

      {/* ─── THERMAL RECEIPT SLIP MODAL ─── */}
      {thermalModal.isOpen && (
        <ThermalReceiptModal
          isOpen={thermalModal.isOpen}
          onClose={() => setThermalModal({ isOpen: false, invoiceId: null })}
          invoiceId={thermalModal.invoiceId}
        />
      )}

      {/* ─── DELETE CUSTOMER CONFIRMATION MODAL ─── */}
      {deleteConfirmModal.isOpen && deleteConfirmModal.customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Delete Customer Outlet</h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {deleteConfirmModal.customer.customer_code}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDeleteConfirmModal({ isOpen: false, customer: null, isDeleting: false, error: null })}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Are you sure you want to delete outlet <strong className="text-white">{deleteConfirmModal.customer.business_name}</strong>?
              </p>
              
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Contact:</span>
                  <span className="text-slate-200">{deleteConfirmModal.customer.contact_person || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="text-slate-200">{deleteConfirmModal.customer.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Outstanding Due:</span>
                  <span className={parseFloat(deleteConfirmModal.customer.outstanding_balance || 0) > 0 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                    ₹{parseFloat(deleteConfirmModal.customer.outstanding_balance || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {deleteConfirmModal.error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deleteConfirmModal.error}</span>
                </div>
              )}

              <p className="text-[11px] text-slate-400 italic">
                ⚠️ Note: Customers with active balance dues or GST invoices cannot be deleted to preserve accounting compliance.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ isOpen: false, customer: null, isDeleting: false, error: null })}
                disabled={deleteConfirmModal.isDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCustomer}
                disabled={deleteConfirmModal.isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/20 transition-all flex items-center gap-1.5"
              >
                {deleteConfirmModal.isDeleting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

