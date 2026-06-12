import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Shield } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleClearAndReload = () => {
    if (window.confirm('Hapus semua data lokal dan muat ulang? Data yang tersimpan di server tidak akan hilang.')) {
      // Clear only app data, not all localStorage
      const keysToKeep = ['keuangan_sync_code', 'keuangan_sync_token'];
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('keuangan_') && !keysToKeep.includes(key)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl p-8 relative overflow-hidden text-center">
            {/* Decorative icon */}
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Shield className="w-40 h-40 text-rose-900" />
            </div>

            <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mb-6">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-black text-slate-850 tracking-tight mb-2">
              Aduh, Ada Gangguan!
            </h2>
            <p className="text-sm text-slate-500 font-medium mb-2 leading-relaxed">
              Maaf, aplikasi mengalami kendala saat memuat data. 
            </p>
            <p className="text-xs text-slate-400 font-medium mb-6 leading-relaxed">
              Ini bisa disebabkan oleh data lokal yang korup. Tenang, data Anda di server tetap aman.
            </p>

            {/* Error detail (collapsible) */}
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-[10px] font-bold text-slate-400 cursor-pointer hover:text-slate-600">
                  Detail Teknis
                </summary>
                <pre className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 font-mono overflow-auto max-h-32">
                  {this.state.error.name}: {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Coba Lagi
              </button>

              <button
                onClick={this.handleClearAndReload}
                className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Reset Data Lokal & Muat Ulang
              </button>
            </div>

            <p className="mt-6 text-[10px] text-slate-400 font-medium">
              Jika masalah berlanjut, coba buka di tab incognito atau hubungi dukungan.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
