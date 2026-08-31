import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Trash2, X, AlertTriangle, CheckCircle, Calculator } from 'lucide-react';
import { customerApi, catalogueApi, orderApi } from '../services/api';

export const OrderBuilderModal = ({ isOpen, onClose, onOrderCreated, preselectedCustomerId }) => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { product_id: '', quantity: 1, unit_price: 0, tax_rate: 0, packaging_unit: '', current_stock: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen, preselectedCustomerId]);

  const loadInitialData = async () => {
    try {
      const [custs, prods] = await Promise.all([
        customerApi.list(),
        catalogueApi.listProducts({ limit: 200 })
      ]);
      setCustomers(custs);
      setProducts(prods);

      if (preselectedCustomerId) {
        setCustomerId(preselectedCustomerId);
      } else if (custs.length > 0) {
        setCustomerId(custs[0].id);
      }

      if (prods.length > 0) {
        setItems([
          {
            product_id: prods[0].id,
            quantity: 1,
            unit_price: parseFloat(prods[0].base_price),
            tax_rate: parseFloat(prods[0].tax_rate),
            packaging_unit: prods[0].packaging_unit,
            current_stock: parseFloat(prods[0].current_stock)
          }
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleProductChange = (index, prodId) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    const newItems = [...items];
    newItems[index] = {
      product_id: prod.id,
      quantity: newItems[index].quantity || 1,
      unit_price: parseFloat(prod.base_price),
      tax_rate: parseFloat(prod.tax_rate),
      packaging_unit: prod.packaging_unit,
      current_stock: parseFloat(prod.current_stock)
    };
    setItems(newItems);
  };

  const handleQuantityChange = (index, qty) => {
    const newItems = [...items];
    newItems[index].quantity = parseFloat(qty) || 0;
    setItems(newItems);
  };

  const handleAddItem = () => {
    if (products.length === 0) return;
    const firstProd = products[0];
    setItems([
      ...items,
      {
        product_id: firstProd.id,
        quantity: 1,
        unit_price: parseFloat(firstProd.base_price),
        tax_rate: parseFloat(firstProd.tax_rate),
        packaging_unit: firstProd.packaging_unit,
        current_stock: parseFloat(firstProd.current_stock)
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = items.reduce((acc, itm) => acc + (itm.quantity * itm.unit_price), 0);
  const grandTotal = subtotal;

  const handleSubmit = async (status = "CONFIRMED") => {
    setError('');
    if (!customerId) {
      setError('Please select a customer.');
      return;
    }
    if (items.some(i => !i.product_id || i.quantity <= 0)) {
      setError('All items must have a valid selected product and quantity > 0.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customer_id: customerId,
        status: status,
        order_date: orderDate,
        expected_delivery_date: expectedDeliveryDate || null,
        notes: notes || null,
        items: items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price
        }))
      };

      await orderApi.create(payload);
      onOrderCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create order.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create New Customer Order</h2>
              <p className="text-xs text-slate-400">Record restaurant booking with live stock availability verification</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 text-xs">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl">
              {error}
            </div>
          )}

          {/* Customer & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Select Customer / Restaurant *
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.business_name} ({c.customer_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Order Date
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                Required Delivery Date
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Product Items Table */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="font-bold uppercase tracking-wider text-slate-300">
                Order Line Items
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product Row</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => {
                const lineTotal = item.quantity * item.unit_price;
                const isStockLow = item.quantity > item.current_stock;

                return (
                  <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <select
                          value={item.product_id}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.packaging_unit}) — ₹{parseFloat(p.base_price).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(idx, e.target.value)}
                          placeholder="Qty"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-right"
                        />
                      </div>

                      <div className="col-span-3 text-right">
                        <span className="font-mono font-bold text-slate-200">₹{(item.quantity * item.unit_price).toFixed(2)}</span>
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="text-slate-500 hover:text-rose-400 disabled:opacity-30 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Stock availability indicator */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-900">
                      <span className="text-slate-400">
                        Pack: <span className="text-slate-300 font-semibold">{item.packaging_unit}</span> | Rate: ₹{item.unit_price}
                      </span>
                      {isStockLow ? (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Insufficient stock (Available: {item.current_stock})</span>
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>In Stock ({item.current_stock} available)</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
              Order Notes & Delivery Instructions
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Urgent morning delivery to restaurant kitchen"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Summary Box */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-400">Total Items Subtotal: </span>
              <span className="text-slate-200 font-bold text-sm">₹{subtotal.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-400">Total Order Value: </span>
              <span className="text-base font-black text-amber-400">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg uppercase tracking-wider text-xs"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSubmit("DRAFT")}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg uppercase tracking-wider text-xs"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSubmit("CONFIRMED")}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-lg uppercase tracking-wider text-xs shadow-lg shadow-amber-500/20"
              >
                {loading ? 'Confirming...' : 'Confirm Order'}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
