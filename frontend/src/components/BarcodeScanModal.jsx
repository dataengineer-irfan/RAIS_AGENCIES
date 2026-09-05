import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  X, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Minus, 
  Package, 
  Barcode, 
  RotateCcw,
  Sparkles,
  Zap,
  ArrowRight
} from 'lucide-react';
import { inventoryApi } from '../services/api';

export const BarcodeScanModal = ({ isOpen, onClose, products = [], onStockUpdated }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  
  const [manualCode, setManualCode] = useState('');
  const [matchedProduct, setMatchedProduct] = useState(null);
  const [inwardQty, setInwardQty] = useState(10);
  const [actionType, setActionType] = useState('RECEIVE'); // 'RECEIVE' or 'SET_EXACT'
  
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Start Camera
  const startCamera = async () => {
    setCameraError('');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);

        // Check if native BarcodeDetector API exists (Chrome 88+)
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new window.BarcodeDetector({
            formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e']
          });

          const scanLoop = async () => {
            if (!videoRef.current || !streamRef.current) return;
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const code = barcodes[0].rawValue;
                handleCodeScanned(code);
                return; // pause after match
              }
            } catch (err) {
              // ignore frame read issues
            }
            if (streamRef.current) {
              requestAnimationFrame(scanLoop);
            }
          };
          requestAnimationFrame(scanLoop);
        }
      } else {
        setCameraError('Camera API not accessible in this environment. Use manual SKU/Barcode entry.');
      }
    } catch (err) {
      console.warn('Camera stream error:', err);
      setCameraError('Camera permission denied or camera unavailable. You can search or scan using manual entry.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (isOpen) {
      setManualCode('');
      setMatchedProduct(null);
      setInwardQty(10);
      setStatusMsg('');
      setErrorMsg('');
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const handleCodeScanned = (code) => {
    if (!code) return;
    if (navigator.vibrate) navigator.vibrate(100);

    const clean = code.trim().toLowerCase();
    // Match by SKU, ID, or name
    const found = products.find(p => 
      (p.sku || '').toLowerCase() === clean ||
      (p.sku || '').toLowerCase().includes(clean) ||
      (p.name || '').toLowerCase().includes(clean) ||
      (p.hsn_code || '').toLowerCase() === clean
    );

    if (found) {
      setMatchedProduct(found);
      setStatusMsg(`Found: ${found.name} (${found.sku})`);
      setErrorMsg('');
    } else {
      setErrorMsg(`No product found matching code "${code}".`);
    }
  };

  const handleManualSearch = (e) => {
    e?.preventDefault();
    if (!manualCode.trim()) return;
    handleCodeScanned(manualCode.trim());
  };

  const handleConfirmStockChange = async () => {
    if (!matchedProduct) return;
    const qty = parseFloat(inwardQty);
    if (!qty || qty <= 0) {
      setErrorMsg('Please enter a quantity greater than 0.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const prodId = matchedProduct.id || matchedProduct.product_id;
      if (actionType === 'RECEIVE') {
        await inventoryApi.receiveStock({
          product_id: prodId,
          quantity: qty,
          reference_number: `SCAN-INWARD-${Date.now().toString().slice(-4)}`,
          notes: 'Camera barcode scanner instant inward'
        });
        setStatusMsg(`✅ Successfully added +${qty} to ${matchedProduct.name}!`);
      } else {
        await inventoryApi.adjustStock({
          product_id: prodId,
          new_quantity: qty,
          reason: 'AUDIT',
          notes: 'Camera barcode physical stock count'
        });
        setStatusMsg(`✅ Successfully updated ${matchedProduct.name} stock to ${qty}!`);
      }

      if (onStockUpdated) onStockUpdated();

      // Reset matched after brief moment
      setTimeout(() => {
        setMatchedProduct(null);
        setManualCode('');
        setStatusMsg('');
      }, 1500);

    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to update stock.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">
                  Camera Barcode Scanner
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
                  2026 Smart
                </span>
              </div>
              <p className="text-xs text-slate-400">Scan packaging carton or enter SKU</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewfinder Area */}
        <div className="relative bg-black h-48 sm:h-56 flex items-center justify-center overflow-hidden shrink-0 border-b border-slate-800">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
          />

          {!cameraActive && (
            <div className="p-4 text-center">
              <Barcode className="w-12 h-12 text-slate-600 mx-auto mb-2 opacity-60" />
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {cameraError || 'Camera inactive. You can use manual SKU / Barcode input below.'}
              </p>
              {!cameraActive && !cameraError && (
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-3 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Start Camera
                </button>
              )}
            </div>
          )}

          {/* Viewfinder Target Laser Overlay */}
          {cameraActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-32 border-2 border-dashed border-cyan-400/80 rounded-xl relative flex items-center justify-center">
                <div className="w-full h-0.5 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                <span className="absolute bottom-1 text-[9px] font-mono font-bold text-cyan-300 uppercase tracking-widest bg-slate-950/80 px-2 rounded">
                  Align Barcode
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Manual SKU / Barcode Input Bar */}
        <form onSubmit={handleManualSearch} className="p-3 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Barcode className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Type SKU or Barcode (e.g. RAIS-ITC, CHIC)..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all shrink-0"
          >
            Find
          </button>
        </form>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mx-4 mt-2 p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs font-semibold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {statusMsg && (
          <div className="mx-4 mt-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-semibold flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Matched Product Details & Inward Panel */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {matchedProduct ? (
            <div className="bg-slate-950 border border-cyan-500/40 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {matchedProduct.sku}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {matchedProduct.brand} • {matchedProduct.category_name}
                </span>
              </div>

              <h3 className="font-black text-sm text-white mt-1.5 leading-snug">
                {matchedProduct.name}
              </h3>

              <div className="flex items-center justify-between text-xs text-slate-400 font-mono mt-2 pt-2 border-t border-slate-800">
                <span>Current Stock: <strong className="text-slate-200">{matchedProduct.current_stock || 0} pk</strong></span>
                <span>Wholesale: <strong className="text-amber-400">₹{parseFloat(matchedProduct.base_price || 0).toFixed(2)}</strong></span>
              </div>

              {/* Action Mode Toggle */}
              <div className="mt-3 flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActionType('RECEIVE')}
                  className={`flex-1 py-1.5 rounded font-bold transition-all ${
                    actionType === 'RECEIVE'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  + Add Stock (Inward)
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('SET_EXACT')}
                  className={`flex-1 py-1.5 rounded font-bold transition-all ${
                    actionType === 'SET_EXACT'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Set Count (Audit)
                </button>
              </div>

              {/* Quantity Steppers & Pills */}
              <div className="mt-3 space-y-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400">
                  {actionType === 'RECEIVE' ? 'Units to Add (+)' : 'Actual Physical Count'}
                </label>

                {/* Quick Pills */}
                <div className="flex items-center gap-1.5">
                  {[5, 10, 25, 50].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setInwardQty(val)}
                      className={`flex-1 py-1 text-xs font-mono font-bold rounded-lg border transition-colors ${
                        inwardQty === val
                          ? 'bg-cyan-600 text-white border-cyan-500'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {actionType === 'RECEIVE' ? `+${val}` : `${val}`}
                    </button>
                  ))}
                </div>

                {/* Stepper with number */}
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl overflow-hidden mt-1">
                  <button
                    type="button"
                    onClick={() => setInwardQty(Math.max(1, (parseFloat(inwardQty) || 0) - 1))}
                    className="p-3 text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={inwardQty}
                    onChange={(e) => setInwardQty(parseFloat(e.target.value) || 0)}
                    className="flex-1 bg-transparent text-center font-mono font-black text-base text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setInwardQty((parseFloat(inwardQty) || 0) + 1)}
                    className="p-3 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmStockChange}
                className="w-full mt-4 py-2.5 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm {actionType === 'RECEIVE' ? `+${inwardQty} Units` : `Count of ${inwardQty}`}</span>
                  </>
                )}
              </button>

            </div>
          ) : (
            <div className="py-6 text-center text-slate-500">
              <p className="text-xs">Point camera at SKU barcode or select a product above.</p>
              <div className="mt-3 flex flex-wrap gap-1.5 justify-center max-w-sm mx-auto">
                {products.slice(0, 6).map(p => (
                  <button
                    key={p.sku}
                    type="button"
                    onClick={() => handleCodeScanned(p.sku)}
                    className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-400 hover:text-amber-400 rounded-lg transition-colors"
                  >
                    {p.sku}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
