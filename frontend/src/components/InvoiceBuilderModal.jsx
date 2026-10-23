import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Calculator, CheckCircle2, FileText, Printer, Sparkles, Package, Eye, ArrowLeft, Building2, User, Calendar, CreditCard, ShieldCheck, MessageSquare, Minus, AlertTriangle, Mic } from 'lucide-react';
import { customerApi, catalogueApi, billingApi, paymentApi } from '../services/api';
import { SmartProductSearchPicker } from './SmartProductSearchPicker';
import { shareInvoiceOnWhatsApp } from '../utils/whatsappShare';
import { formatProductDisplay, sortProductsByCleanName } from '../utils/productHelpers';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { VoiceDictationModal } from './VoiceDictationModal';
import { SearchableCustomerSelect } from './SearchableCustomerSelect';
import { IS_VOICE_ENABLED } from '../utils/featureFlags';
import { getLocalDateString } from '../utils/dateUtils';

export const InvoiceBuilderModal = ({ 
  isOpen, 
  onClose, 
  onInvoiceCreated,
  preselectedCustomer = null,
  preselectedProduct = null,
  invoiceToEdit = null,   // Pass existing invoice object to enter Edit Bill mode
  initialVoiceData = null
}) => {
  useBodyScrollLock(isOpen);
  const isEditMode = Boolean(invoiceToEdit?.id);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successInvoice, setSuccessInvoice] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [voiceNotification, setVoiceNotification] = useState(null);
  const [voiceConflictPrompt, setVoiceConflictPrompt] = useState(null);

  // Form State - Cash business default: invoiceDate and dueDate are identical today
  const todayStr = getLocalDateString();
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState(todayStr);
  const [invoiceDiscount, setInvoiceDiscount] = useState('0');
  const [collectedAmount, setCollectedAmount] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Cash on Delivery / Immediate Settlement');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [autoIssue, setAutoIssue] = useState(true);
  const [markAsPaid, setMarkAsPaid] = useState(false);

  // Line items
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
    }
  }, [isOpen, preselectedCustomer, preselectedProduct]);

  const loadDependencies = async () => {
    setLoading(true);
    setError('');
    setSuccessInvoice(null);
    setShowPreview(false);
    try {
      const [custDataRaw, prodDataRaw, catDataRaw] = await Promise.all([
        customerApi.list({ limit: 100 }),
        catalogueApi.listProducts({ limit: 200 }),
        catalogueApi.listCategories(true).catch(() => [])
      ]);

      const custData = Array.isArray(custDataRaw) ? custDataRaw : (custDataRaw?.items || []);
      const prodData = Array.isArray(prodDataRaw) ? prodDataRaw : (prodDataRaw?.items || []);
      const catData = Array.isArray(catDataRaw) ? catDataRaw : (catDataRaw?.items || []);

      setCustomers(custData);
      setProducts(prodData);
      setCategories(catData);

      // ─── EDIT BILL MODE: Pre-populate from invoiceToEdit ───
      if (isEditMode && invoiceToEdit) {
        setCustomerId(invoiceToEdit.customer_id || '');
        setInvoiceDate(invoiceToEdit.invoice_date || getLocalDateString());
        setDueDate(invoiceToEdit.due_date || invoiceToEdit.invoice_date || getLocalDateString());
        setInvoiceDiscount(String(parseFloat(invoiceToEdit.discount_amount || 0)));
        setCollectedAmount('');
        setPaymentTerms(invoiceToEdit.payment_terms || 'Cash on Delivery / Immediate Settlement');
        setNotes(invoiceToEdit.notes || '');
        if (invoiceToEdit.notes) setShowNotes(true);

        // Map existing invoice items → editable line items
        if (invoiceToEdit.items && invoiceToEdit.items.length > 0) {
          setItems((invoiceToEdit.items || []).map(itm => {
            const matched = prodData.find(p => p.id === itm.product_id);
            return {
              product_id: itm.product_id,
              quantity: parseFloat(itm.quantity) || 1,
              unit_price: parseFloat(itm.unit_price) || (matched ? parseFloat(matched.base_price || 0) : 0),
              discount_rate: parseFloat(itm.discount_rate) || 0,
              packaging_unit: itm.packaging_unit || matched?.packaging_unit || 'PKT'
            };
          }));
        } else {
          setItems([{ product_id: '', quantity: 1, unit_price: 0, discount_rate: 0, packaging_unit: 'PKT' }]);
        }
        return;
      }

      // ─── CREATE MODE: Normal initialization ───
      // 1. Resolve initial customer
      if (preselectedCustomer) {
        setCustomerId(typeof preselectedCustomer === 'object' ? preselectedCustomer.id : preselectedCustomer);
      } else {
        setCustomerId('');
      }

      // 2. Resolve initial product line items
      if (preselectedProduct && typeof preselectedProduct === 'object') {
        setItems([
          {
            product_id: preselectedProduct.id,
            quantity: 1,
            unit_price: parseFloat(preselectedProduct.base_price || 0),
            discount_rate: 0,
            packaging_unit: preselectedProduct.packaging_unit || 'PKT'
          }
        ]);
      } else {
        // Blank item row: user must choose product from dropdown or quick catalog
        setItems([
          { product_id: '', quantity: 1, unit_price: 0, discount_rate: 0, packaging_unit: 'PKT' }
        ]);
      }

      // 3. If initialVoiceData was passed upon modal launch, apply it immediately
      if (initialVoiceData) {
        setTimeout(() => {
          handleApplyVoiceData(initialVoiceData);
        }, 50);
      }
    } catch (err) {
      console.error("Failed to load invoice builder dependencies:", err);
      setError('Failed to load customers or catalogue items. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  const applyStagedVoiceData = (parsedResult, mode = 'REPLACE') => {
    if (!parsedResult) return;
    const appliedSummary = [];

    // 1. Customer
    if (parsedResult.customer?.id) {
      setCustomerId(parsedResult.customer.id);
      appliedSummary.push(`Customer: ${parsedResult.customer.business_name}`);
    }

    // 2. Discount
    if (parsedResult.discountAmount > 0) {
      setInvoiceDiscount(String(parsedResult.discountAmount));
      appliedSummary.push(`Discount: ₹${parsedResult.discountAmount}`);
    }

    // 3. Line Items
    if (parsedResult.items && parsedResult.items.length > 0) {
      const incomingItems = parsedResult.items.map(itm => {
        const prod = products.find(p => p.id === itm.product_id);
        return {
          product_id: itm.product_id || (prod ? prod.id : ''),
          quantity: itm.quantity || 1,
          unit_price: parseFloat(itm.unit_price) || (prod ? parseFloat(prod.base_price || 0) : 0),
          discount_rate: itm.discount_rate || 0,
          packaging_unit: itm.packaging_unit || prod?.packaging_unit || 'PKT',
          isAmbiguous: Boolean(itm.isAmbiguous),
          alternatives: Array.isArray(itm.alternatives) ? itm.alternatives : []
        };
      });

      if (mode === 'APPEND') {
        const currentValid = items.filter(it => Boolean(it.product_id));
        const combined = [...currentValid, ...incomingItems];
        setItems(combined.length > 0 ? combined : incomingItems);
        appliedSummary.push(`Appended ${incomingItems.length} item(s)`);
      } else {
        setItems(incomingItems);
        appliedSummary.push(`${incomingItems.length} item(s)`);
      }
    }

    setVoiceNotification(`Voice Staged: ${appliedSummary.join(' • ')}`);
    setTimeout(() => setVoiceNotification(null), 6000);
  };

  const handleApplyVoiceData = (parsedResult) => {
    if (!parsedResult) return;
    const hasExistingItems = items.some(it => Boolean(it.product_id) && (parseFloat(it.quantity) > 0));

    if (hasExistingItems && parsedResult.items && parsedResult.items.length > 0) {
      setVoiceConflictPrompt({ pendingData: parsedResult });
      if (parsedResult.customer?.id) setCustomerId(parsedResult.customer.id);
      if (parsedResult.discountAmount > 0) setInvoiceDiscount(String(parsedResult.discountAmount));
      return;
    }

    applyStagedVoiceData(parsedResult, 'REPLACE');
  };

  const handleResolveDisambiguation = (index, altProduct) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        product_id: altProduct.id,
        unit_price: parseFloat(altProduct.base_price || 0),
        packaging_unit: altProduct.packaging_unit || updated[index].packaging_unit || 'PKT',
        isAmbiguous: false,
        alternatives: []
      };
      return updated;
    });
  };

  const handleDismissDisambiguation = (index) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        isAmbiguous: false,
        alternatives: []
      };
      return updated;
    });
  };

  const handleInvoiceDateChange = (val) => {
    setInvoiceDate(val);
    // Keep due date synced to invoice date by default for cash business
    setDueDate(val);
  };

  const resetForm = () => {
    setError('');
    setSuccessInvoice(null);
    setShowPreview(false);
    setInvoiceDiscount('0');
    setCollectedAmount('');
    setMarkAsPaid(false);
    setNotes('');
    setShowNotes(false);
    setPaymentTerms('Cash on Delivery / Immediate Settlement');
    const curToday = getLocalDateString();
    setInvoiceDate(curToday);
    setDueDate(curToday);
    // Do not pre-select any product by default - user chooses SKU
    setItems([{ product_id: '', quantity: 1, unit_price: 0, discount_rate: 0, packaging_unit: 'PKT' }]);
  };

  const handleProductChange = (index, prodId) => {
    const prod = products.find(p => p.id === prodId);
    const newItems = [...items];
    if (prod) {
      newItems[index] = {
        ...newItems[index],
        product_id: prod.id,
        unit_price: parseFloat(prod.base_price || 0),
        packaging_unit: prod.packaging_unit || 'PKT',
        isAmbiguous: false,
        alternatives: []
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        product_id: '',
        unit_price: 0,
        isAmbiguous: false,
        alternatives: []
      };
    }
    setItems(newItems);
  };

  const handleItemFieldChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItemRow = () => {
    // Add clean empty line item row - user selects SKU from dropdown or quick catalog
    setItems([...items, { product_id: '', quantity: 1, unit_price: 0, discount_rate: 0, packaging_unit: 'PKT' }]);
  };

  const handleQuickAddProduct = (prod) => {
    if (!prod) return;
    const existingIdx = items.findIndex(i => i.product_id === prod.id);
    if (existingIdx >= 0) {
      const newItems = [...items];
      newItems[existingIdx].quantity = (parseFloat(newItems[existingIdx].quantity) || 0) + 1;
      setItems(newItems);
    } else {
      if (items.length === 1 && !items[0].product_id) {
        setItems([
          {
            product_id: prod.id,
            quantity: 1,
            unit_price: parseFloat(prod.base_price || 0),
            discount_rate: 0,
            packaging_unit: prod.packaging_unit || 'PKT'
          }
        ]);
      } else {
        setItems([
          ...items,
          {
            product_id: prod.id,
            quantity: 1,
            unit_price: parseFloat(prod.base_price || 0),
            discount_rate: 0,
            packaging_unit: prod.packaging_unit || 'PKT'
          }
        ]);
      }
    }
  };

  const handleDecrementProduct = (prod) => {
    if (!prod) return;
    const existingIdx = items.findIndex(i => i.product_id === prod.id);
    if (existingIdx >= 0) {
      const currentQty = parseFloat(items[existingIdx].quantity) || 1;
      if (currentQty > 1) {
        const newItems = [...items];
        newItems[existingIdx].quantity = currentQty - 1;
        setItems(newItems);
      } else {
        if (items.length === 1) {
          setItems([{ product_id: '', quantity: 1, unit_price: 0, discount_rate: 0, packaging_unit: 'PKT' }]);
        } else {
          setItems(items.filter((_, idx) => idx !== existingIdx));
        }
      }
    }
  };

  const handleCustomerChange = (id) => {
    setCustomerId(id);
    const cust = customers.find(c => c.id === id);
    if (cust && /cash/i.test(cust.business_name || '')) {
      setMarkAsPaid(true);
      setAutoIssue(true);
    }
  };

  const handleAdjustQuantity = (index, delta) => {
    const newItems = [...items];
    const currentQty = parseFloat(newItems[index].quantity) || 0;
    const nextQty = Math.max(1, currentQty + delta);
    newItems[index].quantity = nextQty;
    setItems(newItems);
  };

  const quantitiesByProductId = useMemo(() => {
    const map = {};
    items.forEach(itm => {
      if (itm.product_id) {
        map[itm.product_id] = (map[itm.product_id] || 0) + (parseFloat(itm.quantity) || 0);
      }
    });
    return map;
  }, [items]);

  // Identify any line items where billing quantity exceeds available depot stock
  const overStockItems = useMemo(() => {
    return items.filter(itm => {
      if (!itm?.product_id) return false;
      const prod = products.find(p => p.id === itm.product_id);
      if (!prod) return false;
      const curStock = parseFloat(prod.current_stock ?? 0);
      const reqQty = parseFloat(itm.quantity || 0);
      return reqQty > curStock;
    });
  }, [items, products]);

  const removeItemRow = (index) => {
    if (items.length === 1) {
      setItems([{ product_id: '', quantity: 1, unit_price: 0, discount_rate: 0, packaging_unit: 'PKT' }]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Live Calculations (Direct Wholesale Price - No GST)
  const calculateTotals = () => {
    let subtotal = 0;
    let itemDiscounts = 0;

    items.forEach(itm => {
      const qty = parseFloat(itm.quantity) || 0;
      const rate = parseFloat(itm.unit_price) || 0;
      const disc = parseFloat(itm.discount_rate) || 0;

      const gross = qty * rate;
      const discAmt = gross * (disc / 100);

      subtotal += gross;
      itemDiscounts += discAmt;
    });

    const invDisc = parseFloat(invoiceDiscount) || 0;
    const totalDiscount = itemDiscounts + invDisc;
    const grandTotal = Math.max(0, subtotal - totalDiscount);

    return {
      subtotal: parseFloat(subtotal || 0).toFixed(2),
      discount: parseFloat(totalDiscount || 0).toFixed(2),
      total: parseFloat(grandTotal || 0).toFixed(2)
    };
  };

  const totals = calculateTotals();
  const selectedCustomerObj = customers.find(c => c.id === customerId);

  // ─── COUNTER COLLECTION & SETTLEMENT DERIVED VALUES ───
  const billTotal = parseFloat(totals.total) || 0;
  const numCollected = parseFloat(collectedAmount) || 0;
  const custLedgerDue = Math.max(0, parseFloat(selectedCustomerObj?.outstanding_balance || 0));
  const effectivePaid = numCollected > 0 ? numCollected : (markAsPaid ? billTotal : 0);
  const billSettledAmount = Math.min(billTotal, effectivePaid);
  const surplusAmount = Math.max(0, effectivePaid - billTotal);
  const appliedToPastDues = Math.min(surplusAmount, custLedgerDue);
  const remainingBillDue = Math.max(0, billTotal - billSettledAmount);
  const projectedLedgerDue = Math.max(0, custLedgerDue + remainingBillDue - surplusAmount);

  const validateForm = () => {
    if (!customerId) {
      setError('Please select a customer / restaurant.');
      return false;
    }
    if (items.length === 0 || items.some(i => !i.product_id || parseFloat(i.quantity) <= 0)) {
      setError('Please ensure all line items have a selected SKU and valid quantity > 0.');
      return false;
    }
    if (parseFloat(totals.discount) > parseFloat(totals.subtotal)) {
      setError(`Total discounts (₹${totals.discount}) cannot exceed invoice subtotal (₹${totals.subtotal}). Negative balances are strictly prohibited.`);
      return false;
    }
    return true;
  };

  const handleOpenPreview = () => {
    setError('');
    if (validateForm()) {
      setShowPreview(true);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const itemsPayload = (items || []).map(itm => ({
        product_id: itm?.product_id,
        quantity: parseFloat(itm?.quantity || 1),
        unit_price: parseFloat(itm?.unit_price || 0),
        discount_rate: parseFloat(itm?.discount_rate || 0)
      }));

      let res;

      if (isEditMode) {
        // ─── EDIT BILL MODE ───
        if (!invoiceToEdit?.id) throw new Error('Missing invoice ID for edit.');
        const editPayload = {
          customer_id: customerId,
          invoice_date: invoiceDate,
          due_date: dueDate,
          discount_amount: parseFloat(invoiceDiscount) || 0,
          payment_terms: paymentTerms,
          notes: notes.trim() || null,
          items: itemsPayload
        };
        res = await billingApi.updateInvoice(invoiceToEdit.id, editPayload);
        setSuccessInvoice(res);
        setShowPreview(false);
        if (onInvoiceCreated) onInvoiceCreated(res);
      } else {
        // ─── CREATE BILL MODE (With Client Idempotency Key) ───
        const idempotencyKey = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const numCollected = parseFloat(collectedAmount) || 0;
        const willMarkAsPaid = markAsPaid || (numCollected >= parseFloat(totals.total));
        const effectiveAmountPaid = numCollected > 0 ? numCollected : (willMarkAsPaid ? parseFloat(totals.total) : 0);

        const payload = {
          customer_id: customerId,
          invoice_date: invoiceDate,
          due_date: dueDate,
          discount_amount: parseFloat(invoiceDiscount) || 0,
          payment_terms: paymentTerms,
          notes: notes.trim() || null,
          auto_issue: autoIssue,
          mark_as_paid: willMarkAsPaid,
          amount_paid: effectiveAmountPaid > 0 ? effectiveAmountPaid : undefined,
          idempotency_key: idempotencyKey,
          items: itemsPayload
        };
        res = await billingApi.createInvoice(payload);

        // Fallback immediate cash settlement if marked as paid/collected and backend hasn't already auto-settled
        if (effectiveAmountPaid > 0 && res?.id && res?.status !== 'PAID' && res?.status !== 'PARTIALLY_PAID') {
          try {
            const payRes = await paymentApi.record({
              customer_id: customerId,
              amount: effectiveAmountPaid,
              payment_method: (paymentTerms || '').includes('UPI') ? 'UPI' : 'CASH',
              payment_date: invoiceDate,
              notes: `Counter Settlement for Invoice #${res.invoice_number}`
            });
            if (payRes?.id) {
              const allocToInvoice = Math.min(effectiveAmountPaid, parseFloat(res.total_amount));
              await paymentApi.allocate(payRes.id, res.id, allocToInvoice);
              if (allocToInvoice >= parseFloat(res.total_amount)) {
                res.status = 'PAID';
                res.paid_amount = res.total_amount;
                res.outstanding_amount = 0;
              } else {
                res.status = 'PARTIALLY_PAID';
                res.paid_amount = allocToInvoice;
                res.outstanding_amount = parseFloat(res.total_amount) - allocToInvoice;
              }
            }
          } catch (payErr) {
            console.warn('Auto cash settlement error:', payErr);
          }
        }

        setSuccessInvoice(res);
        setShowPreview(false);
        if (onInvoiceCreated) onInvoiceCreated(res);
      }
    } catch (err) {
      console.error('Invoice submit error:', err);
      const msg = err.response?.data?.message || err.response?.data?.detail || (isEditMode ? 'Failed to update invoice.' : 'Failed to create invoice.');
      setError(msg);
      setShowPreview(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl xl:max-w-7xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {showPreview 
                    ? 'Invoice Preview' 
                    : isEditMode 
                      ? `Edit Invoice #${invoiceToEdit?.invoice_number || ''}` 
                      : 'New Invoice'}
                </h2>
                {isEditMode && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-mono border bg-blue-500/10 text-blue-400 border-blue-500/20">
                    EDIT
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {showPreview 
                  ? 'Verify items before issuing' 
                  : isEditMode
                    ? 'Update bill details and items'
                    : 'Direct Wholesale Billing'}
              </p>
            </div>
          </div>

          {/* Active Customer Chip in Modal Header */}
          {selectedCustomerObj ? (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-white truncate max-w-[150px] xl:max-w-[200px]">
                    {selectedCustomerObj.business_name}
                  </span>
                  {selectedCustomerObj.contact_person && (
                    <span className="text-[11px] font-bold text-amber-300 truncate max-w-[140px] flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                      <User className="w-2.5 h-2.5 text-amber-400" />
                      <span>{selectedCustomerObj.contact_person}</span>
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    ({selectedCustomerObj.customer_code || 'OUTLET'})
                  </span>
                </div>
                <span className={`text-[10px] font-mono font-bold ${
                  parseFloat(selectedCustomerObj.outstanding_balance || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  Ledger Due: ₹{parseFloat(selectedCustomerObj.outstanding_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ) : !showPreview && !successInvoice ? (
            <span className="hidden sm:inline-flex text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 animate-pulse">
              ⚠️ Select Customer Below
            </span>
          ) : null}

          <div className="flex items-center gap-2">
            {!showPreview && !successInvoice && IS_VOICE_ENABLED && (
              <button
                type="button"
                onClick={() => setVoiceModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all shadow-sm active:scale-95"
                title="Voice dictation for customer and items"
              >
                <Mic className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="hidden sm:inline">Voice Bill</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── CASE A: INVOICE CREATED SUCCESS SCREEN (Singular CTA Hierarchy) ─── */}
        {successInvoice ? (
          <div className="p-8 sm:p-10 flex flex-col items-center justify-center text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">Document Confirmed</span>
              <h3 className="text-xl font-bold text-white mt-1">
                Invoice #{successInvoice.invoice_number} Generated!
              </h3>
            </div>
            <p className="text-sm text-slate-300">
              Grand Total: <strong className="text-amber-400 font-mono font-bold">₹{parseFloat(successInvoice.total_amount).toFixed(2)}</strong> | Billed to <strong className="text-white">{successInvoice.customer_name}{successInvoice.customer_contact ? ` (${successInvoice.customer_contact})` : (selectedCustomerObj?.contact_person ? ` (${selectedCustomerObj.contact_person})` : '')}</strong>
            </p>
            <p className="text-xs text-slate-400 font-mono">
              Date: {successInvoice.invoice_date} • Terms: {successInvoice.payment_terms || 'Cash on Delivery'}
            </p>

            {/* Action Buttons: Singular Emerald Primary CTA + Subtle Secondary Options */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 w-full max-w-lg">
              {/* PRIMARY CTA: WhatsApp Share */}
              <button
                type="button"
                onClick={() => {
                  const overallBal = (successInvoice?.customer_outstanding_balance !== undefined && successInvoice?.customer_outstanding_balance !== null)
                    ? successInvoice.customer_outstanding_balance
                    : (parseFloat(selectedCustomerObj?.outstanding_balance || 0) + parseFloat(successInvoice?.total_amount || 0));
                  shareInvoiceOnWhatsApp({
                    invoice: {
                      ...successInvoice,
                      customer_outstanding_balance: overallBal
                    },
                    customer: selectedCustomerObj || { business_name: successInvoice.customer_name },
                    items: items,
                    products: products
                  });
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Share WhatsApp & PDF</span>
              </button>

              {/* SECONDARY ACTION: Print PDF */}
              <a
                href={billingApi.getPrintHtmlUrl(successInvoice.id)}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl font-semibold text-xs uppercase tracking-wider transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print PDF</span>
              </a>

              {/* SECONDARY ACTION: Create Another */}
              <button
                onClick={resetForm}
                className="w-full sm:w-auto px-4 py-3 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-xl font-semibold text-xs uppercase tracking-wider transition-colors"
              >
                Create Another
              </button>

              {/* SECONDARY ACTION: Done */}
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-3 text-slate-400 hover:text-white rounded-xl font-semibold text-xs uppercase tracking-wider transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : showPreview ? (
          /* ─── CASE B: LIVE INVOICE PREVIEW BEFORE ISSUING ─── */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
              
              {/* Top Banner inside Preview */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-400">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span className="font-bold">Live Pre-Issue Verification: Direct Cash Pricing (Zero GST)</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Invoice Date & Due Date: <strong className="text-white">{invoiceDate}</strong>
                </span>
              </div>

              {/* Styled Paper Sheet Preview */}
              <div className="bg-white text-gray-900 rounded-xl p-6 shadow-2xl border border-gray-200 text-xs font-sans space-y-5">
                
                {/* Header Row */}
                <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center font-black text-lg text-white">R</div>
                      <div>
                        <h1 className="text-lg font-black tracking-wide text-gray-900">RAIS AGENCIES</h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Frozen Foods & Beverages Wholesale</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1.5">Reddies Colony, Rayachoty - 516269</p>
                    <p className="text-[11px] text-gray-600 font-semibold">Phone: 9347453135 | 9573261696</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-0.5 bg-gray-900 text-white font-bold text-[10px] uppercase tracking-widest rounded mb-1.5">
                      WHOLESALE INVOICE
                    </span>
                    <h2 className="text-sm font-bold font-mono text-gray-700">INV-PREVIEW</h2>
                    <p className="text-[11px] text-gray-500 mt-0.5">Date: <strong className="text-gray-900">{invoiceDate}</strong></p>
                    <p className="text-[11px] text-gray-500">Due Date: <strong className="text-gray-900">{dueDate}</strong></p>
                  </div>
                </div>

                {/* Billed To & Terms */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <h3 className="font-bold text-gray-500 uppercase text-[10px] tracking-wider mb-1">Billed To (Customer):</h3>
                    <p className="text-sm font-bold text-gray-900">{selectedCustomerObj?.business_name || 'Customer'}</p>
                    {selectedCustomerObj?.contact_person && (
                      <p className="text-xs font-bold text-amber-700 flex items-center gap-1 mt-0.5">
                        Attn: {selectedCustomerObj.contact_person}
                      </p>
                    )}
                    <p className="text-gray-600 mt-0.5">{selectedCustomerObj?.address_line1 || 'Rayachoty'}</p>
                    <p className="text-gray-600 mt-0.5 font-semibold">Phone: {selectedCustomerObj?.phone || '-'}</p>
                  </div>
                  <div className="text-right flex flex-col justify-center">
                    <p className="text-gray-500">Customer Code: <strong className="font-mono text-gray-800">{selectedCustomerObj?.customer_code || '-'}</strong></p>
                    <p className="text-gray-500 mt-1">Payment Terms: <strong className="text-emerald-700 font-bold">{paymentTerms}</strong></p>
                    {notes && <p className="text-gray-500 mt-1 italic">Note: {notes}</p>}
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-300 text-[11px] font-bold text-gray-600 uppercase">
                      <th className="py-2 text-center w-8">#</th>
                      <th className="py-2">Item SKU & Description</th>
                      <th className="py-2 text-center">Unit</th>
                      <th className="py-2 text-center">Qty</th>
                      <th className="py-2 text-right">Rate</th>
                      <th className="py-2 text-right">Disc %</th>
                      <th className="py-2 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(items || []).map((itm, idx) => {
                      const prod = (products || []).find(p => p?.id === itm?.product_id);
                      const qty = parseFloat(itm.quantity) || 0;
                      const rate = parseFloat(itm.unit_price) || 0;
                      const disc = parseFloat(itm.discount_rate) || 0;
                      const lineGross = qty * rate;
                      const lineTotal = lineGross - (lineGross * (disc / 100));

                      return (
                        <tr key={idx} className="border-b border-gray-200 text-xs">
                          <td className="py-2 text-center font-mono">{idx + 1}</td>
                          <td className="py-2 font-semibold text-gray-800">
                            {prod?.name || 'Product'} <span className="text-[10px] text-gray-500 font-mono">({prod?.sku})</span>
                          </td>
                          <td className="py-2 text-center text-gray-600">{itm.packaging_unit || prod?.packaging_unit || 'PKT'}</td>
                          <td className="py-2 text-center font-bold font-mono">{qty}</td>
                          <td className="py-2 text-right font-mono">₹{parseFloat(rate || 0).toFixed(2)}</td>
                          <td className="py-2 text-right text-gray-600">{disc}%</td>
                          <td className="py-2 text-right font-bold font-mono text-gray-900">₹{parseFloat(lineTotal || 0).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Summary & Bank Info */}
                <div className="grid grid-cols-12 gap-4 pt-3 border-t-2 border-gray-300">
                  <div className="col-span-7 text-[11px] text-gray-600 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-gray-800 uppercase tracking-wider text-[10px] mb-1">Bank & UPI Settlement:</h4>
                      <p>UPI ID: <strong className="font-mono text-gray-900">9347453135@ybl</strong> (RAIS Agencies)</p>
                      <p className="mt-0.5">Order Support Hotline: <strong className="text-gray-900">9347453135 / 9573261696</strong></p>
                      <p className="mt-1.5 italic text-gray-500">Thank you for partnering with RAIS Agencies!</p>
                    </div>
                  </div>

                  <div className="col-span-5 text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span>₹{totals.subtotal}</span>
                    </div>
                    {parseFloat(totals.discount) > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount:</span>
                        <span>-₹{totals.discount}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-b border-gray-400 py-1.5 font-sans">
                      <span>Grand Total Due:</span>
                      <span className="font-mono text-base text-gray-900 font-black">₹{totals.total}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Edit Form
              </button>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => shareInvoiceOnWhatsApp({
                    invoice: {
                      invoice_number: 'PREVIEW',
                      invoice_date: invoiceDate,
                      created_at: new Date().toISOString(),
                      total_amount: totals.total,
                      payment_terms: paymentTerms
                    },
                    customer: selectedCustomerObj,
                    items: items,
                    products: products
                  })}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">WhatsApp & PDF</span>
                  <span className="sm:hidden">Share & PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors border border-slate-700"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Print Preview</span>
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 uppercase tracking-wider flex items-center gap-2 transition-all transform active:scale-95"
                >
                  {submitting ? 'Generating...' : 'Confirm & Issue Invoice'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ─── CASE C: MAIN INVOICE BUILDER FORM ─── */
          <form onSubmit={handleSubmit} noValidate className="flex-1 flex flex-col overflow-hidden">
            
            {/* ─── PINNED PERSISTENT CUSTOMER & BILL HEADER RIBBON (100% Sticky / Never Scrolls Away) ─── */}
            <div className="bg-slate-950/95 border-b border-slate-800 px-3 sm:px-4 py-1.5 sm:py-2 shrink-0 shadow-lg shadow-black/30 z-10 relative">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 sm:gap-3">
                
                {/* Customer Selector with High-Visibility Context */}
                <div className="flex-1 min-w-[260px]">
                  <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                    <label className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Building2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                      <span>Billed To Customer / Outlet *</span>
                    </label>
                    {selectedCustomerObj ? (
                      /* Redundant on mobile because SearchableCustomerSelect already shows live Due badge inside the pill */
                      <span className={`hidden sm:inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        parseFloat(selectedCustomerObj.outstanding_balance || 0) > 0
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        Current Ledger Due: ₹{parseFloat(selectedCustomerObj.outstanding_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-[9px] sm:text-[10px] font-black uppercase text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30 animate-pulse">
                        ⚠️ Customer Required
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <SearchableCustomerSelect
                      customers={customers}
                      selectedCustomerId={customerId}
                      onSelectCustomer={(id) => handleCustomerChange(id)}
                      required
                      placeholder="-- Click to Search & Select Customer / Outlet * --"
                    />
                  </div>
                </div>

                {/* Date, Due Date & Terms Row - Compact 3-col grid on mobile, flex row on tablet/desktop */}
                <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2 shrink-0">
                  <div className="min-w-0 sm:w-32 shrink-0">
                    <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 truncate">
                      Date
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => handleInvoiceDateChange(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 text-[11px] sm:text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono shadow-inner"
                    />
                  </div>

                  <div className="min-w-0 sm:w-32 shrink-0">
                    <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 truncate">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 text-[11px] sm:text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono shadow-inner"
                    />
                  </div>

                  <div className="min-w-0 sm:w-28 shrink-0">
                    <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 truncate">
                      Terms
                    </label>
                    <select
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 text-[11px] sm:text-xs text-white focus:outline-none focus:border-amber-500 font-medium shadow-inner"
                    >
                      <option value="Cash on Delivery / Immediate Settlement" className="bg-slate-900 text-white">COD</option>
                      <option value="Immediate UPI / Online Settlement" className="bg-slate-900 text-white">UPI</option>
                      <option value="Net 7 Days" className="bg-slate-900 text-white">Net 7d</option>
                      <option value="Net 15 Days" className="bg-slate-900 text-white">Net 15d</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-2 sm:p-3 pb-8 sm:pb-1.5 space-y-1.5 sm:space-y-2 overflow-y-auto flex-1 custom-scrollbar">
              {voiceNotification && (
                <div className="p-2.5 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-300 text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                    <span>{voiceNotification}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVoiceNotification(null)}
                    className="text-amber-400 hover:text-amber-200 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-start">
                {/* ─── LEFT COLUMN: Touch Product Catalogue & Quick Stepper Picker (5 cols) ─── */}
                <div className="lg:col-span-5 flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Catalogue Quick Picker</span>
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Tap + / - to build bill
                    </span>
                  </div>
                  <SmartProductSearchPicker
                    products={products}
                    categories={categories}
                    onSelectProduct={handleQuickAddProduct}
                    onDecrementProduct={handleDecrementProduct}
                    quantitiesByProductId={quantitiesByProductId}
                  />
                </div>

                {/* ─── RIGHT COLUMN: Active Bill Builder & Items (7 cols) ─── */}
                <div className="lg:col-span-7 flex flex-col space-y-2 sm:space-y-2.5 bg-slate-950/40 border border-slate-800/80 rounded-2xl p-2.5 sm:p-3.5 shadow-xl">
                  {/* Clean Line Items Header Bar */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Line Items
                      </h3>
                      <span className="text-[11px] font-mono text-slate-500">
                        ({items.filter(i => Boolean(i.product_id)).length})
                      </span>
                      {selectedCustomerObj && (
                        <span className="hidden sm:inline text-xs font-bold text-amber-400 truncate max-w-[280px]">
                          • {selectedCustomerObj.business_name}
                          {selectedCustomerObj.contact_person ? ` (${selectedCustomerObj.contact_person})` : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!showNotes && !notes && (
                        <button
                          type="button"
                          onClick={() => setShowNotes(true)}
                          className="text-[11px] font-medium text-slate-400 hover:text-amber-400 transition-colors"
                        >
                          + Delivery Note
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={addItemRow}
                        className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/20 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Row</span>
                      </button>
                    </div>
                  </div>

                  {/* Optional Notes Toggle / Row */}
                  {(showNotes || notes) && (
                    <div className="relative animate-in fade-in duration-150">
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Delivery notes, reference number..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-8 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => { setShowNotes(false); setNotes(''); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-bold"
                        title="Remove note"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Line Items Section */}
                  <div>
                    {/* Table Header (Desktop Only) */}
                    <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <div className="col-span-5">Catalogue Product SKU</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Unit Price (₹)</div>
                  <div className="col-span-2 text-center">Disc %</div>
                  <div className="col-span-1 text-right">Action</div>
                </div>

                <div className="space-y-2.5">
                  {(items || []).map((item, index) => {
                    const selProd = (products || []).find(p => p?.id === item?.product_id);
                    const curStock = parseFloat(selProd?.current_stock ?? 0);
                    const qtyVal = parseFloat(item.quantity) || 0;
                    const isExceedingStock = selProd && qtyVal > curStock;
                    const isZeroStock = selProd && curStock <= 0;
                    const isLowStock = selProd && curStock > 0 && curStock <= parseFloat(selProd.min_stock_alert || 10);
                    const lineTotal = (qtyVal * parseFloat(item.unit_price || 0) * (1 - (parseFloat(item.discount_rate || 0) / 100))).toFixed(2);

                    return (
                      <React.Fragment key={index}>
                        {/* ─── DESKTOP TABLE ROW (sm and up) ─── */}
                        <div className="hidden sm:grid grid-cols-12 gap-2 bg-slate-950/70 p-1.5 sm:p-2 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors items-center">
                          <div className="col-span-5">
                            <select
                              value={item.product_id}
                              onChange={(e) => handleProductChange(index, e.target.value)}
                              required
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-amber-500 truncate"
                            >
                              <option value="" className="bg-slate-900 text-slate-400">-- Choose Catalogue SKU --</option>
                              {sortProductsByCleanName(products).map((p) => {
                                const { cleanName, brandName } = formatProductDisplay(p);
                                return (
                                  <option key={p.id} value={p.id} className="bg-slate-900 text-white py-1">
                                    {cleanName}{brandName ? ` (${brandName})` : ''} • {p.packaging_unit || 'PKT'} — ₹{parseFloat(p.base_price).toFixed(2)}
                                  </option>
                                );
                              })}
                            </select>
                            {selProd && (
                              <div className="flex items-center gap-1.5 mt-0.5 px-1 text-[10px] flex-wrap">
                                <span className="font-mono text-slate-500">SKU: {selProd.sku}</span>
                                <span className="text-slate-600">•</span>
                                {isZeroStock ? (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                    Out of Stock (0 {selProd.packaging_unit})
                                  </span>
                                ) : isLowStock ? (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    Low Stock: {curStock} {selProd.packaging_unit}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                    In Stock: {curStock} {selProd.packaging_unit}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="col-span-2">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleAdjustQuantity(index, -1)}
                                className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 active:scale-95 border border-slate-700"
                                title="Decrease quantity"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min="0.1"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => handleItemFieldChange(index, 'quantity', e.target.value)}
                                placeholder="Qty"
                                required
                                className={`w-full min-w-[32px] bg-slate-900 border rounded-md py-1 text-xs text-center font-bold font-mono focus:outline-none ${
                                  isExceedingStock
                                    ? 'border-rose-500/80 text-rose-400 focus:border-rose-400'
                                    : 'border-slate-800 text-amber-400 focus:border-amber-500'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => handleAdjustQuantity(index, 1)}
                                className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 active:scale-95 border border-slate-700"
                                title="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            {isExceedingStock && (
                              <div className="mt-0.5 px-1 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[9px] font-black text-center flex items-center justify-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                <span>Exceeds Stock ({curStock} avail)</span>
                              </div>
                            )}
                          </div>

                          <div className="col-span-2">
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-xs text-slate-500 font-mono">₹</span>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={item.unit_price}
                                onChange={(e) => handleItemFieldChange(index, 'unit_price', e.target.value)}
                                placeholder="0"
                                required
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-5 pr-2 py-1.5 text-xs text-right font-mono font-bold text-slate-200 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>

                          <div className="col-span-2">
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={item.discount_rate}
                                onChange={(e) => handleItemFieldChange(index, 'discount_rate', e.target.value)}
                                placeholder="0"
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-center font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                              />
                              <span className="absolute right-2 top-1.5 text-[10px] text-slate-500 pointer-events-none">%</span>
                            </div>
                          </div>

                          <div className="col-span-1 flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => removeItemRow(index)}
                              disabled={items.length === 1}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg disabled:opacity-20 disabled:pointer-events-none transition-colors"
                              title="Delete Line Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* ─── MOBILE CARD ROW (< sm) ─── */}
                        <div className="sm:hidden bg-slate-950/85 p-3 rounded-xl border border-slate-800 space-y-2.5 shadow-sm">
                          {/* Row 1: Product Dropdown + Delete */}
                          <div className="flex items-center gap-2">
                            <select
                              value={item.product_id}
                              onChange={(e) => handleProductChange(index, e.target.value)}
                              required
                              className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white font-medium focus:outline-none focus:border-amber-500 truncate"
                            >
                              <option value="" className="bg-slate-900 text-slate-400">-- Choose Catalogue SKU --</option>
                              {sortProductsByCleanName(products).map((p) => {
                                const { cleanName, brandName } = formatProductDisplay(p);
                                return (
                                  <option key={p.id} value={p.id} className="bg-slate-900 text-white py-1">
                                    {cleanName}{brandName ? ` (${brandName})` : ''} • {p.packaging_unit || 'PKT'} — ₹{parseFloat(p.base_price).toFixed(2)}
                                  </option>
                                );
                              })}
                            </select>
                            <button
                              type="button"
                              onClick={() => removeItemRow(index)}
                              disabled={items.length === 1}
                              className="p-2 text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-20 disabled:pointer-events-none transition-colors shrink-0"
                              title="Delete Line Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Row 2: SKU & Stock Info */}
                          {selProd && (
                            <div className="flex items-center justify-between text-[10px] px-1">
                              <span className="font-mono text-slate-400 truncate max-w-[160px]">SKU: {selProd.sku}</span>
                              {isZeroStock ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                  Out of Stock (0 {selProd.packaging_unit})
                                </span>
                              ) : isLowStock ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  Low Stock: {curStock} {selProd.packaging_unit}
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                  In Stock: {curStock} {selProd.packaging_unit}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Row 3: Touch Stepper, Unit Price, Disc %, and Line Total */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                            {/* Stepper */}
                            <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleAdjustQuantity(index, -1)}
                                className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white active:scale-90"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min="0.1"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => handleItemFieldChange(index, 'quantity', e.target.value)}
                                className={`w-9 text-center text-xs font-mono font-bold bg-transparent focus:outline-none ${
                                  isExceedingStock ? 'text-rose-400' : 'text-amber-400'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => handleAdjustQuantity(index, 1)}
                                className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white active:scale-90"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Unit Price */}
                            <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 px-2 py-1 shrink-0">
                              <span className="text-[11px] text-slate-500 font-mono mr-1">₹</span>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={item.unit_price}
                                onChange={(e) => handleItemFieldChange(index, 'unit_price', e.target.value)}
                                className="w-14 text-xs font-mono font-bold text-slate-200 bg-transparent focus:outline-none"
                              />
                            </div>

                            {/* Disc % */}
                            <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 px-1.5 py-1 shrink-0">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={item.discount_rate}
                                onChange={(e) => handleItemFieldChange(index, 'discount_rate', e.target.value)}
                                className="w-8 text-xs font-mono text-center text-slate-200 bg-transparent focus:outline-none"
                              />
                              <span className="text-[10px] text-slate-500">%</span>
                            </div>

                            {/* Line Total */}
                            <div className="text-right shrink-0">
                              <span className="text-[9px] uppercase text-slate-500 block font-semibold">Total</span>
                              <span className="text-xs font-mono font-bold text-emerald-400">₹{lineTotal}</span>
                            </div>
                          </div>

                          {isExceedingStock && (
                            <div className="px-2 py-1 rounded bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-bold flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>Exceeds stock ({curStock} {selProd?.packaging_unit || 'PKT'} avail)</span>
                            </div>
                          )}
                        </div>

                        {/* ─── DISAMBIGUATION VARIANT CHIPS ─── */}
                        {item.isAmbiguous && item.alternatives && item.alternatives.length > 0 && (
                          <div className="p-2.5 sm:p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-wrap items-center gap-2 animate-in fade-in duration-200">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 shrink-0">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>Multiple matches:</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                              {item.alternatives.map((alt) => {
                                const { cleanName, brandName } = formatProductDisplay(alt);
                                return (
                                  <button
                                    key={alt.id}
                                    type="button"
                                    onClick={() => handleResolveDisambiguation(index, alt)}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-amber-500/30 transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-sm"
                                    title={`Switch to ${alt.name} (₹${parseFloat(alt.base_price || 0).toFixed(2)})`}
                                  >
                                    <span>{cleanName}{brandName ? ` (${brandName})` : ''}</span>
                                    <span className="font-mono text-[10px] opacity-80">₹{parseFloat(alt.base_price || 0).toFixed(2)}</span>
                                  </button>
                                );
                              })}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDismissDisambiguation(index)}
                              className="text-[10px] font-medium text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-900/60 hover:bg-slate-800 border border-slate-700/50 transition-colors shrink-0 ml-auto"
                            >
                              Keep current ✓
                            </button>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* ─── COUNTER COLLECTION & SETTLEMENT CONTROLS ─── */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 sm:p-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  {/* Bill-Level Cash Discount (₹) */}
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Cash Discount (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs text-slate-500 font-mono">₹</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={invoiceDiscount}
                        onChange={(e) => setInvoiceDiscount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-6 pr-2 py-1.5 text-xs font-mono font-bold text-slate-200 focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Counter Amount Received Now (₹) */}
                  <div className="sm:col-span-7">
                    <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        Received Now (₹)
                      </label>
                      {/* Quick Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => { setCollectedAmount(''); setMarkAsPaid(false); }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all active:scale-95 shadow-sm cursor-pointer ${
                            (!collectedAmount || parseFloat(collectedAmount) === 0) && !markAsPaid
                              ? 'bg-slate-700 text-white border-slate-500 ring-1 ring-slate-400/50'
                              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700/80'
                          }`}
                        >
                          Credit (₹0)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCollectedAmount(String(parseFloat(totals.total)));
                            setMarkAsPaid(true);
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all active:scale-95 shadow-sm cursor-pointer ${
                            parseFloat(collectedAmount) === parseFloat(totals.total)
                              ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/70 ring-1 ring-emerald-500/50 font-black'
                              : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 border-emerald-800/60'
                          }`}
                        >
                          Exact (₹{parseFloat(totals.total).toFixed(0)})
                        </button>
                        {custLedgerDue > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const fullClear = (parseFloat(totals.total) + custLedgerDue).toFixed(2);
                              setCollectedAmount(String(fullClear));
                              setMarkAsPaid(true);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all active:scale-95 shadow-sm cursor-pointer ${
                              parseFloat(collectedAmount) === (parseFloat(totals.total) + custLedgerDue)
                                ? 'bg-amber-500/25 text-amber-200 border-amber-500/70 ring-1 ring-amber-500/50 font-black'
                                : 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-400 border-amber-800/60'
                            }`}
                            title={`Pay current bill (₹${totals.total}) + past balance (₹${custLedgerDue.toFixed(2)})`}
                          >
                            Bill + Past Due (₹{(parseFloat(totals.total) + custLedgerDue).toFixed(0)})
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs text-emerald-500 font-mono font-bold">₹</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={collectedAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCollectedAmount(val);
                          const num = parseFloat(val) || 0;
                          if (num >= parseFloat(totals.total) && parseFloat(totals.total) > 0) {
                            setMarkAsPaid(true);
                          } else if (num < parseFloat(totals.total)) {
                            setMarkAsPaid(false);
                          }
                        }}
                        placeholder={`Enter cash/UPI received (e.g. ${totals.total})`}
                        className="w-full bg-slate-900 border border-emerald-500/40 rounded-lg pl-6 pr-2 py-1.5 text-xs font-mono font-black text-emerald-300 focus:outline-none focus:border-emerald-400 transition-colors shadow-inner placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Checkbox Options */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="autoIssue"
                      checked={autoIssue}
                      onChange={(e) => setAutoIssue(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold text-slate-300">
                      Issue Immediately
                    </span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none" title="Immediately records cash settlement into ledger and zeroes invoice balance">
                    <input
                      type="checkbox"
                      id="markAsPaid"
                      checked={markAsPaid}
                      onChange={(e) => {
                        const chk = e.target.checked;
                        setMarkAsPaid(chk);
                        if (chk && (!collectedAmount || parseFloat(collectedAmount) < parseFloat(totals.total))) {
                          setCollectedAmount(String(parseFloat(totals.total)));
                        } else if (!chk && parseFloat(collectedAmount) === parseFloat(totals.total)) {
                          setCollectedAmount('');
                        }
                      }}
                      className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-emerald-400">
                      Paid in Full (Cash)
                    </span>
                  </label>
                </div>

                {/* Live Counter Collection Breakdown Ribbon */}
                {numCollected > 0 && (
                  <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs font-medium space-y-1 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] flex-wrap gap-1">
                      <span className="text-slate-300">
                        Received: <strong className="text-white font-mono">₹{numCollected.toFixed(2)}</strong>
                      </span>
                      <span className={`font-bold font-mono px-1.5 py-0.2 rounded text-[10px] ${
                        numCollected >= billTotal
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {numCollected >= billTotal ? '✓ INVOICE SETTLED IN FULL' : `PARTIAL (₹${remainingBillDue.toFixed(2)} REMAINING)`}
                      </span>
                    </div>

                    {surplusAmount > 0 && (
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-500/20 text-emerald-300">
                        <span>
                          Surplus Applied to Past Dues (FIFO):
                        </span>
                        <strong className="font-mono">
                          +₹{appliedToPastDues.toFixed(2)}
                        </strong>
                      </div>
                    )}

                    {selectedCustomerObj && (
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-500/20">
                        <span className="text-slate-400 font-medium">
                          Updated Ledger Due:
                        </span>
                        <div className="text-right font-mono font-bold">
                          <span className={projectedLedgerDue > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                            ₹{projectedLedgerDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          {custLedgerDue > 0 && (
                            <span className="text-[10px] text-slate-500 ml-1 font-normal">
                              (was ₹{custLedgerDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Over-Stock Warning Alert */}
              {overStockItems.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-amber-300 text-xs">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold">Notice: </span>
                      <span>{overStockItems.length} billed item(s) exceed current stock.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Excessive Discount Alert */}
              {parseFloat(totals.discount) > parseFloat(totals.subtotal) && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-400 text-xs font-bold animate-in fade-in duration-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>Total discount (₹{totals.discount}) exceeds subtotal (₹{totals.subtotal}). Excessive discounts resulting in negative balances are strictly prohibited.</span>
                </div>
              )}

              {/* Totals Summary Card */}
              <div className="p-2 sm:p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center justify-between gap-2.5 shadow-lg">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Calculator className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="text-slate-200 font-semibold text-xs">Invoice Summary</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 font-mono text-xs">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-sans">Subtotal</span>
                    <span className="text-slate-300 font-bold text-xs sm:text-sm">₹{totals.subtotal}</span>
                  </div>
                  {parseFloat(totals.discount) > 0 && (
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-sans">Total Discount</span>
                      <span className={`font-bold text-xs sm:text-sm ${parseFloat(totals.discount) > parseFloat(totals.subtotal) ? 'text-rose-400' : 'text-emerald-400'}`}>
                        -₹{totals.discount}
                      </span>
                    </div>
                  )}
                  <div className="text-right pl-3 border-l border-slate-800">
                    {effectivePaid >= billTotal && billTotal > 0 ? (
                      <div>
                        <span className="text-emerald-400 block text-[9px] uppercase font-bold font-sans">
                          Paid in Full (₹0 Due)
                        </span>
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-emerald-400 font-black text-base sm:text-lg">₹{totals.total}</span>
                          <span className="text-[9px] font-sans font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                            ✓ SETTLED
                          </span>
                        </div>
                      </div>
                    ) : effectivePaid > 0 && effectivePaid < billTotal ? (
                      <div>
                        <span className="text-amber-400 block text-[9px] uppercase font-bold font-sans">
                          Remaining Bill Due
                        </span>
                        <span className="text-amber-400 font-black text-base sm:text-lg">
                          ₹{remainingBillDue.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-amber-400 block text-[9px] uppercase font-bold font-sans">
                          Grand Total Due
                        </span>
                        <span className="text-amber-400 font-black text-base sm:text-lg">
                          ₹{totals.total}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Closes lg:col-span-7 */}
          </div>
          {/* Closes grid-cols-12 */}
        </div>
        {/* Closes scrollable container */}

            {/* Footer Actions */}
            <div className="p-2.5 sm:p-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
              <span className="hidden sm:inline-block text-[11px] text-slate-500 font-mono">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">Esc</kbd> to exit
              </span>
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors shrink-0"
                >
                  Cancel
                </button>

                {/* Preview Button */}
                <button
                  type="button"
                  onClick={handleOpenPreview}
                  disabled={parseFloat(totals.discount) > parseFloat(totals.subtotal)}
                  className="px-3 sm:px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 font-bold text-xs rounded-xl uppercase tracking-wider flex items-center gap-1.5 transition-all hover:scale-105 shrink-0 shadow-sm disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] sm:text-xs">Preview</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting || parseFloat(totals.discount) > parseFloat(totals.subtotal)}
                  className="flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 uppercase tracking-wider flex items-center justify-center gap-1.5 sm:gap-2 transition-all transform active:scale-95 truncate disabled:opacity-40 disabled:pointer-events-none"
                >
                  {submitting 
                    ? (isEditMode ? 'Updating...' : 'Generating...') 
                    : isEditMode 
                      ? `Update Invoice` 
                      : numCollected > 0
                        ? `Issue & Collect ₹${numCollected.toFixed(0)}`
                        : autoIssue ? 'Issue Invoice' : 'Save Draft'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Voice Dictation Modal */}
      <VoiceDictationModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        mode="INVOICE"
        customers={customers}
        products={products}
        onApplyParsedData={handleApplyVoiceData}
      />

      {/* Voice Items Append vs Replace Conflict Modal */}
      {voiceConflictPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Apply Voice Items</h4>
                <p className="text-xs text-slate-400">
                  This bill already has {items.filter(i => Boolean(i.product_id)).length} line item(s).
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You spoke <strong className="text-amber-400 font-bold">{voiceConflictPrompt.pendingData.items?.length || 0} new item(s)</strong>. How would you like to stage them onto this invoice?
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  applyStagedVoiceData(voiceConflictPrompt.pendingData, 'APPEND');
                  setVoiceConflictPrompt(null);
                }}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                Append to Existing
              </button>
              <button
                type="button"
                onClick={() => {
                  applyStagedVoiceData(voiceConflictPrompt.pendingData, 'REPLACE');
                  setVoiceConflictPrompt(null);
                }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md active:scale-95"
              >
                Replace All Items
              </button>
            </div>
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setVoiceConflictPrompt(null)}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
