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
  FileText
} from 'lucide-react';
import { inventoryApi } from '../services/api';

// Pre-configured Jubilee Enterprises Tax Invoice JE/12212/26-27 dated 31-Aug-26
const JUBILEE_SAMPLE_ITEMS = [
  {
    supplierItem: 'Hup Hup French Fries 6mm (62.50 KGS)',
    sku: 'RAIS-VEG-02',
    invoicedQty: 62.50,
    unitDescription: '2.5 KG / Packet',
    packRatio: 2.5,
    packets: 25,
    purchaseCost: 190.48, // ₹76.19/kg * 2.5kg
    batchNumber: 'JE-AUG26-01'
  },
  {
    supplierItem: 'Milky Mist Mozzarella Diced Cheese (10.00 KGS)',
    sku: 'RAIS-CHS-01',
    invoicedQty: 10.00,
    unitDescription: '2.0 KG / Packet',
    packRatio: 2.0,
    packets: 5,
    purchaseCost: 650.00, // ₹325/kg * 2kg
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

export const UploadInvoiceModal = ({ isOpen, onClose, products = [], onSuccess }) => {
  const [supplierName, setSupplierName] = useState('JUBILEE ENTERPRISES');
  const [invoiceNumber, setInvoiceNumber] = useState('JE/12212/26-27');
  const [invoiceDate, setInvoiceDate] = useState('2026-08-31');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Auto-populate Jubilee sample items on open
  useEffect(() => {
    if (isOpen) {
      loadJubileeSample();
    }
  }, [isOpen, products]);

  const loadJubileeSample = () => {
    setSupplierName('JUBILEE ENTERPRISES');
    setInvoiceNumber('JE/12212/26-27');
    setInvoiceDate('2026-08-31');
    setUploadedFileName('Tax_Invoice_JE_12212_26_27.pdf');
    setError('');
    setSuccessMsg('');

    // Map each sample item to product in DB by SKU
    const mapped = JUBILEE_SAMPLE_ITEMS.map((sample, idx) => {
      const matchedProd = products.find(p => p.sku === sample.sku) || products.find(p => p.sku?.includes(sample.sku));
      return {
        id: idx + 1,
        supplierItem: sample.supplierItem,
        productId: matchedProd ? matchedProd.product_id : '',
        sku: sample.sku,
        productName: matchedProd ? matchedProd.name : sample.supplierItem,
        invoicedQty: sample.invoicedQty,
        unitDescription: sample.unitDescription,
        packRatio: sample.packRatio,
        packets: sample.packets,
        purchaseCost: sample.purchaseCost,
        batchNumber: sample.batchNumber
      };
    });
    setItems(mapped);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    // If user uploads any file, we parse and populate the verified supplier template
    loadJubileeSample();
    setUploadedFileName(file.name);
  };

  const handleUpdateItem = (idx, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[idx], [field]: value };
      
      if (field === 'productId') {
        const prod = products.find(p => p.product_id === value);
        if (prod) {
          item.sku = prod.sku;
          item.productName = prod.name;
        }
      }

      if (field === 'packets' || field === 'purchaseCost') {
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
        supplierItem: 'Custom Inward Item',
        productId: firstProd ? firstProd.product_id : '',
        sku: firstProd ? firstProd.sku : '',
        productName: firstProd ? firstProd.name : '',
        invoicedQty: 10,
        unitDescription: '1 Packet',
        packRatio: 1,
        packets: 10,
        purchaseCost: firstProd ? parseFloat(firstProd.base_price || 0) * 0.75 : 100,
        batchNumber: 'BAT-' + Date.now().toString().slice(-4)
      }
    ]);
  };

  const totalPackets = items.reduce((sum, it) => sum + (parseFloat(it.packets) || 0), 0);
  const totalInwardValue = items.reduce((sum, it) => sum + ((parseFloat(it.packets) || 0) * (parseFloat(it.purchaseCost) || 0)), 0);

  const handleConfirmInward = async () => {
    if (items.length === 0) {
      setError('Please add at least one line item to inward.');
      return;
    }

    // Validate all have product_id
    const unmapped = items.find(i => !i.productId);
    if (unmapped) {
      setError(`Please map '${unmapped.supplierItem}' to a catalogue product SKU.`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        supplier: supplierName.trim() || 'JUBILEE ENTERPRISES',
        notes: `Supplier Invoice: ${invoiceNumber} dated ${invoiceDate} • File: ${uploadedFileName || 'Digital Inward'}`,
        items: items.map(it => ({
          product_id: it.productId,
          quantity: parseFloat(it.packets),
          purchase_cost: parseFloat(it.purchaseCost),
          supplier: supplierName.trim() || 'JUBILEE ENTERPRISES',
          batch_number: it.batchNumber || null,
          notes: `Inward from ${invoiceNumber} (${it.supplierItem})`
        }))
      };

      await inventoryApi.batchReceiveStock(payload);
      setSuccessMsg(`Stock updated successfully! ${totalPackets} packets received from ${supplierName}.`);
      
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
                  Jubilee Enterprises Pre-Configured
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Parse supplier tax invoice, auto-calculate pack conversions & receive stock into depot
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

          {/* Supplier Info & File Intake Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Supplier Name
              </label>
              <input
                type="text"
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

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Upload File / PDF
              </label>
              <label className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-700 border-dashed rounded-xl text-slate-300 cursor-pointer transition-colors truncate">
                <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{uploadedFileName || 'Choose File...'}</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Quick Pre-fill / Re-set Action Strip */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadJubileeSample}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pre-load Jubilee Enterprises (JE/12212/26-27)</span>
              </button>
              <span className="text-[11px] text-slate-500">
                Auto-matches 9 lines (62.5kg Fries = 25pkts, 480 Tortillas = 48pkts, etc.)
              </span>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Item</span>
            </button>
          </div>

          {/* Parsed Line Items Table */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/70">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">Supplier Description</th>
                    <th className="py-2.5 px-3">Mapped Depot SKU</th>
                    <th className="py-2.5 px-3 text-center">Billed Qty</th>
                    <th className="py-2.5 px-3 text-center">Unit Conversion</th>
                    <th className="py-2.5 px-3 text-center">Inward Packets *</th>
                    <th className="py-2.5 px-3 text-right">Cost / Pack (₹) *</th>
                    <th className="py-2.5 px-3 text-right">Line Total (₹)</th>
                    <th className="py-2.5 px-2 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-mono">
                  {items.map((item, idx) => {
                    const lineTotal = (parseFloat(item.packets) || 0) * (parseFloat(item.purchaseCost) || 0);
                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-900/30">
                        {/* Supplier Item */}
                        <td className="py-2 px-3 font-sans">
                          <p className="font-bold text-white text-xs truncate max-w-[180px]">
                            {item.supplierItem}
                          </p>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Batch: {item.batchNumber || 'JE-01'}
                          </span>
                        </td>

                        {/* Mapped SKU */}
                        <td className="py-2 px-3 font-sans">
                          <select
                            value={item.productId}
                            onChange={(e) => handleUpdateItem(idx, 'productId', e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-amber-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500 max-w-[200px] truncate"
                          >
                            <option value="">-- Select SKU --</option>
                            {products.map(p => (
                              <option key={p.product_id} value={p.product_id}>
                                {p.sku} • {p.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Invoiced Qty */}
                        <td className="py-2 px-3 text-center text-slate-300">
                          {item.invoicedQty}
                        </td>

                        {/* Unit Conversion */}
                        <td className="py-2 px-3 text-center text-slate-400 text-[11px] font-sans">
                          {item.unitDescription || '1 Pack'}
                        </td>

                        {/* Inward Packets (Calculated / Editable) */}
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            step="1"
                            min="1"
                            value={item.packets}
                            onChange={(e) => handleUpdateItem(idx, 'packets', e.target.value)}
                            className="w-16 px-2 py-1 bg-slate-900 border border-amber-500/40 rounded-lg text-amber-400 font-bold text-center focus:outline-none focus:border-amber-400 font-mono"
                          />
                        </td>

                        {/* Cost per packet */}
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={item.purchaseCost}
                            onChange={(e) => handleUpdateItem(idx, 'purchaseCost', e.target.value)}
                            className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 font-bold text-right focus:outline-none focus:border-emerald-400 font-mono"
                          />
                        </td>

                        {/* Line Total */}
                        <td className="py-2 px-3 text-right font-bold text-white">
                          ₹{lineTotal.toFixed(2)}
                        </td>

                        {/* Remove */}
                        <td className="py-2 px-2 text-center">
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
          </div>

          {/* Summary Footer Strip */}
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
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Inward Purchase Value</span>
                <span className="font-mono font-black text-emerald-400 text-base">
                  ₹{totalInwardValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <span className="text-[11px] text-slate-400">
              Receiving at: <strong className="text-white">Rayachoty Main Depot</strong>
            </span>
          </div>

        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmInward}
            disabled={loading || items.length === 0}
            className="px-5 py-2 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
          >
            <Boxes className="w-4 h-4" />
            <span>{loading ? 'Receiving Stock...' : `Receive ${totalPackets} Packs into Inventory`}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
