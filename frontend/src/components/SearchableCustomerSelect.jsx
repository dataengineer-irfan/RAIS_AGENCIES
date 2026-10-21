import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Building2, Phone, MapPin, AlertCircle } from 'lucide-react';

export const SearchableCustomerSelect = ({
  customers = [],
  selectedCustomerId = '',
  onSelectCustomer,
  required = false,
  placeholder = '-- Click to Search & Select Customer / Outlet * --',
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    return (customers || []).find(c => String(c?.id) === String(selectedCustomerId));
  }, [customers, selectedCustomerId]);

  // Filtered and sorted customers
  const filteredCustomers = useMemo(() => {
    const list = [...(customers || [])].sort((a, b) => 
      (a?.business_name || '').localeCompare(b?.business_name || '', undefined, { sensitivity: 'base' })
    );

    const term = searchTerm.trim().toLowerCase();
    if (!term) return list;

    return list.filter(c => {
      const name = (c?.business_name || '').toLowerCase();
      const code = (c?.customer_code || '').toLowerCase();
      const phone = (c?.phone || '').toLowerCase();
      const city = (c?.city || '').toLowerCase();
      return name.includes(term) || code.includes(term) || phone.includes(term) || city.includes(term);
    });
  }, [customers, searchTerm]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setHighlightedIndex(0);
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-customer-item]');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredCustomers.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredCustomers.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCustomers[highlightedIndex]) {
        handleSelect(filteredCustomers[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleSelect = (cust) => {
    if (onSelectCustomer) {
      onSelectCustomer(cust ? cust.id : '', cust || null);
    }
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onSelectCustomer) {
      onSelectCustomer('', null);
    }
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`} onKeyDown={handleKeyDown}>
      {/* ─── TRIGGER BUTTON / DISPLAY CARD ─── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full rounded-xl px-3 py-2 text-left flex items-center justify-between gap-2 transition-all shadow-inner focus:outline-none ${
          !selectedCustomer
            ? 'bg-slate-900 border-2 border-amber-500 ring-2 ring-amber-500/20 text-slate-200 hover:border-amber-400'
            : 'bg-slate-900 border border-slate-700/80 text-white hover:border-slate-600 focus:border-amber-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
            selectedCustomer 
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            <Building2 className="w-3.5 h-3.5" />
          </div>

          {selectedCustomer ? (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white truncate">
                  {selectedCustomer.business_name}
                </span>
                {selectedCustomer.customer_code && (
                  <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                    ({selectedCustomer.customer_code})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                {selectedCustomer.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-slate-500" />
                    {selectedCustomer.city}
                  </span>
                )}
                {selectedCustomer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-2.5 h-2.5 text-slate-500" />
                    {selectedCustomer.phone}
                  </span>
                )}
                <span className={`font-bold ml-auto shrink-0 ${
                  parseFloat(selectedCustomer.outstanding_balance || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  Due: ₹{parseFloat(selectedCustomer.outstanding_balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-xs font-bold text-amber-300 truncate">
                {placeholder}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedCustomer && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => { if (e.key === 'Enter') handleClear(e); }}
              className="p-1 text-slate-400 hover:text-rose-400 rounded-md hover:bg-slate-800 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-400' : ''}`} />
        </div>
      </button>

      {/* ─── SEARCHABLE DROPDOWN POPOVER PANEL ─── */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Search Input Header */}
          <div className="p-2.5 bg-slate-950 border-b border-slate-800">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-amber-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder="Search by customer name, code (e.g. 0023), city, or phone..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-9 py-2 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 font-sans"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    if (searchInputRef.current) searchInputRef.current.focus();
                  }}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between px-1 pt-1.5 text-[10px] font-mono text-slate-400">
              <span>{filteredCustomers.length} outlet(s) found</span>
              <span className="text-slate-500">↑↓ to navigate • Enter to select</span>
            </div>
          </div>

          {/* Customer Options List */}
          <div ref={listRef} className="max-h-64 sm:max-h-72 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar p-1">
            {filteredCustomers.length === 0 ? (
              <div className="py-8 text-center space-y-1.5 text-slate-400">
                <AlertCircle className="w-6 h-6 mx-auto text-slate-600" />
                <p className="text-xs font-bold">No matching customer found</p>
                <p className="text-[10px] text-slate-500">Try searching with partial outlet name or code</p>
              </div>
            ) : (
              filteredCustomers.map((c, index) => {
                const isSelected = String(c?.id) === String(selectedCustomerId);
                const isHighlighted = index === highlightedIndex;
                const bal = parseFloat(c?.outstanding_balance || 0);

                return (
                  <div
                    key={c?.id}
                    data-customer-item
                    onClick={() => handleSelect(c)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`p-2.5 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-amber-500/15 text-white font-bold'
                        : isHighlighted
                          ? 'bg-slate-800/90 text-white'
                          : 'hover:bg-slate-800/60 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                        isSelected 
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {(c?.business_name || 'C').charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs truncate ${isSelected ? 'font-black text-amber-300' : 'font-bold text-white'}`}>
                            {c?.business_name || 'Customer'}
                          </span>
                          {c?.customer_code && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-semibold shrink-0">
                              {c.customer_code}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                          {c?.city && <span>{c.city}</span>}
                          {c?.city && c?.phone && <span className="text-slate-600">•</span>}
                          {c?.phone && <span>{c.phone}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        bal > 0 
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        Due: ₹{bal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableCustomerSelect;
