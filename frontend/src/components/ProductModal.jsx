import React, { useState, useEffect } from 'react';
import { X, Package, CheckCircle2, DollarSign, Tag, Boxes, AlertCircle } from 'lucide-react';
import { catalogueApi } from '../services/api';

export const ProductModal = ({ isOpen, onClose, productToEdit, categories = [], onProductSaved }) => {
  const [internalCategories, setInternalCategories] = useState([]);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('RAIS Master');
  const [packagingUnit, setPackagingUnit] = useState('1 KG PACKET');
  const [basePrice, setBasePrice] = useState('');
  const [taxRate, setTaxRate] = useState('0.00');
  const [hsnCode, setHsnCode] = useState('');
  const [description, setDescription] = useState('');
  const [currentStock, setCurrentStock] = useState('50');
  const [minStockAlert, setMinStockAlert] = useState('10');
  const [customSku, setCustomSku] = useState('');
  const [isManualSku, setIsManualSku] = useState(false);

  const [formMode, setFormMode] = useState('FAST'); // 'FAST' or 'FULL'
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
    '2.5 KG PACKET',
    '500 GM PACKET',
    '1 BOTTLE',
    '100 NOS',
    '1 BUCKET',
    '1 TIN',
    '1 BOX'
  ];

  useEffect(() => {
    if (isOpen) {
      const initData = async () => {
        let cats = Array.isArray(categories) && categories.length > 0 ? categories : [];
        if (cats.length === 0) {
          try {
            const fetched = await catalogueApi.listCategories();
            cats = Array.isArray(fetched) ? fetched : (fetched?.items || []);
          } catch (e) {
            console.error("Failed to load categories in ProductModal:", e);
          }
        }
        setInternalCategories(cats);

        if (productToEdit) {
          setFormMode('FULL');
          setName(productToEdit.name || '');
          setCategoryId(productToEdit.category_id || (cats[0]?.id || ''));
          setBrand(productToEdit.brand || 'RAIS Master');
          setPackagingUnit(productToEdit.packaging_unit || '1 KG PACKET');
          setBasePrice(productToEdit.base_price?.toString() || '');
          setTaxRate('0.00');
          setHsnCode(productToEdit.hsn_code || '');
          setDescription(productToEdit.description || '');
          setCurrentStock(productToEdit.current_stock?.toString() || '0');
          setMinStockAlert(productToEdit.min_stock_alert?.toString() || '10');
          setCustomSku(productToEdit.sku || '');
          setIsManualSku(true);
        } else {
          setFormMode('FAST');
          setName('');
          setCategoryId(cats[0]?.id || '');
          setBrand('RAIS Master');
          setPackagingUnit('1 KG PACKET');
          setBasePrice('');
          setTaxRate('0.00');
          setHsnCode('21069099');
          setDescription('');
          setCurrentStock('0');
          setMinStockAlert('10');
          setCustomSku('');
          setIsManualSku(false);
        }
        setError('');
        setSuccessMsg(null);
      };

      initData();
    }
  }, [isOpen, productToEdit, categories]);

  // Auto-generate suggested SKU
  const getSuggestedSku = () => {
    if (isManualSku && customSku) return customSku;
    const cat = (internalCategories || []).find(c => c.id === categoryId);
    const catPrefix = cat ? (cat.code || 'ITM').toUpperCase() : 'ITM';
    const namePart = name
      ? name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase()
      : 'SKU';
    const rnd = Math.floor(10 + Math.random() * 89);
    return `RAIS-${catPrefix.substring(0, 3)}-${namePart || rnd}`;
  };

  // Calculations (Direct Wholesale Price - No GST)
  const numericBasePrice = parseFloat(basePrice) || 0;
  const numericTaxRate = parseFloat(taxRate) || 0;
  const finalPriceInclTax = numericBasePrice;

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
        await catalogueApi.updateProduct(productToEdit.id, {
          name: name.trim(),
          category_id: categoryId,
          brand: brand.trim(),
          packaging_unit: packagingUnit,
          base_price: numericBasePrice,
          tax_rate: numericTaxRate,
          hsn_code: hsnCode.trim() || null,
          description: description.trim() || null,
          current_stock: parseFloat(currentStock) || 0,
          min_stock_alert: parseFloat(minStockAlert) || 10
        });
        setSuccessMsg('Product updated successfully!');
      } else {
        await catalogueApi.createProduct({
          sku: skuToUse,
          name: name.trim(),
          category_id: categoryId,
          brand: brand.trim(),
          packaging_unit: packagingUnit,
          base_price: numericBasePrice,
          tax_rate: numericTaxRate,
          hsn_code: hsnCode.trim() || null,
          description: description.trim() || null,
          current_stock: parseFloat(currentStock) || 0,
          min_stock_alert: parseFloat(minStockAlert) || 10,
          is_active: true
        });
        setSuccessMsg('New product added to master catalogue!');
      }

      setTimeout(() => {
        if (onProductSaved) onProductSaved();
        onClose();
      }, 700);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to save product.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {productToEdit ? 'Edit Catalogue SKU' : 'Add New Catalogue Product'}
              </h2>
              <p className="text-xs text-slate-400">RAIS Master Price List & Stock Definition</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (when adding new product) */}
        {!productToEdit && (
          <div className="px-5 pt-3 pb-0 flex items-center gap-2 border-b border-slate-800 bg-slate-950/40">
            <button
              type="button"
              onClick={() => setFormMode('FAST')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                formMode === 'FAST'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span>⚡ Fast Add (3 Fields)</span>
            </button>
            <button
              type="button"
              onClick={() => setFormMode('FULL')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                formMode === 'FULL'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span>📋 Full Specifications</span>
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* CONDITIONAL RENDERING BASED ON MODE */}
          {formMode === 'FAST' && !productToEdit ? (
            <div className="space-y-4">
              {/* Field 1: Name */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                  1. Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. McCain French Fries 2.5kg, ITC Burger Patty"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-bold"
                  autoFocus
                />
              </div>

              {/* Field 2: Category Chips */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  2. Select Category *
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {(internalCategories || []).map((c) => {
                    const isSelected = categoryId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategoryId(c.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field 3: Wholesale Rate & Pack Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                    3. Wholesale Rate (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 font-black text-sm">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      placeholder="240.00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-sm font-mono font-black text-amber-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Pack Size / Unit
                  </label>
                  <input
                    type="text"
                    value={packagingUnit}
                    onChange={(e) => setPackagingUnit(e.target.value)}
                    placeholder="1 KG PACKET"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {popularUnits.slice(0, 5).map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setPackagingUnit(u)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                          packagingUnit === u ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Auto SKU Preview Strip */}
              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Assigned SKU:</span>
                <span className="text-amber-400 font-bold">{getSuggestedSku()}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Product Name *
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
                {(internalCategories || []).map((c) => (
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
              <div className="flex flex-wrap gap-1 mt-1.5">
                {popularBrands.slice(0, 4).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBrand(b)}
                    className="px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-[10px] text-slate-400 hover:text-slate-200"
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Packaging Unit & Pricing */}
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
                placeholder="1 KG PACKET"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {popularUnits.slice(0, 4).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setPackagingUnit(u)}
                    className="px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-[10px] text-slate-400 hover:text-slate-200"
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Wholesale Base Price (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="240.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-2.5 text-xs font-mono font-bold text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Pricing Preview Badge */}
          {numericBasePrice > 0 && (
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between font-mono">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <span className="text-slate-400 text-[11px]">Pricing Valuation:</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span>Wholesale Unit Rate: <b className="text-slate-200 font-bold">₹{numericBasePrice.toFixed(2)}</b></span>
                <span className="text-amber-400 font-bold border-l border-slate-800 pl-3">
                  Billed Price: ₹{finalPriceInclTax.toFixed(2)} (Direct)
                </span>
              </div>
            </div>
          )}

          {/* Stock & Minimum Threshold */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Initial Stock Qty
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                placeholder="50"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Low Stock Alert At
              </label>
              <input
                type="number"
                step="any"
                min="1"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(e.target.value)}
                placeholder="10"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
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

          {/* SKU Code (Auto/Custom) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold uppercase tracking-wider text-slate-400">
                Catalogue SKU Code *
              </label>
              <button
                type="button"
                onClick={() => setIsManualSku(!isManualSku)}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
              >
                {isManualSku ? 'Use Auto-Generated SKU' : 'Enter Custom SKU'}
              </button>
            </div>
            <input
              type="text"
              disabled={!isManualSku && !productToEdit}
              value={isManualSku ? customSku : (productToEdit?.sku || getSuggestedSku())}
              onChange={(e) => setCustomSku(e.target.value)}
              placeholder="e.g. RAIS-ITC-CRIS"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-amber-400 font-mono font-bold uppercase focus:outline-none focus:border-amber-500 disabled:opacity-75 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all transform active:scale-95"
            >
              {loading ? 'Saving...' : productToEdit ? 'Update Product' : 'Add to Catalogue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
