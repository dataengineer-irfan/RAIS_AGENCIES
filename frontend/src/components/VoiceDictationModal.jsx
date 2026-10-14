import React, { useState, useEffect } from 'react';
import { Mic, MicOff, X, Check, RefreshCw, Sparkles, AlertTriangle, ArrowRight, Volume2 } from 'lucide-react';
import { useVoiceRecognition } from '../services/voice/useVoiceRecognition';
import { 
  parseInvoiceUtterance, 
  parseCustomerUtterance, 
  parseInventoryUtterance,
  detectIntent 
} from '../services/voice/voiceParser';

export const VoiceDictationModal = ({
  isOpen,
  onClose,
  mode = 'INVOICE', // 'INVOICE' | 'CUSTOMER' | 'INVENTORY' | 'AUTO'
  customers = [],
  products = [],
  onApplyParsedData
}) => {
  const {
    isSupported,
    isListening,
    fullTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript
  } = useVoiceRecognition({ language: 'en-IN', continuous: false });

  const [parsedResult, setParsedResult] = useState(null);
  const [activeMode, setActiveMode] = useState(mode);

  useEffect(() => {
    if (isOpen) {
      resetTranscript();
      setParsedResult(null);
      setActiveMode(mode);
      // Auto start listening on open if supported
      const timer = setTimeout(() => {
        startListening({
          onEnd: (finalText) => {
            handleResolve(finalText);
          }
        });
      }, 200);
      return () => clearTimeout(timer);
    } else {
      stopListening();
    }
  }, [isOpen, mode]);

  // When live transcript updates, dynamically parse
  useEffect(() => {
    if (fullTranscript) {
      handleResolve(fullTranscript);
    }
  }, [fullTranscript]);

  const handleResolve = (text) => {
    if (!text || !text.trim()) return;

    let targetMode = activeMode;
    if (activeMode === 'AUTO') {
      targetMode = detectIntent(text);
      setActiveMode(targetMode);
    }

    if (targetMode === 'INVOICE') {
      const res = parseInvoiceUtterance(text, customers, products);
      setParsedResult(res);
    } else if (targetMode === 'CUSTOMER') {
      const res = parseCustomerUtterance(text);
      setParsedResult(res);
    } else if (targetMode === 'INVENTORY' || targetMode === 'STOCK_ADJUSTMENT' || targetMode === 'STOCK_RECEIPT') {
      const res = parseInventoryUtterance(text, products);
      setParsedResult(res);
    }
  };

  const handleApply = () => {
    stopListening();
    if (parsedResult && onApplyParsedData) {
      onApplyParsedData(parsedResult, activeMode);
    }
    onClose();
  };

  const handleRestart = () => {
    resetTranscript();
    setParsedResult(null);
    startListening({
      onEnd: (finalText) => {
        handleResolve(finalText);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Mic className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Voice Assistant
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {activeMode}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Zero-cost local speech dictation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Microphone Pulse Visualizer */}
        <div className="p-6 flex flex-col items-center justify-center text-center bg-radial from-amber-500/10 via-transparent to-transparent">
          <div className="relative mb-4">
            {isListening && (
              <>
                <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
                <div className="absolute -inset-2 rounded-full bg-amber-500/10 animate-pulse" />
              </>
            )}
            <button
              onClick={isListening ? stopListening : handleRestart}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
                isListening
                  ? 'bg-amber-500 text-slate-950 shadow-amber-500/30 scale-105'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isListening ? (
                <Mic className="w-8 h-8 animate-bounce" />
              ) : (
                <MicOff className="w-8 h-8" />
              )}
            </button>
          </div>

          <p className="text-xs font-semibold text-slate-300">
            {isListening ? 'Listening... Speak clearly now' : 'Dictation paused'}
          </p>

          {/* Transcript Box */}
          <div className="mt-4 w-full min-h-[50px] p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-left">
            <p className="text-xs text-slate-400 font-mono text-[10px] uppercase mb-1">Live Transcript:</p>
            <p className="text-xs sm:text-sm text-amber-200 font-medium leading-relaxed italic">
              {fullTranscript ? `"${fullTranscript}"` : 'Awaiting speech input...'}
            </p>
          </div>

          {error && (
            <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Parsed Staging Card */}
        {parsedResult && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Staged Entity Extraction
              </span>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Ready for Review
              </span>
            </div>

            {/* Mode-specific extracted preview */}
            {activeMode === 'INVOICE' && (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">Customer:</span>
                  <span className="font-bold text-white">
                    {parsedResult.customer ? (
                      `${parsedResult.customer.business_name} (${parsedResult.customer.customer_code})`
                    ) : (
                      <span className="text-amber-400">Select manually in modal</span>
                    )}
                  </span>
                </div>

                {parsedResult.items && parsedResult.items.length > 0 && (
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="text-[11px] text-slate-400 font-medium">Line Items ({parsedResult.items.length}):</div>
                    {parsedResult.items.map((itm, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-200 pl-2 border-l-2 border-amber-500">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>
                            <strong className="text-amber-400">{itm.quantity}x</strong> {itm.product_name || itm.query}
                          </span>
                          {itm.isAmbiguous && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              ⚠️ Multiple Variants
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-slate-400">
                          {itm.unit_price > 0 ? `₹${(itm.quantity * itm.unit_price).toFixed(2)}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {parsedResult.discountAmount > 0 && (
                  <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">Invoice Discount:</span>
                    <span className="font-bold text-emerald-400">₹{parsedResult.discountAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {activeMode === 'CUSTOMER' && (
              <div className="space-y-1.5 text-xs">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Business Name</span>
                    <span className="font-bold text-white">{parsedResult.business_name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Contact Person</span>
                    <span className="font-bold text-white">{parsedResult.contact_person || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Phone</span>
                    <span className="font-bold text-amber-400 font-mono">{parsedResult.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">City</span>
                    <span className="font-bold text-white">{parsedResult.city || 'Rayachoty'}</span>
                  </div>
                </div>
              </div>
            )}

            {(activeMode === 'INVENTORY' || activeMode === 'STOCK_ADJUSTMENT' || activeMode === 'STOCK_RECEIPT') && (
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Operation:</span>
                  <span className="font-bold text-amber-400">{parsedResult.intent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Product:</span>
                  <span className="font-bold text-white">{parsedResult.product?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Quantity:</span>
                  <span className="font-bold text-white font-mono">{parsedResult.quantity}</span>
                </div>
                {parsedResult.reason && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reason:</span>
                    <span className="font-bold text-slate-300">{parsedResult.reason}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Example Utterances Helper */}
        <div className="px-4 py-2.5 bg-slate-950 text-[11px] text-slate-400 border-t border-slate-800/80">
          <span className="font-semibold text-slate-300">Try saying: </span>
          {activeMode === 'INVOICE' && (
            <span className="italic">"Bill Hot Burger 5 packets French Fries and 2 boxes Cheese Slice discount 50 rupees"</span>
          )}
          {activeMode === 'CUSTOMER' && (
            <span className="italic">"New customer Al-Bake Restaurant contact Imran phone 9848012345 city Rayachoty credit limit 20000"</span>
          )}
          {(activeMode === 'INVENTORY' || activeMode === 'STOCK_ADJUSTMENT' || activeMode === 'STOCK_RECEIPT') && (
            <span className="italic">"Damage 3 packets French Fries 6mm" or "Received 50 packets French Fries from McCain cost 280"</span>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleRestart}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Restart Dictation
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={!parsedResult}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-lg ${
              parsedResult
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Apply to Form
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
