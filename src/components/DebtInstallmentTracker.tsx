import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Check, 
  Calendar, 
  Percent, 
  IndianRupee, 
  AlertCircle, 
  TrendingDown, 
  TrendingUp, 
  ReceiptJapaneseYen,
  CreditCard,
  UserCheck,
  CircleDollarSign,
  DollarSign
} from 'lucide-react';

export interface DebtItem {
  id: string;
  type: 'debt' | 'receivable' | 'installment';
  title: string;
  totalAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: 'active' | 'paid';
  notes: string;
  monthlyPayment?: number; // Optional for installment monthly cost
}

interface DebtInstallmentTrackerProps {
  items: DebtItem[];
  onAddItem: (item: DebtItem) => void;
  onUpdateItem: (id: string, updated: Partial<DebtItem>) => void;
  onDeleteItem: (id: string) => void;
}

export default function DebtInstallmentTracker({ 
  items, 
  onAddItem, 
  onUpdateItem, 
  onDeleteItem 
}: DebtInstallmentTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [type, setType] = useState<'debt' | 'receivable' | 'installment'>('debt');
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Payment popup state
  const [payingItemId, setPayingItemId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Nama atau judul harus diisi!');
      return;
    }

    const parsedTotal = parseFloat(totalAmount.replace(/[^0-9]/g, ''));
    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      setErrorMsg('Jumlah total harus berupa angka valid di atas nol!');
      return;
    }

    const parsedMonthly = type === 'installment' 
      ? parseFloat(monthlyPayment.replace(/[^0-9]/g, ''))
      : undefined;

    if (type === 'installment' && (isNaN(parsedMonthly || 0) || (parsedMonthly || 0) <= 0)) {
      setErrorMsg('Cicilan bulanan harus diisi untuk opsi Cicilan!');
      return;
    }

    const newItem: DebtItem = {
      id: `debt-${Date.now()}`,
      type,
      title: title.trim(),
      totalAmount: parsedTotal,
      remainingAmount: parsedTotal,
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      notes: notes.trim(),
      monthlyPayment: parsedMonthly
    };

    onAddItem(newItem);
    
    // Reset states
    setTitle('');
    setTotalAmount('');
    setMonthlyPayment('');
    setDueDate('');
    setNotes('');
    setShowAddForm(false);
  };

  const handlePayPartial = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');

    const item = items.find(i => i.id === payingItemId);
    if (!item) return;

    const parsedPay = parseFloat(paymentAmount.replace(/[^0-9]/g, ''));
    if (isNaN(parsedPay) || parsedPay <= 0) {
      setPaymentError('Ketik jumlah pembayaran yang valid!');
      return;
    }

    if (parsedPay > item.remainingAmount) {
      setPaymentError('Jumlah pembayaran melampaui sisa tagihan!');
      return;
    }

    const newRemaining = item.remainingAmount - parsedPay;
    const isPaid = newRemaining <= 0.05; // Treat close to zero as fully paid

    onUpdateItem(item.id, {
      remainingAmount: isPaid ? 0 : newRemaining,
      status: isPaid ? 'paid' : 'active'
    });

    setPayingItemId(null);
    setPaymentAmount('');
  };

  // Summarize stats
  const totalDebts = items.filter(i => i.type === 'debt' && i.status === 'active')
    .reduce((acc, curr) => acc + curr.remainingAmount, 0);

  const totalReceivables = items.filter(i => i.type === 'receivable' && i.status === 'active')
    .reduce((acc, curr) => acc + curr.remainingAmount, 0);

  const totalMonthlyCicilan = items.filter(i => i.type === 'installment' && i.status === 'active')
    .reduce((acc, curr) => acc + (curr.monthlyPayment || 0), 0);

  return (
    <div id="debt-tracker-root" className="space-y-6">
      
      {/* Dynamic Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Debts (Hutang Anda) */}
        <div className="bg-rose-50 border border-rose-100 p-4.5 rounded-2xl flex items-center gap-4 shadow-3xs">
          <div className="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-sm">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-black text-rose-700 uppercase tracking-wider">Hutang Aktif Anda</span>
            <span className="block text-lg font-extrabold text-rose-900">{formatRupiah(totalDebts)}</span>
            <span className="text-[9px] font-semibold text-rose-500 leading-none">Yang harus Anda lunasi</span>
          </div>
        </div>

        {/* Card 2: Receivables (Piutang / Tagihan ke Orang Lain) */}
        <div className="bg-emerald-50 border border-emerald-100 p-4.5 rounded-2xl flex items-center gap-4 shadow-3xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-black text-emerald-700 uppercase tracking-wider">Piutang Aktif (Hak Anda)</span>
            <span className="block text-lg font-extrabold text-emerald-900">{formatRupiah(totalReceivables)}</span>
            <span className="text-[9px] font-semibold text-emerald-500 leading-none">Uang Anda di orang lain</span>
          </div>
        </div>

        {/* Card 3: Installments (Cicilan Bulanan) */}
        <div className="bg-indigo-50 border border-indigo-100 p-4.5 rounded-2xl flex items-center gap-4 shadow-3xs">
          <div className="w-12 h-12 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-sm">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-black text-indigo-700 uppercase tracking-wider">Beban Cicilan Bulanan</span>
            <span className="block text-lg font-extrabold text-indigo-900">{formatRupiah(totalMonthlyCicilan)}</span>
            <span className="text-[9px] font-semibold text-indigo-500 leading-none">Pengeluaran rutin bulanan</span>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5">
            <CircleDollarSign className="w-4 h-4 text-indigo-600" />
            Buku Hutang, Piutang & Cicilan Keluarga
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
            Pantau komitmen finansial keluarga, utang piutang, dan anuitas cicilan per-bulan secara sinkron.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setErrorMsg('');
          }}
          className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-2xs font-extrabold rounded-xl transition-all flex items-center gap-1 shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah Catatan
        </button>
      </div>

      {/* Add New Record Form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 max-w-xl animate-fadeIn">
          <span className="block text-xs font-black text-slate-700 uppercase tracking-wider">Formulir Kredit Baru</span>
          
          <div className="grid grid-cols-3 gap-2">
            {(['debt', 'receivable', 'installment'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  setErrorMsg('');
                }}
                className={`py-2 px-3 text-2xs font-black rounded-xl transition-all cursor-pointer text-center ${
                  type === t 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t === 'debt' ? 'Saya Berhutang' : t === 'receivable' ? 'Orang Berhutang' : 'Tagihan Cicilan'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-600 uppercase">Nama / Keterangan Komitmen *</label>
              <input
                type="text"
                maxLength={45}
                placeholder="Contoh: Utang motor, Piutang ke Om Jono"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-250 bg-white rounded-xl text-xs font-bold text-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-600 uppercase">Jumlah Total Saldo (Bilah Rp) *</label>
              <input
                type="text"
                placeholder="Contoh: 15.000.000"
                value={totalAmount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setTotalAmount(raw ? Number(raw).toLocaleString('id-ID') : '');
                }}
                className="w-full px-3 py-2 border border-slate-250 bg-white rounded-xl text-xs font-bold text-slate-800"
              />
            </div>

            {type === 'installment' && (
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600 uppercase">Cicilan Setoran Bulanan *</label>
                <input
                  type="text"
                  placeholder="Contoh: 750.000"
                  value={monthlyPayment}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setMonthlyPayment(raw ? Number(raw).toLocaleString('id-ID') : '');
                  }}
                  className="w-full px-3 py-2 border border-slate-250 bg-white rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-600 uppercase">Batas Waktu Pelunasan / Tempo *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-250 bg-white rounded-xl text-xs font-medium text-slate-800"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-600 uppercase">Catatan Tambahan (Opsional)</label>
            <textarea
              rows={2}
              placeholder="Detail tambahan, nomor rekening ybs, atau histori cicilan"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-250 bg-white rounded-xl text-xs font-medium text-slate-800"
            />
          </div>

          {errorMsg && (
            <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-xl text-center">
              {errorMsg}
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="py-1.5 px-3 bg-white border border-slate-200 text-slate-700 text-2xs font-extrabold rounded-xl transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-2xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Simpan Komitmen
            </button>
          </div>
        </form>
      )}

      {/* Main Commitments Layout / Rows */}
      {items.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
          <p className="text-xs text-slate-400 font-bold">Belum ada komitmen hutang, piutang, maupun cicilan keluarga.</p>
          <p className="text-[10px] text-slate-400 font-medium">Data aman disimpan sinkron di Saku Bersama cloud server Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => {
            const isCompleted = it.status === 'paid' || it.remainingAmount <= 0;
            const progress = it.totalAmount > 0 
              ? Math.round(((it.totalAmount - it.remainingAmount) / it.totalAmount) * 100)
              : 100;

            return (
              <div 
                key={it.id} 
                className={`bg-white border text-left p-4.5 rounded-2xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                  isCompleted 
                    ? 'border-slate-100 bg-slate-50/50 opacity-60' 
                    : it.type === 'debt' 
                    ? 'border-rose-100 hover:border-rose-205 hover:bg-rose-50/10' 
                    : it.type === 'receivable'
                    ? 'border-emerald-100 hover:border-emerald-205 hover:bg-emerald-50/10'
                    : 'border-indigo-100 hover:border-indigo-205 hover:bg-indigo-50/10'
                }`}
              >
                <div>
                  {/* Item Header */}
                  <div className="flex items-start justify-between mb-2">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      it.type === 'debt' 
                        ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                        : it.type === 'receivable'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    }`}>
                      {it.type === 'debt' ? 'Utang Saya' : it.type === 'receivable' ? 'Piutang' : 'Cicilan'}
                    </span>

                    <div className="flex items-center gap-1">
                      {!isCompleted && (
                        <button
                          onClick={() => {
                            setPayingItemId(it.id);
                            setPaymentAmount('');
                            setPaymentError('');
                          }}
                          className="text-2xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                        >
                          Bayar Rp
                        </button>
                      )}
                      
                      <button
                        onClick={() => onDeleteItem(it.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 hover:bg-slate-50 rounded"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title and stats details */}
                  <h4 className={`font-extrabold text-xs text-slate-800 tracking-tight leading-snug ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                    {it.title}
                  </h4>
                  {it.notes && (
                    <p className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-2">
                      {it.notes}
                    </p>
                  )}

                  {/* Ledger Balance progress */}
                  <div className="mt-3.5">
                    <div className="flex items-baseline justify-between text-[10px] text-slate-500 font-sans font-bold">
                      <span>Sisa: {formatRupiah(it.remainingAmount)}</span>
                      <span>Total: {formatRupiah(it.totalAmount)}</span>
                    </div>

                    {/* Progress Bar visualizer */}
                    <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-350 ${
                          it.type === 'debt' 
                            ? 'bg-rose-500' 
                            : it.type === 'receivable'
                            ? 'bg-emerald-500'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 mt-1">
                      <span>Terbayar: {progress}%</span>
                      {it.dueDate && (
                        <span className="flex items-center gap-0.5 font-bold">
                          <Calendar className="w-2.5 h-2.5 text-slate-400" />
                          Tempo: {it.dueDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {it.monthlyPayment ? (
                    <div className="mt-2.5 bg-slate-50 border border-slate-100 p-1.5 rounded-xl text-center flex justify-between items-center text-[9px] font-bold text-slate-600">
                      <span>Angsuran Bulanan:</span>
                      <span className="text-indigo-700 font-extrabold">{formatRupiah(it.monthlyPayment)}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Payment Popup Modal */}
      {payingItemId && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 max-w-sm w-full shadow-lg space-y-4">
            <span className="block text-xs font-black text-slate-700 uppercase tracking-widest text-center">Catat Setoran Pembayaran</span>
            
            <p className="text-[10px] text-slate-450 leading-relaxed text-center font-medium">
              Masukkan dana pembayaran sebagian atau pelunasan cicilan ini. Catatan di dalam buku komitmen akan diperbarui.
            </p>

            <form onSubmit={handlePayPartial} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-[9px] font-black text-slate-600 uppercase">Jumlah Bayar Setoran (Rp)</label>
                <input
                  type="text"
                  placeholder="Contoh: 500.000"
                  value={paymentAmount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setPaymentAmount(raw ? Number(raw).toLocaleString('id-ID') : '');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-800 text-center focus:ring-2 focus:ring-indigo-150 focus:outline-hidden"
                />
              </div>

              {paymentError && (
                <p className="text-[10px] font-bold text-rose-600 text-center leading-snug">{paymentError}</p>
              )}

              <div className="flex gap-2 pt-1 font-sans font-bold">
                <button
                  type="button"
                  onClick={() => setPayingItemId(null)}
                  className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-2xs font-extrabold rounded-xl transition-all cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-2xs font-bold rounded-xl transition-all cursor-pointer text-center shadow-md shadow-indigo-600/10"
                >
                  Proses Bayar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
