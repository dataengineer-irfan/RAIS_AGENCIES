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
  ArrowLeft
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
  
  // Slicers & Filter State (Power BI Style)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE
  const [areaFilter, setAreaFilter] = useState('ALL'); // ALL, Rayachoty, Madanapalle, Kadapa, Chinnamandem
  const [balanceFilter, setBalanceFilter] = useState('ALL'); // ALL, HAS_DUE, ZERO_DUE
  const [sortBy, setSortBy] = useState('NAME_ASC'); // NAME_ASC, BALANCE_DESC, LIMIT_DESC, CODE_ASC
  
  // Selected Customer for Right Detail Inspector
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [activeInspectorTab, setActiveInspectorTab] = useState('overview'); // overview, ledger, actions
  const [copiedCode, setCopiedCode] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'

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
        const initialId = selectId || (selectedCustomerId && items.some(i => i.id === selectedCustomerId) ? selectedCustomerId : items[0].id);
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
    setMobileView('detail');
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendWhatsApp = (cust) => {
    const balance = cust.outstanding_balance || 0;
    const text = `*RAIS AGENCIES — Customer Statement*%0A%0ADear ${cust.business_name || cust.contact_person},%0AYour current account balance with RAIS Agencies is *₹${Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}*.%0A%0AFor wholesale order bookings, pricing or direct settlement, contact Rayachoty Depot: *9347453135*.%0A%0A*RAIS Agencies*, Reddies Colony, Rayachoty.`;
    window.open(`https://wa.me/91${cust.phone}?text=${text}`, '_blank');
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setAreaFilter('ALL');
    setBalanceFilter('ALL');
    setSortBy('NAME_ASC');
  };

  // ─── POWER BI REACTIVE SLICING & FILTERING ───
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // 1. Search Query
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || (
        (c.business_name || '').toLowerCase().includes(q) ||
        (c.contact_person || '').toLowerCase().includes(q) ||
        (c.customer_code || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.address_line1 || '').toLowerCase().includes(q)
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
        return parseFloat(b.outstanding_balance || 0) - parseFloat(a.outstanding_balance || 0);
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
  const totalReceivables = customers.reduce((acc, c) => acc + parseFloat(c.outstanding_balance || 0), 0);
  const totalCreditExposure = customers.reduce((acc, c) => acc + parseFloat(c.credit_limit || 0), 0);
  const customersWithDues = customers.filter(c => parseFloat(c.outstanding_balance || 0) > 0.01).length;

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || filteredCustomers[0] || customers[0];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden gap-1.5 font-sans">
      
      {/* ─── ROW 1: DESKTOP PERSISTENT SLICER & FILTER RIBBON (md and above) ─── */}
      <div className="hidden md:flex bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 shrink-0 shadow-md flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Search & Customer Quick Jump Slicer */}
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          {/* Customer Dropdown Quick Slicer */}
          <div className="relative min-w-[160px] sm:min-w-[200px]">
            <select
              value={selectedCustomerId || ''}
              onChange={(e) => {
                const found = customers.find(c => c.id === e.target.value);
                if (found) handleSelectCustomer(found);
              }}
              className="w-full bg-slate-950 border border-amber-500/30 text-amber-300 font-bold rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400 font-mono truncate"
            >
              <option value="">-- Jump to Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customer_code} • {c.business_name} (₹{parseFloat(c.outstanding_balance || 0).toFixed(0)})
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search outlet name, code, phone, area..."
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Center/Right: Route Slicer & Balance Slicer */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Territory / Route Slicer */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider hidden sm:inline">Route:</span>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Territories ({totalOutlets})</option>
              <option value="RAYACHOTY_TOWN">Rayachoty Town</option>
              <option value="MADANAPALLE_RD">Madanapalle Rd</option>
              <option value="KADAPA_RD">Kadapa Bypass</option>
              <option value="CHINNAMANDEM">Chinnamandem & Nearby</option>
            </select>
          </div>

          {/* Balance Slicer */}
          <div className="flex items-center gap-1">
            <select
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Balances</option>
              <option value="HAS_DUE">🚨 Has Balance Due ({customersWithDues})</option>
              <option value="ZERO_DUE">✅ Zero Due ({totalOutlets - customersWithDues})</option>
            </select>
          </div>

          {/* Sort Slicer */}
          <div className="flex items-center gap-1">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="NAME_ASC">Name (A → Z)</option>
              <option value="BALANCE_DESC">Balance (High → Low)</option>
              <option value="LIMIT_DESC">Credit Limit (High → Low)</option>
              <option value="CODE_ASC">Code (CUST-0001)</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(searchTerm || statusFilter !== 'ALL' || areaFilter !== 'ALL' || balanceFilter !== 'ALL' || sortBy !== 'NAME_ASC') && (
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all hover:scale-105"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Outlet</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── ROW 1 (MOBILE): NATIVE MOBILE SEARCH & SWIPEABLE CHIPS (< md) ─── */}
      <div className="md:hidden flex flex-col gap-2 shrink-0">
        {/* Mobile Search & Sort Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search outlets, contact, area..."
              className="w-full pl-9 pr-7 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-sm"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                ✕
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl px-2.5 py-2 focus:outline-none shrink-0"
          >
            <option value="NAME_ASC">A → Z</option>
            <option value="BALANCE_DESC">Due ↓</option>
            <option value="LIMIT_DESC">Limit ↓</option>
          </select>
        </div>

        {/* Swipeable Horizontal Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
          <button
            onClick={() => { setAreaFilter('ALL'); setBalanceFilter('ALL'); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              areaFilter === 'ALL' && balanceFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            All Outlets ({totalOutlets})
          </button>

          <button
            onClick={() => setBalanceFilter(balanceFilter === 'HAS_DUE' ? 'ALL' : 'HAS_DUE')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              balanceFilter === 'HAS_DUE'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            🚨 Balance Due ({customersWithDues})
          </button>

          <button
            onClick={() => setAreaFilter(areaFilter === 'RAYACHOTY_TOWN' ? 'ALL' : 'RAYACHOTY_TOWN')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              areaFilter === 'RAYACHOTY_TOWN'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            Rayachoty Town
          </button>

          <button
            onClick={() => setAreaFilter(areaFilter === 'MADANAPALLE_RD' ? 'ALL' : 'MADANAPALLE_RD')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              areaFilter === 'MADANAPALLE_RD'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            Madanapalle Rd
          </button>

          <button
            onClick={() => setAreaFilter(areaFilter === 'CHINNAMANDEM' ? 'ALL' : 'CHINNAMANDEM')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              areaFilter === 'CHINNAMANDEM'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            Chinnamandem
          </button>
        </div>

        {/* Mobile Quick Metric Strip */}
        <div className="grid grid-cols-3 gap-1.5 py-1">
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl px-2.5 py-1.5 text-center">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Outlets</span>
            <span className="text-xs font-black text-white font-mono">{filteredCount} / {totalOutlets}</span>
          </div>
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl px-2.5 py-1.5 text-center">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Receivables</span>
            <span className="text-xs font-black text-emerald-400 font-mono">₹{totalReceivables.toFixed(0)}</span>
          </div>
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl px-2.5 py-1.5 text-center">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Credit Cap</span>
            <span className="text-xs font-black text-blue-400 font-mono">₹{(totalCreditExposure / 100000).toFixed(1)}L</span>
          </div>
        </div>
      </div>

      {/* ─── ROW 2: DESKTOP CUSTOMER KPI METRIC RIBBON (md and above) ─── */}
      <div className="hidden md:grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
        {/* KPI 1: Active Accounts */}
        <div className="bg-slate-900 border border-slate-800 border-t-2 border-t-amber-500 rounded-xl px-3.5 py-2.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Filtered Outlets</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-black text-white font-mono">{filteredCount}</span>
              <span className="text-[10px] text-slate-400 font-mono">/ {totalOutlets} total</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Building2 className="w-4 h-4" />
          </div>
        </div>

        {/* KPI 2: Total Open Receivables */}
        <div className="bg-slate-900 border border-slate-800 border-t-2 border-t-emerald-500 rounded-xl px-3.5 py-2.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Book Receivables</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-black text-emerald-400 font-mono">
                ₹{totalReceivables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        {/* KPI 3: Total Credit Exposure */}
        <div className="bg-slate-900 border border-slate-800 border-t-2 border-t-blue-500 rounded-xl px-3.5 py-2.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Credit Exposure Cap</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-black text-blue-400 font-mono">
                ₹{(totalCreditExposure / 100000).toFixed(2)} Lakhs
              </span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        {/* KPI 4: Settlement Standard */}
        <div className="bg-slate-900 border border-slate-800 border-t-2 border-t-purple-500 rounded-xl px-3.5 py-2.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Settlement Model</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xs font-black text-purple-300">Cash on Delivery</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <CreditCard className="w-4 h-4" />
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
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                          {cust.customer_code}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono truncate">
                          📍 {cust.city || 'Rayachoty'}
                        </span>
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
                        <span className="text-[9px] text-slate-500 font-mono">
                          Limit: ₹{(creditLimit / 1000).toFixed(0)}k
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
              
              {/* Sticky Inspector Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800 shrink-0">
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
                    <span className="text-[10px] text-slate-400 font-mono">
                      📍 {selectedCustomer.city || 'Rayachoty'}, AP
                    </span>
                  </div>
                  
                  <h2 className="text-sm sm:text-base font-black text-white mt-1">
                    {selectedCustomer.business_name}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {selectedCustomer.contact_person} • Ph: <strong className="text-slate-200">{selectedCustomer.phone}</strong>
                  </p>
                </div>

                {/* Primary Quick-Action Launchers */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button
                    onClick={() => onOpenInvoiceForCustomer && onOpenInvoiceForCustomer(selectedCustomer)}
                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1 shadow-sm transition-all hover:scale-105"
                    title="Create Commercial Invoice"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>+ Invoice</span>
                  </button>

                  <button
                    onClick={() => onOpenOrderForCustomer && onOpenOrderForCustomer(selectedCustomer)}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm transition-all hover:scale-105"
                    title="Book Wholesale Order"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Order</span>
                  </button>

                  <button
                    onClick={() => onOpenPaymentForCustomer && onOpenPaymentForCustomer(selectedCustomer)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm transition-all hover:scale-105"
                    title="Record Cash/UPI Payment"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay</span>
                  </button>

                  <button
                    onClick={() => handleSendWhatsApp(selectedCustomer)}
                    className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition-all"
                    title="Send Statement via WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>

                  {hasRole(['ADMIN', 'OPERATOR']) && (
                    <button
                      onClick={() => {
                        setCustomerToEdit(selectedCustomer);
                        setCustomerModalOpen(true);
                      }}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all"
                      title="Edit Customer Profile"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Inspector Tab Navigation Bar */}
              <div className="flex items-center gap-1.5 pt-2 pb-2 border-b border-slate-800/80 shrink-0">
                {[
                  { id: 'overview', label: '360° Dossier & Exposure', icon: ShieldCheck },
                  { id: 'ledger', label: 'Live Ledger Stream', icon: History },
                  { id: 'actions', label: 'Operations Console', icon: SlidersHorizontal },
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
                    {parseFloat(selectedCustomer.credit_limit || 0) > 0 && (
                      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-semibold">Credit Exposure Rate</span>
                          <span className="font-mono font-bold text-amber-400">
                            {Math.min(Math.round((parseFloat(selectedCustomer.outstanding_balance || 0) / parseFloat(selectedCustomer.credit_limit || 1)) * 100), 100)}% utilized
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div 
                            className="bg-amber-400 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(Math.round((parseFloat(selectedCustomer.outstanding_balance || 0) / parseFloat(selectedCustomer.credit_limit || 1)) * 100), 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

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

                {/* ─── TAB 2: LIVE TRANSACTION LEDGER STREAM ─── */}
                {activeInspectorTab === 'ledger' && (
                  <div className="space-y-2.5">
                    {ledgerLoading ? (
                      <div className="space-y-2 animate-pulse py-4">
                        <div className="h-10 bg-slate-800 rounded-xl" />
                        <div className="h-10 bg-slate-800 rounded-xl" />
                        <div className="h-10 bg-slate-800 rounded-xl" />
                      </div>
                    ) : !ledgerData || !ledgerData.entries || ledgerData.entries.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                        <History className="w-8 h-8 mx-auto text-slate-600" />
                        <p>No ledger transactions recorded for this customer yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {ledgerData.entries.map((entry, idx) => (
                          <div 
                            key={idx}
                            className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
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

