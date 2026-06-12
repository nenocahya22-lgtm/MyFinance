import React, { useState, useEffect } from 'react';
import { PlusCircle, ArrowDownCircle, ArrowUpCircle, Landmark, Layers, Tag } from 'lucide-react';
import { TransactionType, Account, AllocationBucket } from '../types';

export const EXPENSE_CATEGORIES = [
  '🍔 Makanan & Minuman',
  '🚗 Transportasi',
  '🎮 Hiburan & Hobi',
  '🛒 Belanja Bulanan',
  '⚡ Tagihan & Utilitas',
  '🏥 Kesehatan',
  '🎓 Pendidikan',
  '📈 Investasi',
  '📦 Lain-lain'
];

export const INCOME_CATEGORIES = [
  '💼 Gaji & Pendapatan Utama',
  '🏪 Hasil Jualan & Usaha',
  '🎁 Bonus & Hadiah',
  '🏦 Investasi & Bunga',
  '💵 Lain-lain'
];

interface TransactionFormProps {
  accounts: Account[];
  buckets: AllocationBucket[];
  selectedMonth?: string;
  onAddTransaction: (data: {
    type: TransactionType;
    amount: number;
    description: string;
    date: string;
    bucketId: string;
    accountId: string;
    category?: string;
  }) => void;
}

export default function TransactionForm({ accounts, buckets, selectedMonth, onAddTransaction }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>('income');
  const [amountInput, setAmountInput] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const today = new Date().toISOString().substring(0, 10);
  const [date, setDate] = useState<string>(today);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedBucketId, setSelectedBucketId] = useState<string>('umum');
  const [category, setCategory] = useState<string>('💼 Gaji & Pendapatan Utama');
  const [error, setError] = useState<string>('');

  // Switch default category on type change
  useEffect(() => {
    if (type === 'expense') {
      setCategory('🍔 Makanan & Minuman');
    } else {
      setCategory('💼 Gaji & Pendapatan Utama');
    }
  }, [type]);

  // Sync date with selectedMonth bookkeeping
  useEffect(() => {
    if (selectedMonth && selectedMonth !== 'all') {
      const todayStr = new Date().toISOString().substring(0, 10);
      if (todayStr.startsWith(selectedMonth)) {
        setDate(todayStr);
      } else {
        setDate(`${selectedMonth}-01`);
      }
    } else {
      setDate(new Date().toISOString().substring(0, 10));
    }
  }, [selectedMonth]);

  // Fallback to first available account
  useEffect(() => {
    if (accounts.length > 0 && (!selectedAccountId || !accounts.some(a => a.id === selectedAccountId))) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // Currency helper formatting
  const formatRupiahPreview = (val: string) => {
    const num = parseFloat(val.replace(/[^0-9]/g, ''));
    if (isNaN(num)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanValue = e.target.value.replace(/[^0-9]/g, '');
    setAmountInput(cleanValue);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseInt(amountInput, 10);
    if (!amountInput || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Nominal harus berupa angka lebih besar dari 0!');
      return;
    }

    if (!description.trim()) {
      setError(
        type === 'income' 
          ? 'Keterangan "Uang masuk dari mana" wajib diisi!' 
          : 'Keterangan "Uang keluar buat apa" wajib diisi!'
      );
      return;
    }

    if (!date) {
      setError('Tanggal transaksi wajib dipilih!');
      return;
    }

    if (!selectedAccountId) {
      setError('Rekening penyimpanan wajib dipilih!');
      return;
    }

    // Call onAddTransaction with validated data
    onAddTransaction({
      type,
      amount: parsedAmount,
      description: description.trim(),
      date,
      bucketId: selectedBucketId,
      accountId: selectedAccountId,
      category
    });

    // Reset Form Fields (keep current chosen type, date & bucket for successive entries)
    setAmountInput('');
    setDescription('');
    setError('');
  };

  return (
    <div id="transaction-form-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
      <h2 id="form-title" className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
        <PlusCircle className="w-5 h-5 text-indigo-600" />
        Tambah Transaksi Baru
      </h2>

      {/* Select Transaction Type Tabs */}
      <div id="type-selector" className="grid grid-cols-2 gap-3 mb-6 p-1 bg-slate-50 rounded-xl">
        <button
          id="btn-select-income"
          type="button"
          onClick={() => {
            setType('income');
            setError('');
          }}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            type === 'income'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          <ArrowUpCircle className="w-4 h-4" />
          Uang Masuk
        </button>

        <button
          id="btn-select-expense"
          type="button"
          onClick={() => {
            setType('expense');
            setError('');
          }}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            type === 'expense'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          <ArrowDownCircle className="w-4 h-4" />
          Uang Keluar
        </button>
      </div>

      <form id="record-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Nominal */}
        <div>
          <label htmlFor="input-amount" className="block text-xs font-bold text-slate-700 mb-1.5">
            Nominal Jumlah Uang <span className="text-rose-500">*</span>
          </label>
          <div className="relative rounded-lg shadow-3xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <span className="text-slate-400 font-bold text-sm">Rp</span>
            </div>
            <input
              id="input-amount"
              type="text"
              inputMode="numeric"
              placeholder="Contoh: 150000"
              value={amountInput}
              onChange={handleAmountChange}
              className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-extrabold focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 placeholder:text-slate-450 text-lg transition-all"
            />
          </div>
          {amountInput && (
            <p id="amount-preview" className="mt-1.5 text-xs font-mono text-slate-500 flex items-center gap-1">
              Format Rupiah: <span className="font-bold text-slate-700">{formatRupiahPreview(amountInput)}</span>
            </p>
          )}
        </div>

        {/* Keterangan */}
        <div>
          <label htmlFor="input-description" className="block text-xs font-bold text-slate-700 mb-1.5">
            {type === 'income' ? (
              <span>Uang masuk dari mana? <span className="text-rose-500">*</span></span>
            ) : (
              <span>Uang keluar buat apa? <span className="text-rose-500">*</span></span>
            )}
          </label>
          <input
            id="input-description"
            type="text"
            placeholder={
              type === 'income' 
                ? 'Gaji pokok, hasil jualan, THR, bonus, dll' 
                : 'Belanja sayur, makan siang, token listrik, dll'
            }
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setError('');
            }}
            className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 placeholder:text-slate-450 text-xs font-medium transition-all"
          />
        </div>

        {/* Kategori */}
        <div>
          <label htmlFor="select-transaction-category" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-indigo-500" />
            Kategori Transaksi <span className="text-rose-500">*</span>
          </label>
          <select
            id="select-transaction-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 text-xs font-bold transition-all cursor-pointer"
          >
            {type === 'expense' ? (
              EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))
            ) : (
              INCOME_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Account Bind / Storage selector */}
        <div>
          <label htmlFor="select-transaction-account" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
            <Landmark className="w-3.5 h-3.5 text-indigo-500" />
            Simpan di Rekening / Dompet <span className="text-rose-500">*</span>
          </label>
          <select
            id="select-transaction-account"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 text-xs font-bold transition-all cursor-pointer"
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name} {acc.accountNumber ? `(${acc.accountNumber})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Allocation Pocket selector */}
        <div>
          <label htmlFor="select-transaction-bucket" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            Alokasikan ke Kantong/Saku <span className="text-slate-400 font-medium">(Opsional)</span>
          </label>
          <select
            id="select-transaction-bucket"
            value={selectedBucketId}
            onChange={(e) => setSelectedBucketId(e.target.value)}
            className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 text-xs font-bold transition-all cursor-pointer"
          >
            <option value="umum">Saku Utama (Uang Bebas)</option>
            {buckets.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tanggal Transaksi */}
        <div>
          <label htmlFor="input-date" className="block text-xs font-bold text-slate-700 mb-1.5">
            Tanggal Transaksi <span className="text-rose-500">*</span>
          </label>
          <input
            id="input-date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setError('');
            }}
            className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 text-xs font-medium transition-all"
          />
        </div>

        {/* Error Alert Box */}
        {error && (
          <div id="form-error-alert" className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-750 text-xs font-semibold flex items-center gap-2">
            <span className="w-2 h-2 bg-rose-500 rounded-full shrink-0"></span>
            {error}
          </div>
        )}

        {/* Save Button */}
        <button
          id="btn-submit-transaction"
          type="submit"
          className={`w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-xs tracking-wider uppercase transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2 ${
            type === 'income'
              ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-600/10'
              : 'bg-rose-600 hover:bg-rose-700 hover:shadow-rose-600/10'
          }`}
        >
          <span>Simpan Catatan</span>
        </button>
      </form>
    </div>
  );
}
