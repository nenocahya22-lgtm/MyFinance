import React, { useState } from 'react';
import { 
  Search, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar,
  XCircle,
  ArrowUpDown,
  Layers,
  Filter,
  Landmark,
  ArrowRightLeft
} from 'lucide-react';
import { Transaction, TransactionType, AllocationBucket, Account } from '../types';

interface TransactionsTableProps {
  transactions: Transaction[];
  buckets: AllocationBucket[];
  accounts: Account[];
  onDeleteTransaction: (id: string) => void;
  onClearAll: () => void;
}

type SortKey = 'date' | 'amount';
type SortOrder = 'asc' | 'desc';

export default function TransactionsTable({ 
  transactions, 
  buckets, 
  accounts,
  onDeleteTransaction, 
  onClearAll 
}: TransactionsTableProps) {
  // Filters & Sorting state
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [filterBucket, setFilterBucket] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Extract all unique categories present in the transactions list
  const uniqueCategories = React.useMemo(() => {
    const list = new Set<string>();
    transactions.forEach(tx => {
      if (tx.category) {
        list.add(tx.category);
      }
    });
    return Array.from(list).sort();
  }, [transactions]);

  // Format Helper
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  // Convert Date to friendly Indonesian string
  const formatIndoDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
    } catch (e) {
      // fallback
    }
    return dateStr;
  };

  // Toggle Sorting
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  // Find bucket name and color helper
  const getBucketLabel = (bucketId: string) => {
    if (!bucketId || bucketId === 'umum') {
      return { name: 'Saku Utama', bg: 'bg-slate-50 border-slate-100 text-slate-500' };
    }
    const bucket = buckets.find((b) => b.id === bucketId);
    if (!bucket) {
      return { name: 'Lainnya / Dihapus', bg: 'bg-slate-55 border-slate-100 text-slate-400' };
    }

    const colorConfig: Record<string, string> = {
      indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
      emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
      rose: 'bg-rose-50 border-rose-100 text-rose-700',
      cyan: 'bg-cyan-50 border-cyan-100 text-cyan-700',
      amber: 'bg-amber-50 border-amber-100 text-amber-700',
      purple: 'bg-purple-50 border-purple-100 text-purple-700',
    };

    const bgClass = colorConfig[bucket.color] || colorConfig.indigo;
    return { name: bucket.name, bg: bgClass };
  };

  // Find account name and color helper
  const getAccountLabel = (accountId?: string) => {
    if (!accountId) {
      return { name: 'Dompet Kas', bg: 'bg-slate-50 border-slate-100 text-slate-500' };
    }
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) {
      return { name: 'Rekening Dihapus', bg: 'bg-slate-50 border-slate-100 text-slate-400' };
    }

    const colorConfig: Record<string, string> = {
      blue: 'bg-blue-50 border-blue-100 text-blue-700',
      emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
      amber: 'bg-amber-50 border-amber-100 text-amber-700',
      purple: 'bg-purple-50 border-purple-100 text-purple-700',
      rose: 'bg-rose-50 border-rose-105 text-rose-700',
      cyan: 'bg-cyan-50 border-cyan-100 text-cyan-700',
      indigo: 'bg-indigo-50 border-indigo-105 text-indigo-700',
    };

    const bgClass = colorConfig[acc.color] || colorConfig.blue;
    return { name: acc.name, bg: bgClass };
  };

  // Filter and sort core logic
  const filteredTransactions = transactions
    .filter((tx) => {
      // 1. Search Query filter (case-insensitive)
      const matchesSearch = tx.description.toLowerCase().includes(search.toLowerCase());
      
      // 2. Type filter
      const matchesType = filterType === 'all' || tx.type === filterType;

      // 3. Bucket filter
      const matchesBucket = filterBucket === 'all' || tx.bucketId === filterBucket;

      // 4. Account filter (matches source or target destination for transfers to catch all activity)
      const matchesAccount = filterAccount === 'all' || tx.accountId === filterAccount || tx.toAccountId === filterAccount;
      
      // 5. Category filter
      const matchesCategory = filterCategory === 'all' || tx.category === filterCategory;

      return matchesSearch && matchesType && matchesBucket && matchesAccount && matchesCategory;
    })
    .sort((a, b) => {
      if (sortKey === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
    });

  const hasActiveFilters = search !== '' || filterType !== 'all' || filterBucket !== 'all' || filterAccount !== 'all' || filterCategory !== 'all';

  const handleResetFilters = () => {
    setSearch('');
    setFilterType('all');
    setFilterBucket('all');
    setFilterAccount('all');
    setFilterCategory('all');
    setSortKey('date');
    setSortOrder('desc');
  };

  return (
    <div id="transactions-log-section" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      
      {/* Table Header & Controls */}
      <div className="p-6 border-b border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 id="transactions-header-title" className="text-lg font-bold text-slate-800">
              Riwayat Transaksi Keuangan
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Catatan mutasi seluruh pengeluaran, pemasukan, dan transfer rumah tangga Anda.
            </p>
          </div>
          
          {transactions.length > 0 && (
            <button
              id="btn-clear-all"
              onClick={() => {
                if (window.confirm('Apakah Anda yakin ingin menghapus SEMUA catatan keuangan Anda? Tindakan ini tidak dapat dibatalkan.')) {
                  onClearAll();
                }
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 py-2.5 px-3.5 rounded-xl active:scale-97 cursor-pointer transition-all shrink-0 flex items-center gap-1.5 self-start sm:self-center"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Kosongkan Semua Data
            </button>
          )}
        </div>

        {/* Filter controls if transactions exist */}
        {transactions.length > 0 && (
          <div id="filter-controls-bar" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 pt-2">
            
            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <input
                id="search-description"
                type="text"
                placeholder="Cari keterangan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 placeholder:text-slate-405"
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-605"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Type Dropdown Filter */}
            <div className="md:col-span-2">
              <select
                id="filter-type-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as TransactionType | 'all')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">Semua Tipe</option>
                <option value="income">Uang Masuk</option>
                <option value="expense">Uang Keluar</option>
                <option value="transfer">Transfer Dana</option>
              </select>
            </div>

            {/* Account Filter */}
            <div className="md:col-span-2">
              <select
                id="filter-account-select"
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-4 focus:ring-indigo-105 focus:border-indigo-505 cursor-pointer"
              >
                <option value="all">🏦 Semua Dompet</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Bucket Filter */}
            <div className="md:col-span-2">
              <select
                id="filter-bucket-select"
                value={filterBucket}
                onChange={(e) => setFilterBucket(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">🏷️ Pos Saku</option>
                <option value="umum">Saku Utama</option>
                {buckets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="md:col-span-2">
              <select
                id="filter-category-select"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">🔖 Semua Kategori</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Sorting trigger helpers */}
            <div className="md:col-span-2 flex gap-1.5">
              <button
                id="btn-sort-date"
                onClick={() => handleSort('date')}
                className={`flex-1 py-2 px-2.5 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  sortKey === 'date'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title="Urutkan Tanggal"
              >
                Tgl {sortKey === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>

              <button
                id="btn-sort-amount"
                onClick={() => handleSort('amount')}
                className={`flex-1 py-2 px-2.5 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  sortKey === 'amount'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title="Urutkan Nominal"
              >
                IDR {sortKey === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>
        )}

        {/* Filter Indicator */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              Menampilkan <span className="text-slate-900 font-black">{filteredTransactions.length}</span> hasil pencocokan.
            </span>
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Main Transactions Render Block */}
      {transactions.length === 0 ? (
        /* Empty Database State (Strictly Empty conforming to requirements) */
        <div id="empty-state-card" className="p-12 md:p-16 text-center bg-slate-50/40">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
            <Layers className="w-6 h-6" />
          </div>
          <h3 id="empty-state-title" className="text-base font-bold text-slate-800 mb-1.5">
            Database Anda Kosong
          </h3>
          <p id="empty-state-desc" className="text-slate-400 text-xs max-w-sm mx-auto mb-5 leading-normal font-medium">
            Mulai input nominal uang masuk & keluar serta atur saku alokasi di samping untuk menyaksikan visualisasi riwayat yang rapi.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aplikasi Siap Digunakan</span>
          </div>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div id="no-filtered-results" className="p-12 text-center text-slate-400">
          <p className="text-xs font-bold mb-2">Tidak ada catatan yang sesuai dengan filter pencarian.</p>
          <button
            onClick={handleResetFilters}
            className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl cursor-pointer transition-all"
          >
            Tampilkan Semua Data
          </button>
        </div>
      ) : (
        /* Responsive Table */
        <div className="overflow-x-auto">
          {/* Desktop Version */}
          <table className="hidden md:table w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider select-none">
                <th className="py-3 px-5">Informasi Transaksi</th>
                <th className="py-3 px-5">Rekening / Penyimpanan</th>
                <th className="py-3 px-5">Pos Alokasi</th>
                <th className="py-3 px-5 text-right w-44">Jumlah Nominal</th>
                <th className="py-3 px-5 text-center w-16">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTransactions.map((tx) => {
                const bucketLabel = getBucketLabel(tx.bucketId);
                const isTransfer = tx.type === 'transfer';
                
                const sourceAcc = getAccountLabel(tx.accountId);
                const destAcc = getAccountLabel(tx.toAccountId);

                return (
                  <tr 
                    key={tx.id} 
                    id={`row-tx-${tx.id}`}
                    className="hover:bg-slate-50/40 transition-colors group animate-fade-in"
                  >
                    {/* Info */}
                    <td className="py-4 px-5">
                      <div className="space-y-1">
                        <p className="font-extrabold text-slate-800 break-words max-w-sm text-sm">
                          {tx.description}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-semibold">
                          <span className="font-bold text-slate-500">{formatIndoDate(tx.date)}</span>
                          <span>•</span>
                          {isTransfer ? (
                            <span className="text-amber-600 font-black flex items-center gap-0.5">
                              <ArrowRightLeft className="w-3 h-3 text-amber-500" />
                              Transfer Saldo
                            </span>
                          ) : tx.type === 'income' ? (
                            <span className="text-emerald-600 font-extrabold flex items-center gap-0.5">
                              <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                              Pemasukan
                            </span>
                          ) : (
                            <span className="text-rose-600 font-extrabold flex items-center gap-0.5">
                              <ArrowDownLeft className="w-3 h-3 text-rose-500" />
                              Pengeluaran
                            </span>
                          )}
                          {tx.category && (
                            <>
                              <span>•</span>
                              <span className="px-1.5 py-0.5 bg-slate-100/80 border border-slate-200/80 rounded-md text-slate-600 font-bold text-[9px] uppercase tracking-wider">
                                {tx.category}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Storage Account designation */}
                    <td className="py-4 px-5">
                      {isTransfer ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          <span className={`px-2 py-0.5 border rounded-md whitespace-nowrap ${sourceAcc.bg}`}>
                            {sourceAcc.name}
                          </span>
                          <span className="text-slate-400 text-xs">➔</span>
                          <span className={`px-2 py-0.5 border rounded-md whitespace-nowrap ${destAcc.bg}`}>
                            {destAcc.name}
                          </span>
                        </div>
                      ) : (
                        <span className={`px-2.5 py-1 border rounded-lg text-[10px] font-black tracking-wide ${sourceAcc.bg}`}>
                          {sourceAcc.name}
                        </span>
                      )}
                    </td>

                    {/* Saku Badge info */}
                    <td className="py-4 px-5">
                      {isTransfer ? (
                        <span className="text-slate-400 font-mono italic text-[10px]">Lalu lintas kas</span>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-1 border rounded-lg text-[10px] font-black tracking-wide ${bucketLabel.bg}`}>
                          {bucketLabel.name}
                        </span>
                      )}
                    </td>

                    {/* Nominal */}
                    <td className={`py-4 px-5 text-right font-black text-sm whitespace-nowrap ${
                      isTransfer ? 'text-amber-600' : tx.type === 'income' ? 'text-emerald-600' : 'text-slate-800'
                    }`}>
                      {isTransfer ? '⇄' : tx.type === 'income' ? '+' : '-'} {formatRupiah(tx.amount)}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-5 text-center">
                      <button
                        id={`btn-delete-tx-${tx.id}`}
                        onClick={() => onDeleteTransaction(tx.id)}
                        title="Hapus Catatan"
                        className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-all cursor-pointer inline-flex items-center justify-center shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile Version Card-list */}
          <div className="md:hidden divide-y divide-slate-150 text-xs">
            {filteredTransactions.map((tx) => {
              const bucketLabel = getBucketLabel(tx.bucketId);
              const isTransfer = tx.type === 'transfer';
              const sourceAcc = getAccountLabel(tx.accountId);
              const destAcc = getAccountLabel(tx.toAccountId);

              return (
                <div 
                  key={tx.id} 
                  id={`card-tx-mobile-${tx.id}`}
                  className="p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">
                      {formatIndoDate(tx.date)}
                    </span>
                    
                    <button
                      id={`btn-delete-tx-mobile-${tx.id}`}
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-800 leading-snug">
                      {tx.description}
                    </h4>
                    
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {/* Financial status indicators */}
                      {isTransfer ? (
                        <>
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-600">
                            🔄 Transfer
                          </span>
                          <span className={`px-1.5 py-0.5 border rounded text-[9px] font-bold ${sourceAcc.bg}`}>
                            {sourceAcc.name}
                          </span>
                          <span className="text-slate-400 text-[10px]">➔</span>
                          <span className={`px-1.5 py-0.5 border rounded text-[9px] font-bold ${destAcc.bg}`}>
                            {destAcc.name}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className={`inline-flex items-center px-1.5 py-0.5 border rounded text-[9px] font-black ${sourceAcc.bg}`}>
                            🏦 {sourceAcc.name}
                          </span>
                          
                          <span className={`inline-flex items-center px-1.5 py-0.5 border rounded text-[9px] font-black ${bucketLabel.bg}`}>
                            🏷️ {bucketLabel.name}
                          </span>

                          {tx.type === 'income' ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-emerald-600">
                              + Pemasukan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-rose-600">
                              - Pengeluaran
                            </span>
                          )}

                          {tx.category && (
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-50 border border-slate-205 rounded text-[9px] font-bold text-slate-600">
                              🔖 {tx.category}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className={`pt-1 font-black text-sm ${
                    isTransfer ? 'text-amber-600' : tx.type === 'income' ? 'text-emerald-600' : 'text-slate-850'
                  }`}>
                    {isTransfer ? '⇄' : tx.type === 'income' ? '+' : '-'} {formatRupiah(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
