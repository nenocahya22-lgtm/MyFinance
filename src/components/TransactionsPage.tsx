import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Download, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileSpreadsheet, 
  FileText,
  HelpCircle,
  Tag,
  Landmark,
  Layers,
  Sparkles
} from 'lucide-react';
import { Transaction, Account, AllocationBucket } from '../types';
import { exportTransactionsToExcel, exportTransactionsToPDF } from '../utils/exportHelpers';

interface TransactionsPageProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  buckets: AllocationBucket[];
  accounts: Account[];
  summary: { totalIncome: number; totalExpense: number; remainingBalance: number };
}

export default function TransactionsPage({
  transactions,
  onDeleteTransaction,
  buckets,
  accounts,
  summary
}: TransactionsPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [bucketFilter, setBucketFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  // Get unique categories present in the current transactions
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats);
  }, [transactions]);

  // Combined Filters and Searches
  const processedTransactions = useMemo(() => {
    let result = [...transactions];

    // Search keywords
    if (searchTerm.trim() !== '') {
      const kw = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.description.toLowerCase().includes(kw) || 
        (t.category && t.category.toLowerCase().includes(kw))
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(t => t.type === typeFilter);
    }

    // Account filter
    if (accountFilter !== 'all') {
      result = result.filter(t => t.accountId === accountFilter);
    }

    // Bucket filter
    if (bucketFilter !== 'all') {
      result = result.filter(t => t.bucketId === bucketFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(t => t.category === categoryFilter);
    }

    // Sorting
    if (sortBy === 'newest') {
      result.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    } else if (sortBy === 'highest') {
      result.sort((a, b) => b.amount - a.amount);
    } else if (sortBy === 'lowest') {
      result.sort((a, b) => a.amount - b.amount);
    }

    return result;
  }, [transactions, searchTerm, typeFilter, accountFilter, bucketFilter, categoryFilter, sortBy]);

  // Pagination math calculations
  const totalPages = Math.ceil(processedTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    // Reset current page to 1 if it exceeds the new filtered totalPages count
    const safePage = currentPage > totalPages ? 1 : currentPage;
    const startIndex = (safePage - 1) * itemsPerPage;
    return processedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [processedTransactions, currentPage, totalPages]);

  // Handlers for Downloading PDF & Excel Reports
  const handleExportPDF = () => {
    if (transactions.length === 0) {
      alert('Tidak ada transaksi untuk diekspor!');
      return;
    }
    exportTransactionsToPDF(transactions, {
      totalIncome: summary.totalIncome,
      totalExpense: summary.totalExpense,
      netSavings: summary.remainingBalance
    });
  };

  const handleExportExcel = () => {
    if (transactions.length === 0) {
      alert('Tidak ada transaksi untuk diekspor!');
      return;
    }
    exportTransactionsToExcel(transactions);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION WITH EXPORT BUTTONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider">
            Manajemen Transaksi Kas
          </h2>
          <p className="text-xs text-slate-450 dark:text-slate-400">
            Cari, filter, urutkan, dan unduh rekaman arus pendapatan & belanja keluarga Anda.
          </p>
        </div>

        {/* Exports Buttons Group */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            type="button"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450 hover:bg-emerald-100/70 text-xs font-bold rounded-xl border border-emerald-100 dark:border-emerald-900/40 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>Unduh Excel</span>
          </button>
          
          <button
            onClick={handleExportPDF}
            type="button"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-750 dark:text-rose-455 dark:text-rose-400 hover:bg-rose-100/70 text-xs font-bold rounded-xl border border-rose-100 dark:border-rose-900/40 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Unduh PDF</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLLERS COMPONENT GROUP */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-3xs space-y-4 transition-colors duration-300">
        
        {/* Row 1: Search Keyword and Type Selector */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Keyword Search */}
          <div className="relative md:col-span-7 rounded-2xl shadow-3xs">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Cari transaksi dengan kata kunci (misal: jajan, sayur, gaji)..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            />
          </div>

          {/* Type Selector Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl md:col-span-5">
            <button
              onClick={() => { setTypeFilter('all'); setCurrentPage(1); }}
              className={`flex-1 py-2 text-[11px] font-black uppercase text-center rounded-lg cursor-pointer transition-all ${typeFilter === 'all' ? 'bg-white dark:bg-slate-900 text-slate-850 dark:text-white shadow-3xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Semua
            </button>
            <button
              onClick={() => { setTypeFilter('income'); setCurrentPage(1); }}
              className={`flex-1 py-2 text-[11px] font-black uppercase text-center rounded-lg cursor-pointer transition-all ${typeFilter === 'income' ? 'bg-emerald-600 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Masuk
            </button>
            <button
              onClick={() => { setTypeFilter('expense'); setCurrentPage(1); }}
              className={`flex-1 py-2 text-[11px] font-black uppercase text-center rounded-lg cursor-pointer transition-all ${typeFilter === 'expense' ? 'bg-rose-600 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Keluar
            </button>
          </div>
        </div>

        {/* Row 2: Advanced selectors drop-downs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2.5 border-t border-dashed border-slate-100 dark:border-slate-800">
          
          {/* Account Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Landmark className="w-3 h-3 text-indigo-500" /> Dompet / Rekening
            </label>
            <select
              value={accountFilter}
              onChange={(e) => { setAccountFilter(e.target.value); setCurrentPage(1); }}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-hidden"
            >
              <option value="all">Semua Rekening</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          {/* Saku Bucket Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-500" /> Saku Alokasi
            </label>
            <select
              value={bucketFilter}
              onChange={(e) => { setBucketFilter(e.target.value); setCurrentPage(1); }}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-hidden"
            >
              <option value="all">Semua Saku / Kantong</option>
              <option value="umum">Saku Utama (Bebas)</option>
              {buckets.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Tag className="w-3 h-3 text-indigo-500" /> Kategori Belanja
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-hidden"
            >
              <option value="all">Semua Kategori</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Sorting Controller */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-indigo-500" /> Urutan Nominal / Tgl
            </label>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as any); setCurrentPage(1); }}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-hidden"
            >
              <option value="newest">Paling Baru (Default)</option>
              <option value="oldest">Paling Lama</option>
              <option value="highest">Nominal Tertinggi</option>
              <option value="lowest">Nominal Terendah</option>
            </select>
          </div>

        </div>

      </div>

      {/* RENDER VIEW: DEKTOP TABLE OR MOBILE CARDS STACK */}
      <div>
        {processedTransactions.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-3xs p-6 space-y-2">
            <HelpCircle className="w-12 h-12 text-slate-350 dark:text-slate-700 mx-auto animate-bounce" />
            <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase">Kosong! Tidak Ada Temuan</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tidak terdeteksi riwayat transaksi yang cocok dengan pengaturan pencarian atau kriteria filter Anda.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* 1. DESKTOP INTERACTIVE TABLE VIEW */}
            <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-3xs overflow-hidden transition-colors duration-300">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none">
                      <th className="px-6 py-4">No</th>
                      <th className="px-6 py-4">Tanggal</th>
                      <th className="px-6 py-4">Keterangan</th>
                      <th className="px-6 py-4">Kategori</th>
                      <th className="px-6 py-4">Saku</th>
                      <th className="px-6 py-4">Dompet / Bank</th>
                      <th className="px-6 py-4 text-right">Nominal</th>
                      <th className="px-6 py-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {paginatedTransactions.map((tx, idx) => {
                      const absoluteIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                      const bucketName = tx.bucketId === 'umum' ? 'Saku Utama' : (buckets.find(b => b.id === tx.bucketId)?.name || 'Saku');
                      const accountLabel = accounts.find(a => a.id === tx.accountId)?.name || 'Kas';

                      return (
                        <tr 
                          key={tx.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-6 py-4.5 font-mono text-slate-400 dark:text-slate-550">{absoluteIndex}</td>
                          <td className="px-6 py-4.5 font-mono">{tx.date}</td>
                          <td className="px-6 py-4.5 max-w-xs truncate font-black text-slate-850 dark:text-white" title={tx.description}>
                            {tx.description}
                          </td>
                          <td className="px-6 py-4.5">
                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300 rounded-lg text-[10px] font-extrabold uppercase tracking-wider">
                              {tx.category || 'Belanja'}
                            </span>
                          </td>
                          <td className="px-6 py-4.5">
                            <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                              {bucketName}
                            </span>
                          </td>
                          <td className="px-6 py-4.5 font-medium text-slate-500 dark:text-slate-400">
                            {accountLabel}
                          </td>
                          <td className="px-6 py-4.5 text-right whitespace-nowrap">
                            <span className={`font-black ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-600 dark:text-rose-450'}`}>
                              {tx.type === 'income' ? '+' : '-'} {formatRupiah(tx.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4.5 text-center">
                            <button
                              onClick={() => {
                                if (window.confirm(`Yakin ingin selamanya menghapus catatan "${tx.description}"?`)) {
                                  onDeleteTransaction(tx.id);
                                }
                              }}
                              className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-650 dark:hover:text-rose-450 rounded-xl transition-all cursor-pointer"
                              title="Hapus Transaksi"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. MOBILE RESPONSIVE STACKED CARD LIST */}
            <div className="md:hidden space-y-3">
              {paginatedTransactions.map((tx) => {
                const bucketName = tx.bucketId === 'umum' ? 'Saku Utama' : (buckets.find(b => b.id === tx.bucketId)?.name || 'Saku');
                const accountLabel = accounts.find(a => a.id === tx.accountId)?.name || 'Kas';

                return (
                  <div 
                    key={tx.id}
                    className="p-4 bg-white dark:bg-slate-900 border border-slate-104 border-slate-100 dark:border-slate-805 dark:border-slate-800 rounded-2xl shadow-3xs space-y-3.5 transition-colors"
                  >
                    {/* Header: Date and Badge Category */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{tx.date}</span>
                      <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-[9px] font-black uppercase text-slate-500 dark:text-slate-350 rounded">
                        {tx.category || 'Belanja'}
                      </span>
                    </div>

                    {/* Desc and amount */}
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white leading-snug break-words">
                        {tx.description}
                      </h4>
                      <span className={`text-xs font-extrabold shrink-0 whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-605 text-emerald-600 dark:text-emerald-400' : 'text-rose-605 text-rose-600 dark:text-rose-400'}`}>
                        {tx.type === 'income' ? '+' : '-'} {formatRupiah(tx.amount)}
                      </span>
                    </div>

                    {/* Footer: Saku, Account Bank & Trash delete */}
                    <div className="flex items-center justify-between pt-3 border-t border-dashed border-slate-50 dark:border-slate-805 dark:border-slate-800">
                      <div className="flex gap-2.5 text-[9px] font-bold text-slate-405 text-slate-550 dark:text-slate-450 mt-0.5">
                        <span>Saku: <strong className="text-indigo-600 dark:text-indigo-400">{bucketName}</strong></span>
                        <span>Dompet: <strong className="text-slate-700 dark:text-slate-300">{accountLabel}</strong></span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Yakin ingin menghapus catatan "${tx.description}"?`)) {
                            onDeleteTransaction(tx.id);
                          }
                        }}
                        className="text-[10px] font-black text-rose-600 dark:text-rose-450 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* PAGINATION INTERACTIVE NAV BAR */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 select-none">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                  Halaman {currentPage} dari {totalPages} ({processedTransactions.length} Total)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-white text-slate-500 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-white text-slate-500 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
}
