import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign, 
  PieChart as PieIcon, 
  HelpCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  CalendarDays
} from 'lucide-react';
import { Transaction, AllocationBucket } from '../types';

interface AnalyticsChartsProps {
  transactions: Transaction[];
  buckets: AllocationBucket[];
  selectedMonth: string; // "all" or "YYYY-MM"
}

export default function AnalyticsCharts({ transactions, buckets, selectedMonth }: AnalyticsChartsProps) {
  const [activeTab, setActiveTab] = useState<'income_expense' | 'outliers'>('income_expense');

  // Currency utility
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  // 1. Filtered Transactions for the Selected Month Scope
  const filteredTx = useMemo(() => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter(t => t.date.substring(0, 7) === selectedMonth);
  }, [transactions, selectedMonth]);

  const expensesOnly = useMemo(() => {
    return filteredTx.filter(t => t.type === 'expense');
  }, [filteredTx]);

  const incomesOnly = useMemo(() => {
    return filteredTx.filter(t => t.type === 'income');
  }, [filteredTx]);

  // 2. Compute spendings by pocket/bucket
  const spendByBucket = useMemo(() => {
    const summary: Record<string, { name: string; amount: number; color: string; count: number }> = {};
    
    // Set up default buckets representation
    summary['umum'] = { name: 'Saku Utama (Bebas)', amount: 0, color: 'slate', count: 0 };
    buckets.forEach(b => {
      summary[b.id] = { name: b.name, amount: 0, color: b.color, count: 0 };
    });

    // Populate from actual expense transactions
    expensesOnly.forEach(tx => {
      const bId = tx.bucketId || 'umum';
      if (!summary[bId]) {
        summary[bId] = { name: 'Lainnya / Dihapus', amount: 0, color: 'slate', count: 0 };
      }
      summary[bId].amount += tx.amount;
      summary[bId].count += 1;
    });

    // Convert to list & filter empty spendings unless it's main saku
    return Object.entries(summary)
      .map(([id, item]) => ({ id, ...item }))
      .sort((a, b) => b.amount - a.amount);
  }, [expensesOnly, buckets]);

  const totalExpenseSum = useMemo(() => {
    return expensesOnly.reduce((acc, t) => acc + t.amount, 0);
  }, [expensesOnly]);

  const totalIncomeSum = useMemo(() => {
    return incomesOnly.reduce((acc, t) => acc + t.amount, 0);
  }, [incomesOnly]);

  // 3. Significant Outliers (Exorbitant spendings: Top Expenses sorted descending)
  const topSpends = useMemo(() => {
    return [...expensesOnly]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // top 5 most expensive purchases
  }, [expensesOnly]);

  // 4. Monthly Trend (Daily / Periodic Aggregation)
  const dailyAggregation = useMemo(() => {
    const daily: Record<string, { income: number; expense: number; dateStr: string }> = {};
    
    // Scan last 15 days or all filtered
    filteredTx.forEach(t => {
      const day = t.date; // "YYYY-MM-DD"
      if (!daily[day]) {
        daily[day] = { income: 0, expense: 0, dateStr: day };
      }
      if (t.type === 'income') {
        daily[day].income += t.amount;
      } else if (t.type === 'expense') {
        daily[day].expense += t.amount;
      }
    });

    return Object.values(daily)
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
      .slice(-10); // display last 10 days of activities
  }, [filteredTx]);

  // Color config mapper values
  const colorMap: Record<string, string> = {
    indigo: '#4f46e5',
    emerald: '#10b981',
    rose: '#f43f5e',
    cyan: '#06b6d4',
    amber: '#f59e0b',
    purple: '#a855f7',
    slate: '#64748b'
  };

  // Convert month key like "2026-06" into Indonesian friendly month name, e.g. "Juni 2026"
  const getIndoMonthLabel = (mKey: string) => {
    if (mKey === 'all') return 'Semua Periode';
    const parts = mKey.split('-');
    if (parts.length !== 2) return mKey;
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const idx = parseInt(parts[1], 10) - 1;
    return `${months[idx] || parts[1]} ${parts[0]}`;
  };

  return (
    <div id="analytics-section-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
      
      {/* Analytics Head */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-5">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="text-indigo-600 w-5 h-5 animate-pulse" />
            Laporan Analitik & Grafik Pengeluaran
          </h2>
          <p className="text-xs text-slate-500">
            Diagram visual pasutri di periode <span className="font-extrabold text-indigo-600 uppercase">{getIndoMonthLabel(selectedMonth)}</span>.
          </p>
        </div>

        {/* Tab Filter Button */}
        <div className="flex bg-slate-50 border border-slate-150 p-1 rounded-xl w-fit self-start">
          <button
            onClick={() => setActiveTab('income_expense')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
              activeTab === 'income_expense' 
                ? 'bg-white text-indigo-700 shadow-3xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Alokasi & Barchart
          </button>
          <button
            onClick={() => setActiveTab('outliers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
              activeTab === 'outliers' 
                ? 'bg-white text-indigo-700 shadow-3xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sangat Signifikan (Outliers)
          </button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-xs font-bold text-slate-400">Silakan tambahkan data transaksi untuk menggambar diagram visual di sini.</p>
        </div>
      ) : (
        <div>
          {/* TAB 1: ALLOCATION BREAKDOWN & METER */}
          {activeTab === 'income_expense' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Alokasi Progress Meters */}
              <div className="lg:col-span-6 space-y-5">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">
                    Proporsi Konsumsi Anggaran
                  </h3>
                  
                  {totalExpenseSum === 0 ? (
                    <p className="text-xs text-slate-400 italic">Belum ada pengeluaran tercatat di saku manapun pada bulan ini.</p>
                  ) : (
                    <div className="space-y-3.5">
                      {spendByBucket.filter(item => item.amount > 0).map((b) => {
                        const percent = totalExpenseSum > 0 ? (b.amount / totalExpenseSum) * 100 : 0;
                        const cHex = colorMap[b.color] || '#4f46e5';

                        return (
                          <div key={b.id} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cHex }} />
                                {b.name}
                              </span>
                              <span className="font-mono font-bold text-slate-500">
                                {formatRupiah(b.amount)} <span className="text-[10px] text-slate-400 font-medium">({percent.toFixed(1)}%)</span>
                              </span>
                            </div>
                            
                            {/* Horizontal Percent Bar Meter */}
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{ 
                                  backgroundColor: cHex,
                                  width: `${percent}%` 
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick informational Summary note */}
                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl flex items-start gap-2.5">
                  <ArrowDownLeft className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    <span className="font-black text-indigo-850 block uppercase text-3xs tracking-wider mb-0.5">💡 EVALUASI PASUTRI BIJAK:</span>
                    Pastikan pengeluaran bulanan tidak melampaui saku anggaran yang ditentukan. Kantong dengan persentase paling tinggi menggambarkan kontributor pengeluaran terbesar rumah tangga Anda.
                  </div>
                </div>
              </div>

              {/* Right Column: Mini Trend Bar Chart */}
              <div className="lg:col-span-6 border-l lg:border-l border-slate-100 lg:pl-6 space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Grafik Sebaran Harian (10 Hari Terakhir)
                </h3>

                {dailyAggregation.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Data transaksi harian tidak mendeteksi log aktivitas.</p>
                ) : (
                  <div className="space-y-5">
                    {/* Visual Bar Columns Representing Income vs Expense */}
                    <div className="h-44 flex items-end justify-between gap-2.5 border-b border-slate-100 pb-2 pt-2">
                      {dailyAggregation.map((ag, idx) => {
                        const maxVal = Math.max(...dailyAggregation.map(d => Math.max(d.income, d.expense))) || 100000;
                        const incPercent = (ag.income / maxVal) * 100;
                        const expPercent = (ag.expense / maxVal) * 100;

                        // date formatting
                        const parts = ag.dateStr.split('-');
                        const shortDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : ag.dateStr;

                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                            {/* Hover tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30 shadow-md font-mono space-y-0.5 pointer-events-none">
                              <p className="font-bold text-[8px] text-slate-400 border-b border-slate-800 pb-0.5">{ag.dateStr}</p>
                              <p className="text-emerald-400">Masuk: {formatRupiah(ag.income)}</p>
                              <p className="text-rose-400">Keluar: {formatRupiah(ag.expense)}</p>
                            </div>

                            <div className="w-full flex items-end justify-center gap-1 h-full">
                              {/* Income Bar (emerald) */}
                              <div 
                                className="w-2.5 bg-emerald-400 hover:bg-emerald-500 rounded-t-sm transition-all duration-300"
                                style={{ height: `${Math.max(incPercent, 3)}%` }}
                              />
                              {/* Expense Bar (rose) */}
                              <div 
                                className="w-2.5 bg-rose-400 hover:bg-rose-500 rounded-t-sm transition-all duration-300"
                                style={{ height: `${Math.max(expPercent, 3)}%` }}
                              />
                            </div>
                            
                            <span className="text-[9px] font-bold text-slate-450 font-mono mt-1 shrink-0 select-none">
                              {shortDate}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chart Legend */}
                    <div className="flex gap-4 justify-center text-[10px]">
                      <span className="flex items-center gap-1.5 font-bold text-slate-650">
                        <span className="w-3 h-3 rounded-xs bg-emerald-400" />
                        Uang Masuk (Pemasukan)
                      </span>
                      <span className="flex items-center gap-1.5 font-bold text-slate-650">
                        <span className="w-3 h-3 rounded-xs bg-rose-400" />
                        Uang Keluar (Pengeluaran)
                      </span>
                    </div>

                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: SIGNIFICANT OUTLIERS & BILLS */}
          {activeTab === 'outliers' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 p-4 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-black text-amber-900 uppercase">Radar Pembelian Sangat Signifikan</h4>
                  <p className="text-[11px] text-amber-800 mt-0.5 font-medium leading-relaxed">
                    Menampilkan 5 catatan pengeluaran dengan nominal paling jumbo di bulan atau periode terpilih. Gunakan ini untuk menganalisis pengeluaran mana yang paling memakan kas pasutri.
                  </p>
                </div>
              </div>

              {topSpends.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 text-xs font-bold text-slate-400 rounded-xl border border-slate-150">
                  Tidak terdeteksi belanja bernominal besar di periode ini.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-150 bg-white rounded-xl overflow-hidden">
                  {topSpends.map((tx, idx) => {
                    const bLabels: Record<string, string> = {};
                    buckets.forEach(b => { bLabels[b.id] = b.name; });
                    const bucketName = tx.bucketId === 'umum' ? 'Saku Utama' : (bLabels[tx.bucketId] || 'Saku Anggaran');

                    return (
                      <div 
                        key={tx.id} 
                        className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-black font-semibold text-xs shrink-0 mt-0.5">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-black text-slate-800 break-words leading-tight">
                              {tx.description}
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-1">
                              Tanggal: <span className="font-black text-slate-550 text-slate-500">{tx.date}</span> • Sumber Pos: <span className="font-black text-indigo-600">{bucketName}</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-black text-rose-600">
                            - {formatRupiah(tx.amount)}
                          </p>
                          <span className="inline-flex text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                            Outlier Pengeluaran
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
