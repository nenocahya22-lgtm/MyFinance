import React from 'react';
import { Wallet, Landmark, ArrowUpRight, ArrowDownLeft, ShieldCheck } from 'lucide-react';
import { FinanceSummaryData } from '../types';

interface FinanceSummaryProps {
  summary: FinanceSummaryData;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
}

export default function FinanceSummary({ summary, transactionCount, incomeCount, expenseCount }: FinanceSummaryProps) {
  // Format to IDR Rupiah Currency
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const isBalanceNegative = summary.remainingBalance < 0;
  const isBalancePositive = summary.remainingBalance > 0;

  return (
    <div id="finance-bento-card-system" className="space-y-6">
      
      {/* 4-Column Summary Cards Row */}
      <div id="finance-summary-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Total Uang Masuk Card */}
        <div 
          id="summary-card-income" 
          className="bg-white rounded-2xl border border-slate-100 shadow-3xs p-5 hover:shadow-xs transition-shadow duration-300 relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Pendapatan</span>
              <h3 id="value-total-income" className="text-xl lg:text-2xl font-extrabold text-slate-800 tracking-tight">
                {formatRupiah(summary.totalIncome)}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-450">
            <span>Catatan masuk:</span>
            <span className="font-extrabold text-slate-700">{incomeCount} kali</span>
          </div>
        </div>

        {/* 2. Total Uang Keluar Card */}
        <div 
          id="summary-card-expense" 
          className="bg-white rounded-2xl border border-slate-100 shadow-3xs p-5 hover:shadow-xs transition-shadow duration-300 relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Pengeluaran</span>
              <h3 id="value-total-expense" className="text-xl lg:text-2xl font-extrabold text-slate-800 tracking-tight">
                {formatRupiah(summary.totalExpense)}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-450">
            <span>Catatan keluar:</span>
            <span className="font-extrabold text-slate-700">{expenseCount} kali</span>
          </div>
        </div>

        {/* 3. Saldo Utama / Saldo Bebas (Unallocated) Card */}
        <div 
          id="summary-card-unallocated" 
          className="bg-white rounded-2xl border border-slate-100 shadow-3xs p-5 hover:shadow-xs transition-shadow duration-300 relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Saku Utama (Bebas)</span>
              <h3 id="value-unallocated-balance" className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatRupiah(summary.unallocatedBalance)}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-450">
            <span>Siap dialokasikan:</span>
            <span className="font-bold text-slate-700">
              {summary.unallocatedBalance > 0 ? 'Tersedia' : 'Kosong'}
            </span>
          </div>
        </div>

        {/* 4. Total Saldo Bersih Card (Premium Dark Highlight) */}
        <div 
          id="summary-card-balance" 
          className={`rounded-2xl border transition-all duration-300 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between ${
            isBalanceNegative 
              ? 'bg-rose-950 border-rose-900 text-rose-100' 
              : 'bg-slate-900 border-slate-850 text-white'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold opacity-70 uppercase tracking-widest block">Total Saldo Bersih</span>
              <h3 id="value-remaining-balance" className="text-xl lg:text-2xl font-black tracking-tight">
                {formatRupiah(summary.remainingBalance)}
              </h3>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isBalanceNegative ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-indigo-400'
            }`}>
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            {isBalanceNegative ? (
              <span id="badge-warning-balance" className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-305 text-rose-400 uppercase tracking-wider">
                ● Keuangan Minus
              </span>
            ) : summary.allocatedBalance > 0 ? (
              <span id="badge-allocated-status" className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                ● {formatRupiah(summary.allocatedBalance)} Terdistribusi
              </span>
            ) : (
              <span id="badge-empty-balance" className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider">
                ● Belum Ada Alokasi
              </span>
            )}
            <span className="text-[10px] font-medium opacity-60">
              {transactionCount} total transaksi
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
