import React, { useState, useEffect } from "react";
import { AlertTriangle, X, TrendingUp } from "lucide-react";

interface BudgetWarning {
  category: string;
  spent: number;
  limit: number;
  percentage: number;
  isOverspent: boolean;
  message: string;
}

interface Props {
  warnings: BudgetWarning[];
  onDismiss: (category: string) => void;
}

export default function BudgetWarningBanner({ warnings, onDismiss }: Props) {
  if (warnings.length === 0) return null;

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {warnings.map((w) => (
        <div
          key={w.category}
          className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border text-sm ${
            w.isOverspent
              ? "bg-red-50 border-red-300 text-red-800"
              : "bg-amber-50 border-amber-300 text-amber-800"
          }`}
        >
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{w.isOverspent ? "⚠️ Budget Terlampaui!" : "⚠️ Peringatan Budget"}</p>
            <p className="text-xs mt-1">{w.category}: {fmt(w.spent)} / {fmt(w.limit)}</p>
            <div className="mt-2 h-1.5 rounded-full bg-white/60 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${w.isOverspent ? "bg-red-500" : "bg-amber-500"}`}
                style={{ width: `${Math.min(w.percentage, 100)}%` }}
              />
            </div>
            <p className="text-xs mt-1">{w.percentage}% terpakai</p>
          </div>
          <button onClick={() => onDismiss(w.category)} className="shrink-0 opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
