import React from 'react';
import { ShieldCheck, RefreshCw, Trash2, Phone, ChevronDown, ChevronUp } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('RAIS Depot Uncaught Error Catch:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Storage clear error:', e);
    }
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                RAIS Depot System Ready
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                An interface update was synchronized. Your customer ledgers, product catalog, and invoices remain safely preserved in the database.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Depot App</span>
              </button>

              <button
                onClick={this.handleResetAndReload}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-750 active:scale-[0.98] text-slate-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Clear Cache & Restart</span>
              </button>
            </div>

            {/* Collapsible Developer Diagnostic Log */}
            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="text-[11px] text-slate-500 hover:text-slate-400 flex items-center justify-center gap-1 mx-auto transition-colors"
              >
                <span>Diagnostic details</span>
                {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {this.state.showDetails && this.state.error && (
                <div className="mt-2.5 bg-slate-950 border border-slate-800 rounded-xl p-3 text-left overflow-x-auto">
                  <p className="text-[11px] font-mono text-rose-400 break-words">
                    {this.state.error?.toString() || 'Unknown Error'}
                  </p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-[10px] font-mono text-slate-500 mt-2 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>

            <div className="text-xs text-slate-400 flex items-center justify-center gap-2">
              <Phone className="w-3.5 h-3.5 text-amber-500" />
              <span>Rayachoty Depot Hotline: <strong className="text-slate-200">9347453135</strong></span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
