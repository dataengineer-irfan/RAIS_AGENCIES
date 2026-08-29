import React, { useState, useEffect } from 'react';
import { X, Package, CheckCircle2, DollarSign, Tag, Boxes, AlertCircle } from 'lucide-react';
import { catalogueApi } from '../services/api';

export const ProductModal = ({ isOpen, onClose, productToEdit, categories, onProductSaved }) => {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('RAIS Master');
  const [packagingUnit, setPackagingUnit] = useState('1 KG PACKET');
  const [basePrice, setBasePrice] = useState('');
  const [taxRate, setTaxRate] = useState('5.00');
  const [hsnCode, setHsnCode] = useState('');
  const [description, setDescription] = useState('');
  const [currentStock, setCurrentStock] = useState('50');
  const [minStockAlert, setMinStockAlert] = useState('10');
  const [customSku, setCustomSku] = useState('');
  const [isManualSku, setIsManualSku] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(null);

  const popularBrands = [
    'ITC Master Chef',
    'Milky Mist',
    'Hup Hup',
    'RAIS Beverages',
    'RAIS Spices',
    'Packaging Solutions',
    'Chilli Fill',
    'Other / Custom'
  ];

  const popularUnits = [
    '1 KG PACKET',
    '1.2 KG PACKET',
    '2 KG PACKET',
    '500 GM PACKET',
    '1 BOTTLE',
    '100 NOS',
    '1 BUCKET',
    '1 TIN',
    '1 BOX'
  ];

  useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        setName(productToEdit.name || '');
        setCategoryId(productToEdit.category_id || (categories[0]?.id || ''));
        setBrand(productToEdit.brand || 'RAIS Master');
        setPackagingUnit(productToEdit.packaging_unit || '1 KG PACKET');
        setBasePrice(productToEdit.base_price?.toString() || '');
        setTaxRate(productToEdit.tax_rate?.toString() || '5.00');
        setHsnCode(productToEdit.hsn_code || '');
        setDescription(productToEdit.description || '');
        setCurrentStock(productToEdit.current_stock?.toString() || '0');
        setMinStockAlert(productToEdit.min_stock_alert?.toString() || '10');
        setCustomSku(productToEdit.sku || '');
        setIsManualSku(true);
      } else {
        setName('');
        const initialCatId = categories[0]?.id || '';
        setCategoryId(initialCatId);
        setBrand('ITC Master Chef');
        setPackagingUnit('1 KG PACKET');
        setBasePrice('');
        setTaxRate('5.00');
        setHsnCode('21069099');
        setDescription('');
        setCurrentStock('50');
        setMinStockAlert('10');
        setCustomSku('');
        setIsManualSku(false);
      }
      setError('');
      setSuccessMsg(null);
    }
  }, [isOpen, productToEdit, categories]);

  // Auto-generate suggested SKU
  const getSuggestedSku = () => {
    if (isManualSku && customSku) return customSku;
    const cat = categories.find(c => c.id === categoryId);
    const catPrefix = cat ? (cat.code || 'ITM').toUpperCase() : 'ITM';
    const namePart = name
      ? name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase()
      : 'SKU';
    const rnd = Math.floor(10 + Math.random() * 89);
    return `RAIS-${catPrefix.substring(0, 3)}-${namePart || rnd}`;
  };

  // Calculations
  const numericBasePrice = parseFloat(basePrice) || 0;
  const numericTaxRate = parseFloat(taxRate) || 0;
  const gstAmount = numericBasePrice * (numericTaxRate / 100);
  const finalPriceInclTax = numericBasePrice + gstAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a product name.');
      return;
    }
    if (!categoryId) {
      setError('Please select a category.');
      return;
    }
    if (!basePrice || numericBasePrice <= 0) {
      setError('Please enter a valid wholesale base price greater than 0.');
      return;
    }

    const skuToUse = (customSku.trim() || getSuggestedSku()).toUpperCase();

    setLoading(true);
    try {
      if (productToEdit) {
        // Update product
        const payload = {
          name: name.trim(),
          category_id: categoryId,
          brand: brand.trim(),
          packaging_unit: packagingUnit.trim(),
          base_price: numericBasePrice,
          tax_rate: numericTaxRate,
          hsn_code: hsnCode.trim() || null,
          description: description.trim() || null,
          current_stock: parseFloat(currentStock) || 0,
          min_stock_alert: parseFloat(minStockAlert) || 10
        };
        const updated = await catalogueApi.updateProduct(productToEdit.id, payload);
        setSuccessMsg(`Product "${updated.name}" updated successfully!`);
        if (onProductSaved) onProductSaved(updated);
      } else {
        // Create new product
        const payload = {
          sku: skuToUse,
          name: name.trim(),
          category_id: categoryId,
          brand: brand.trim(),
          packaging_unit: packagingUnit.trim(),
          unit_quantity: 1.0,
          base_price: numericBasePrice,
          tax_rate: numericTaxRate,
          hsn_code: hsnCode.trim() || '21069099',
          description: description.trim() || null,
          current_stock: parseFloat(currentStock) || 50,
          min_stock_alert: parseFloat(minStockAlert) || 10,
          is_active: true
        };
        const created = await catalogueApi.createProduct(payload);
        setSuccessMsg(`New SKU "${created.sku} — ${created.name}" created successfully!`);
        if (onProductSaved) onProductSaved(created);
      }

      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1400);
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to save product.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {productToEdit ? 'Edit Master SKU' : 'Add New Catalogue Product'}
              </h2>
              <p className="text-xs text-slate-400">
                {productToEdit ? `Updating ${productToEdit.sku}` : 'Register a new frozen item, sauce, or beverage SKU'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Product Name */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
              Product / Item Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ITC Veg Crispy Fingers"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
            />
          </div>

          {/* Category & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Brand / Manufacturer *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. ITC Master Chef"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Packaging Unit & HSN Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Packaging Unit *
              </label>
              <input
                type="text"
                required
                value={packagingUnit}
                onChange={(e) => setPackagingUnit(e.target.value)}
                placeholder="e.g. 1 KG PACKET, 1 BOTTLE"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['1 KG PACKET', '1.2 KG PACKET', '1 BOTTLE', '100 NOS'].map(u => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setPackagingUnit(u)}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded"
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                HSN Code
              </label>
              <input
                type="text"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                placeholder="e.g. 21069099"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Pricing & GST (With Live Calculator) */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Wholesale Pricing & GST
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Wholesale Base Rate (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-amber-400 focus:outline-none focus:border-amber-500 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Applicable GST Rate (%)
                </label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                >
                  <option value="0.00">0% (Exempted)</option>
                  <option value="5.00">5% (Food & Essentials)</option>
                  <option value="12.00">12% (Processed / Dairy / Beverages)</option>
                  <option value="18.00">18% (Packaging & Sauces)</option>
                  <option value="28.00">28% (Luxury / Energy Drinks)</option>
                </select>
              </div>
            </div>

            {/* Calculated Preview Box */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">
                Base: ₹{numericBasePrice.toFixed(2)} + GST ({numericTaxRate}%): ₹{gstAmount.toFixed(2)}
              </span>
              <span className="font-black text-emerald-400 text-sm">
                Final Bill Rate: ₹{finalPriceInclTax.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Initial Stock & Alert Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                {productToEdit ? 'Current Stock Count' : 'Initial Stock on Hand'}
              </label>
              <input
                type="number"
                step="any"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                placeholder="50"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Low Stock Alert Threshold
              </label>
              <input
                type="number"
                step="any"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(e.target.value)}
                placeholder="10"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* SKU Code (Auto-suggest or Custom) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold uppercase tracking-wider text-slate-400">
                Master SKU Code {productToEdit && '(Fixed)'}
              </label>
              {!productToEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setIsManualSku(!isManualSku);
                    if (!isManualSku) setCustomSku(getSuggestedSku());
                  }}
                  className="text-[10px] text-amber-400 hover:underline font-semibold"
                >
                  {isManualSku ? 'Use Auto-Generated SKU' : 'Customize SKU Code'}
                </button>
              )}
            </div>
            <input
              type="text"
              disabled={productToEdit ? true : !isManualSku}
              value={productToEdit ? productToEdit.sku : (isManualSku ? customSku : getSuggestedSku())}
              onChange={(e) => setCustomSku(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 disabled:opacity-60 rounded-lg px-3 py-2.5 text-xs text-amber-400 font-mono font-bold uppercase focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg uppercase tracking-wider text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || successMsg}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-lg uppercase tracking-wider text-xs shadow-lg shadow-amber-500/20"
            >
              {loading ? 'Saving...' : productToEdit ? 'Update SKU' : 'Add to Catalogue'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
