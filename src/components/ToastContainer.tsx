import React from 'react';
import { CheckCircle, AlertTriangle, Info, ShieldAlert, X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error': return <ShieldAlert className="w-5 h-5 text-rose-500" />;
      default: return <Info className="w-5 h-5 text-indigo-500" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'success': return 'border-emerald-200 bg-emerald-50';
      case 'warning': return 'border-amber-200 bg-amber-50';
      case 'error': return 'border-rose-200 bg-rose-50';
      default: return 'border-indigo-200 bg-indigo-50';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg animate-slide-up ${getBorderColor(toast.type)}`}
        >
          <div className="shrink-0 mt-0.5">
            {getIcon(toast.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-slate-800">{toast.title}</p>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-relaxed">
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="shrink-0 p-0.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
