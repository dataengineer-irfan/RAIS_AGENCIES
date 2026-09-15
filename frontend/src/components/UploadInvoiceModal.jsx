import React, { useState, useEffect } from 'react';
import { 
  FileUp, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Package, 
  Sparkles, 
  Trash2, 
  Plus, 
  ArrowRight,
  Boxes,
  FileText,
  Loader2,
  HelpCircle,
  FolderPlus,
  RefreshCw,
  Search
} from 'lucide-react';
import { inventoryApi, catalogueApi } from '../services/api';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

// Pre-configured Jubilee Enterprises sample invoice for optional demo testing
const JUBILEE_SAMPLE_ITEMS = [
  {
    supplierItem: 'Hup Hup French Fries 6mm (62.50 KGS)',
    sku: 'RAIS-VEG-02',
    invoicedQty: 62.50,
    unitDescription: '2.5 KG / Packet',
    packRatio: 2.5,
    packets: 25,
    purchaseCost: 190.48,
    batchNumber: 'JE-AUG26-01'
  },
  {
    supplierItem: 'Milky Mist Mozzarella Diced Cheese (10.00 KGS)',
    sku: 'RAIS-CHS-01',
    invoicedQty: 10.00,
    unitDescription: '2.0 KG / Packet',
    packRatio: 2.0,
    packets: 5,
    purchaseCost: 650.00,
    batchNumber: 'JE-AUG26-02'
  },
  {
    supplierItem: 'T.C Chicken Momos 500g (30 NOS)',
    sku: 'RAIS-CHK-04',
    invoicedQty: 30.00,
    unitDescription: '1 Packet',
    packRatio: 1.0,
    packets: 30,
    purchaseCost: 110.00,
    batchNumber: 'JE-AUG26-03'
  },
  {
    supplierItem: 'TC Mix Veg Momos 500g (10 NOS)',
    sku: 'RAIS-VEG-03',
    invoicedQty: 10.00,
    unitDescription: '1 Packet',
    packRatio: 1.0,
    packets: 10,
    purchaseCost: 95.00,
    batchNumber: 'JE-AUG26-04'
  },
  {
    supplierItem: 'ITC Chicken Nuggets 1kg (2.00 KGS)',
    sku: 'RAIS-CHK-05',
    invoicedQty: 2.00,
    unitDescription: '1 KG / Packet',
    packRatio: 1.0,
    packets: 2,
    purchaseCost: 245.00,
    batchNumber: 'JE-AUG26-05'
  },
  {
    supplierItem: 'ITC Cheesy Corn Triangles 1kg (2.00 KGS)',
    sku: 'RAIS-VEG-07',
    invoicedQty: 2.00,
    unitDescription: '1 KG / Packet',
    packRatio: 1.0,
    packets: 2,
    purchaseCost: 220.00,
    batchNumber: 'JE-AUG26-06'
  },
  {
    supplierItem: 'Signature Tortilla 8.5" (480 NOS)',
    sku: 'RAIS-CHK-02',
    invoicedQty: 480.00,
    unitDescription: '10 Nos / Packet',
    packRatio: 10.0,
    packets: 48,
    purchaseCost: 62.00,
    batchNumber: 'JE-AUG26-07'
  },
  {
    supplierItem: 'Signature Tortilla 10" (240 NOS)',
    sku: 'RAIS-CHK-01',
    invoicedQty: 240.00,
    unitDescription: '10 Nos / Packet',
    packRatio: 10.0,
    packets: 24,
    purchaseCost: 58.00,
    batchNumber: 'JE-AUG26-08'
  },
  {
    supplierItem: 'Milky Mist Cheese Slice 765g (2 NOS)',
    sku: 'RAIS-CHS-03',
    invoicedQty: 2.00,
    unitDescription: '765g Packet',
    packRatio: 1.0,
    packets: 2,
    purchaseCost: 310.00,
    batchNumber: 'JE-AUG26-09'
  }
];

export const UploadInvoiceModal = ({ 
  isOpen, 
  onClose, 
  products = [], 
  onSuccess,
  onProductAdded 
}) => {
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [categories, setCategories] = useState([]);

  // Quick Add to Catalogue dialog state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddItemIndex, setQuickAddItemIndex] = useState(null);
  const [quickAddForm, setQuickAddForm] = useState({
    name: '',
    category_id: '',
    sku: '',
    brand: '',
    packaging_unit: '1 Packet',
    unit_quantity: 1,
    purchase_cost: 0,
    base_price: 0,
    tax_rate: 5,
    hsn_code: '21069099',
    description: ''
  });
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  // Freeze background body scroll on mobile
  useBodyScrollLock(isOpen || quickAddOpen);

  // Load categories once when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCategories();
      // Reset state if clean open
      if (items.length === 0 && !uploadedFileName) {
        setSupplierName('');
        setInvoiceNumber('');
        setInvoiceDate(new Date().toISOString().slice(0, 10));
        setError('');
        setSuccessMsg('');
      }
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const cats = await catalogueApi.listCategories(true);
      setCategories(cats || []);
    } catch (e) {
      console.warn('Could not load categories:', e);
    }
  };

  const loadJubileeSample = () => {
    setSupplierName('JUBILEE ENTERPRISES');
    setInvoiceNumber('JE/12212/26-27');
    setInvoiceDate('2026-08-31');
    setUploadedFileName('Tax_Invoice_JE_12212_26_27.pdf');
    setError('');
    setSuccessMsg('Loaded sample Jubilee Enterprises invoice.');

    const mapped = JUBILEE_SAMPLE_ITEMS.map((sample, idx) => {
      const matchedProd = products.find(p => p.sku === sample.sku) || products.find(p => p.sku?.includes(sample.sku));
      return {
        id: idx + 1,
        supplier_item: sample.supplierItem,
        productId: matchedProd ? matchedProd.product_id : '',
        sku: sample.sku,
        productName: matchedProd ? matchedProd.name : sample.supplierItem,
        invoiced_qty: sample.invoicedQty,
        unit_description: sample.unitDescription,
        pack_ratio: sample.packRatio,
        packets: sample.packets,
        purchase_cost: sample.purchaseCost,
        batch_number: sample.batchNumber,
        is_matched: Boolean(matchedProd),
        confidence: matchedProd ? 98 : 0,
        suggested_category_code: 'VEG',
        suggested_sku: sample.sku
      };
    });
    setItems(mapped);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setParsing(true);
    setError('');
    setSuccessMsg('');

    try {
      const parsed = await inventoryApi.parseSupplierInvoice(file);
      setSupplierName(parsed.supplier_name || 'SUPPLIER');
      setInvoiceNumber(parsed.invoice_number || `INW-${Date.now().toString().slice(-6)}`);
      setInvoiceDate(parsed.invoice_date || new Date().toISOString().slice(0, 10));
      
      const parsedItems = (parsed.items || []).map(it => ({
        ...it,
        productId: it.product_id || '',
        productName: it.product_name || ''
      }));

      setItems(parsedItems);

      if (parsedItems.length === 0) {
        setError('No line items could be detected in this invoice file. You can add items manually using the "+ Add Item" button below.');
      } else {
        const newCount = parsed.new_items_count || 0;
        if (newCount > 0) {
          setSuccessMsg(`Detected ${parsedItems.length} items! ${newCount} item(s) are new and not yet in your catalogue — you can link or add them below.`);
        } else {
          setSuccessMsg(`Successfully parsed ${parsedItems.length} items. All mapped to existing depot SKUs!`);
        }
      }
    } catch (err) {
      console.error('Invoice parsing failed:', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to parse invoice. You can enter items manually below.');
    } finally {
      setParsing(false);
      // Reset input value so same file can be re-selected if needed
      e.target.value = '';
    }
  };

  const handleUpdateItem = (idx, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[idx], [field]: value };
      
      if (field === 'productId') {
        const prod = products.find(p => p.product_id === value || p.id === value);
        if (prod) {
          item.sku = prod.sku;
          item.productName = prod.name;
          item.is_matched = true;
        } else {
          item.sku = '';
          item.productName = '';
          item.is_matched = false;
        }
      }

      if (field === 'packets' || field === 'purchase_cost') {
        item[field] = parseFloat(value) || 0;
      }

      updated[idx] = item;
      return updated;
    });
  };

  const handleRemoveItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddItem = () => {
    const firstProd = products[0];
    setItems(prev => [
      ...prev,
      {
        id: Date.now(),
        supplier_item: 'Custom Inward Item',
        productId: firstProd ? (firstProd.product_id || firstProd.id) : '',
        sku: firstProd ? firstProd.sku : '',
        productName: firstProd ? firstProd.name : '',
        invoiced_qty: 10,
        unit_description: '1 Packet',
        pack_ratio: 1,
        packets: 10,
        purchase_cost: 100,
        batch_number: 'LOT-' + Date.now().toString().slice(-4),
        is_matched: Boolean(firstProd),
        confidence: firstProd ? 100 : 0
      }
    ]);
  };

  // ─── QUICK ADD NEW PRODUCT TO CATALOGUE MODAL ───
  const handleOpenQuickAdd = (idx) => {
    const item = items[idx];
    if (!item) return;

    // Find category id by code
    const matchingCat = categories.find(c => c.code === item.suggested_category_code) || categories[0];

    setQuickAddItemIndex(idx);
    setQuickAddForm({
      name: item.supplier_item,
      category_id: matchingCat ? matchingCat.id : (categories[0]?.id || ''),
      sku: item.suggested_sku || `RAIS-NEW-${Date.now().toString().slice(-2)}`,
      brand: supplierName.split(' ')[0] || 'RAIS',
      packaging_unit: item.unit_description || '1 Packet',
      unit_quantity: item.pack_ratio || 1,
      purchase_cost: item.purchase_cost || 0,
      base_price: item.suggested_base_price || roundNumber(item.purchase_cost * 1.25, 2),
      tax_rate: 5,
      hsn_code: '21069099',
      description: `Wholesale cold-chain product inwarded from ${supplierName || 'supplier'}`
    });
    setQuickAddOpen(true);
  };

  const roundNumber = (num, decimals = 2) => {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  };

  const handleSaveNewProduct = async (e) => {
    e.preventDefault();
    setQuickAddLoading(true);
    setError('');

    try {
      const payload = {
        name: quickAddForm.name.trim(),
        category_id: quickAddForm.category_id,
        sku: quickAddForm.sku.trim().toUpperCase(),
        brand: quickAddForm.brand.trim(),
        packaging_unit: quickAddForm.packaging_unit.trim(),
        unit_quantity: parseFloat(quickAddForm.unit_quantity) || 1,
        base_price: parseFloat(quickAddForm.base_price) || 0,
        tax_rate: parseFloat(quickAddForm.tax_rate) || 5,
        hsn_code: quickAddForm.hsn_code.trim(),
        description: quickAddForm.description.trim(),
        current_stock: 0,
        min_stock_alert: 5,
        is_active: true
      };

      const created = await catalogueApi.createProduct(payload);

      // Notify parent to append product to global products list
      if (onProductAdded) {
        onProductAdded(created);
      }

      // Update the current invoice line item to point to the newly created product
      if (quickAddItemIndex !== null && items[quickAddItemIndex]) {
        setItems(prev => {
          const updated = [...prev];
          updated[quickAddItemIndex] = {
            ...updated[quickAddItemIndex],
            productId: created.id,
            sku: created.sku,
            productName: created.name,
            is_matched: true,
            confidence: 100,
            purchase_cost: parseFloat(quickAddForm.purchase_cost) || updated[quickAddItemIndex].purchase_cost
          };
          return updated;
        });
      }

      setSuccessMsg(`Added "${created.name}" (${created.sku}) to catalogue & linked to this invoice!`);
      setQuickAddOpen(false);
      setQuickAddItemIndex(null);
    } catch (err) {
      console.error('Failed to create new product in catalogue', err);
      setError(err?.response?.data?.detail || 'Failed to create product in catalogue.');
    } finally {
      setQuickAddLoading(false);
    }
  };

  const totalPackets = items.reduce((sum, it) => sum + (parseFloat(it.packets) || 0), 0);
  const totalInwardValue = items.reduce((sum, it) => sum + ((parseFloat(it.packets) || 0) * (parseFloat(it.purchase_cost) || 0)), 0);

  const handleConfirmInward = async () => {
    if (items.length === 0) {
      setError('Please add or parse at least one line item to inward.');
      return;
    }

    // Validate all have productId
    const unmapped = items.find(i => !i.productId);
    if (unmapped) {
      setError(`'${unmapped.supplier_item}' is not mapped to any catalogue SKU. Please click "+ Add to Catalogue" or select an existing product.`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        supplier: supplierName.trim() || 'SUPPLIER',
        notes: `Supplier Invoice: ${invoiceNumber} dated ${invoiceDate} • File: ${uploadedFileName || 'Digital Inward'}`,
        items: items.map(it => ({
          product_id: it.productId,
          quantity: parseFloat(it.packets),
          purchase_cost: parseFloat(it.purchase_cost),
          supplier: supplierName.trim() || 'SUPPLIER',
          batch_number: it.batch_number || null,
          notes: `Inward from ${invoiceNumber} (${it.supplier_item})`
        }))
      };

      await inventoryApi.batchReceiveStock(payload);
      setSuccessMsg(`Stock received successfully! ${totalPackets} packets added to depot inventory.`);
      
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 900);
    } catch (err) {
      console.error('Failed to batch receive supplier invoice', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to receive stock from invoice.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = () => {
    setSupplierName('');
    setInvoiceNumber('');
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setUploadedFileName('');
    setItems([]);
    setError('');
    setSuccessMsg('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Upload Supplier Purchase Invoice
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Smart OCR & SKU Matcher
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Upload any PDF, Image or CSV invoice. Our AI detects items, matches existing catalogue SKUs, and lets you add new products instantly.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Upload Dropzone Strip */}
          <div className="bg-slate-950/80 border-2 border-dashed border-slate-700 hover:border-amber-500/60 transition-all rounded-2xl p-4 sm:p-5 text-center">
            {parsing ? (
              <div className="py-4 flex flex-col items-center justify-center gap-2 text-amber-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="font-bold text-sm">Analyzing invoice with Smart OCR & Catalogue Matcher...</span>
                <span className="text-xs text-slate-400">Detecting vendor details, pack conversions, and matching SKUs in DB</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {uploadedFileName ? `Current File: ${uploadedFileName}` : 'Select or Drop Supplier Invoice File'}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Supports PDF, CSV, TXT, or scanned supplier bills (Amul, Milky Mist, ITC, McCain, Jubilee, Del Monte)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-amber-500/20 transition-all">
                    <FileUp className="w-4 h-4" />
                    <span>{uploadedFileName ? 'Choose Different File' : 'Browse Invoice File'}</span>
                    <input
                      type="file"
                      accept=".pdf,.csv,.txt,.png,.jpg,.jpeg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                      title="Clear and start new upload"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Supplier Info Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Supplier / Vendor
              </label>
              <input
                type="text"
                placeholder="e.g. AMUL / MILKY MIST / JUBILEE"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                placeholder="e.g. INV/2026/001"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Quick Demo Pre-load & Add Action Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadJubileeSample}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Load Sample Jubilee Invoice (Demo)</span>
              </button>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Test with pre-configured 9-item bill
              </span>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Add Manual Row</span>
            </button>
          </div>

          {/* Line Items Table with Matching Status */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/70">
            {items.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <Boxes className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-xs font-bold">No invoice items loaded yet</p>
                <p className="text-[11px] text-slate-500">Upload a supplier bill above or load sample demo</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3">Supplier Item</th>
                      <th className="py-2.5 px-3">Catalogue SKU Match</th>
                      <th className="py-2.5 px-3 text-center">Billed Qty</th>
                      <th className="py-2.5 px-3 text-center">Pack Spec</th>
                      <th className="py-2.5 px-3 text-center">Inward Packs *</th>
                      <th className="py-2.5 px-3 text-right">Cost / Pack (₹) *</th>
                      <th className="py-2.5 px-3 text-right">Line Total (₹)</th>
                      <th className="py-2.5 px-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 font-mono">
                    {items.map((item, idx) => {
                      const lineTotal = (parseFloat(item?.packets || 0)) * (parseFloat(item?.purchase_cost || 0));
                      const isMatched = Boolean(item.is_matched && item.productId);

                      return (
                        <tr key={item?.id || idx} className={`hover:bg-slate-900/30 ${!isMatched ? 'bg-amber-500/5' : ''}`}>
                          {/* Supplier Item */}
                          <td className="py-2.5 px-3 font-sans">
                            <input
                              type="text"
                              value={item.supplier_item || ''}
                              onChange={(e) => handleUpdateItem(idx, 'supplier_item', e.target.value)}
                              className="font-bold text-white text-xs bg-transparent border-b border-transparent hover:border-slate-700 focus:border-amber-500 focus:bg-slate-900 px-1 py-0.5 rounded w-full"
                            />
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>Lot: {item.batch_number || 'LOT-AUTO'}</span>
                            </div>
                          </td>

                          {/* Catalogue SKU Match */}
                          <td className="py-2.5 px-3 font-sans">
                            {isMatched ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Matched: [{item.sku}]
                                  </span>
                                </div>
                                <select
                                  value={item.productId || ''}
                                  onChange={(e) => handleUpdateItem(idx, 'productId', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 text-amber-300 text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500 truncate"
                                >
                                  {(products || []).map(p => (
                                    <option key={p.product_id || p.id} value={p.product_id || p.id}>
                                      {p.sku} • {p.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    New Item Not In Catalogue
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenQuickAdd(idx)}
                                    className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] rounded-lg shadow transition-all flex items-center gap-1 shrink-0"
                                  >
                                    <FolderPlus className="w-3 h-3" />
                                    <span>+ Add to Catalogue</span>
                                  </button>

                                  <select
                                    value={item.productId || ''}
                                    onChange={(e) => handleUpdateItem(idx, 'productId', e.target.value)}
                                    className="bg-slate-900 border border-slate-700 text-slate-300 text-[11px] rounded-lg px-1.5 py-1 focus:outline-none focus:border-amber-500 max-w-[140px] truncate"
                                  >
                                    <option value="">Link Existing...</option>
                                    {(products || []).map(p => (
                                      <option key={p.product_id || p.id} value={p.product_id || p.id}>
                                        {p.sku} • {p.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Invoiced Qty */}
                          <td className="py-2.5 px-3 text-center text-slate-300">
                            {item?.invoiced_qty ?? 0}
                          </td>

                          {/* Pack Spec */}
                          <td className="py-2.5 px-3 text-center text-slate-400 text-[11px] font-sans">
                            {item?.unit_description || '1 Pack'}
                          </td>

                          {/* Inward Packs */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              step="1"
                              min="1"
                              value={item?.packets ?? ''}
                              onChange={(e) => handleUpdateItem(idx, 'packets', e.target.value)}
                              className="w-16 px-2 py-1 bg-slate-900 border border-amber-500/40 rounded-lg text-amber-400 font-bold text-center focus:outline-none focus:border-amber-400 font-mono"
                            />
                          </td>

                          {/* Cost per pack */}
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={item?.purchase_cost ?? ''}
                              onChange={(e) => handleUpdateItem(idx, 'purchase_cost', e.target.value)}
                              className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 font-bold text-right focus:outline-none focus:border-emerald-400 font-mono"
                            />
                          </td>

                          {/* Line Total */}
                          <td className="py-2.5 px-3 text-right font-bold text-white">
                            ₹{parseFloat(lineTotal || 0).toFixed(2)}
                          </td>

                          {/* Remove */}
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary Strip */}
          {items.length > 0 && (
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Items</span>
                  <span className="font-mono font-bold text-white text-sm">{items.length} Lines</span>
                </div>
                <div className="border-l border-slate-800 pl-4">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Packets to Inward</span>
                  <span className="font-mono font-black text-amber-400 text-base">{totalPackets} Packs</span>
                </div>
                <div className="border-l border-slate-800 pl-4">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Inward Purchase Cost</span>
                  <span className="font-mono font-black text-emerald-400 text-base">
                    ₹{totalInwardValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <span className="text-[11px] text-slate-400">
                Inward Depot: <strong className="text-white">Rayachoty Cold-Chain Depot</strong>
              </span>
            </div>
          )}

        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading || parsing}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmInward}
            disabled={loading || parsing || items.length === 0}
            className="px-5 py-2 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
          >
            <Boxes className="w-4 h-4" />
            <span>{loading ? 'Receiving Stock...' : `Receive ${totalPackets} Packs into Inventory`}</span>
          </button>
        </div>

      </div>

      {/* ─── QUICK ADD PRODUCT MODAL (NESTED POPUP) ─── */}
      {quickAddOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Add New Product to Catalogue</h4>
                  <p className="text-[11px] text-slate-400">Add uncatalogued item directly from this supplier invoice</p>
                </div>
              </div>
              <button
                onClick={() => setQuickAddOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewProduct} className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={quickAddForm.name}
                  onChange={(e) => setQuickAddForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={quickAddForm.category_id}
                    onChange={(e) => setQuickAddForm(prev => ({ ...prev, category_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={quickAddForm.sku}
                    onChange={(e) => setQuickAddForm(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Packaging Spec / Unit *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2.5 KG / Packet"
                    value={quickAddForm.packaging_unit}
                    onChange={(e) => setQuickAddForm(prev => ({ ...prev, packaging_unit: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Pack Ratio / Unit Qty
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={quickAddForm.unit_quantity}
                    onChange={(e) => setQuickAddForm(prev => ({ ...prev, unit_quantity: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Supplier Purchase Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={quickAddForm.purchase_cost}
                    onChange={(e) => setQuickAddForm(prev => ({ 
                      ...prev, 
                      purchase_cost: e.target.value,
                      base_price: (parseFloat(e.target.value) * 1.25).toFixed(2)
                    }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Wholesale Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={quickAddForm.base_price}
                    onChange={(e) => setQuickAddForm(prev => ({ ...prev, base_price: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-amber-500/50 rounded-xl text-amber-400 font-mono font-black focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Suggested with 25% wholesale margin
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                <span>This product will be saved to your permanent RAIS catalogue and linked to this invoice line item immediately.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickAddOpen(false)}
                  disabled={quickAddLoading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickAddLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                >
                  {quickAddLoading ? 'Saving...' : 'Save & Link to Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
