import React, { useState } from 'react';
import { 
  Shield, 
  GraduationCap, 
  LineChart, 
  Compass, 
  Heart,
  Plus, 
  ArrowRightLeft, 
  X,
  Target,
  Trash2,
  Calendar,
  CheckCircle,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  Inbox,
  Gem,
  Pencil
} from 'lucide-react';
import { AllocationBucket } from '../types';

interface AllocationBucketsProps {
  buckets: AllocationBucket[];
  unallocatedBalance: number;
  bucketBalances: Record<string, number>;
  onAddBucket: (bucket: Omit<AllocationBucket, 'id'>) => void;
  onDeleteBucket: (id: string) => void;
  onUpdateBucket?: (id: string, updatedData: { name: string; targetAmount: number; color: string; icon: string }) => void;
  onTransferFunds: (amount: number, targetBucketId: string, description: string) => void;
  onWithdrawFunds: (amount: number, sourceBucketId: string, description: string) => void;
  onSpendFromPocket: (amount: number, bucketId: string, description: string, dateStr: string) => void;
  onIncomeToPocket: (amount: number, bucketId: string, description: string, dateStr: string) => void;
}

const AVAILABLE_ICONS = [
  { name: 'shield', label: 'Dana Darurat / Proteksi', component: Shield },
  { name: 'gem', label: 'Tabungan / Celengan', component: Gem },
  { name: 'school', label: 'Pendidikan / Kursus', component: GraduationCap },
  { name: 'chart', label: 'Investasi / Saham', component: LineChart },
  { name: 'compass', label: 'Liburan / Hobi', component: Compass },
  { name: 'heart', label: 'Sosial / Zakat', component: Heart },
];

const AVAILABLE_COLORS = [
  { value: 'indigo', bg: 'bg-indigo-50 border-indigo-100 text-indigo-700', active: 'bg-indigo-600', hover: 'hover:bg-indigo-50' },
  { value: 'emerald', bg: 'bg-emerald-50 border-emerald-100 text-emerald-700', active: 'bg-emerald-600', hover: 'hover:bg-emerald-50' },
  { value: 'rose', bg: 'bg-rose-50 border-rose-100 text-rose-700', active: 'bg-rose-600', hover: 'hover:bg-rose-100' },
  { value: 'cyan', bg: 'bg-cyan-50 border-cyan-100 text-cyan-700', active: 'bg-cyan-600', hover: 'hover:bg-cyan-50' },
  { value: 'amber', bg: 'bg-amber-50 border-amber-100 text-amber-700', active: 'bg-amber-600', hover: 'hover:bg-amber-50' },
  { value: 'purple', bg: 'bg-purple-50 border-purple-100 text-purple-700', active: 'bg-purple-600', hover: 'hover:bg-purple-50' },
];

export default function AllocationBuckets({
  buckets,
  unallocatedBalance,
  bucketBalances,
  onAddBucket,
  onDeleteBucket,
  onUpdateBucket,
  onTransferFunds,
  onWithdrawFunds,
  onSpendFromPocket,
  onIncomeToPocket,
}: AllocationBucketsProps) {
  // Add bucket state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [newBucketTarget, setNewBucketTarget] = useState('');
  const [newBucketIcon, setNewBucketIcon] = useState('gem');
  const [newBucketColor, setNewBucketColor] = useState('indigo');
  const [bucketError, setBucketError] = useState('');

  // Edit bucket state
  const [editingBucketId, setEditingBucketId] = useState<string | null>(null);
  const [editBucketName, setEditBucketName] = useState('');
  const [editBucketTarget, setEditBucketTarget] = useState('');
  const [editBucketIcon, setEditBucketIcon] = useState('gem');
  const [editBucketColor, setEditBucketColor] = useState('indigo');
  const [editBucketError, setEditBucketError] = useState('');

  // General allocation state
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferTarget, setTransferTarget] = useState('');
  const [transferError, setTransferError] = useState('');

  // Active individual pocket management modal
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'deposit' | 'withdraw' | 'expense' | 'income'>('deposit');
  
  // Active individual forms states
  const [manageAmount, setManageAmount] = useState('');
  const [manageDescription, setManageDescription] = useState('');
  const [manageDate, setManageDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [manageError, setManageError] = useState('');
  const [manageSuccess, setManageSuccess] = useState('');

  // Format Helper
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  // Render Icon dynamically
  const renderIconComponent = (iconName: string, className: string) => {
    const iconObj = AVAILABLE_ICONS.find((i) => i.name === iconName) || AVAILABLE_ICONS[1];
    const IconComponent = iconObj.component;
    return <IconComponent className={className} />;
  };

  // Submit new bucket
  const handleCreateBucket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBucketName.trim()) {
      setBucketError('Nama alokasi wajib diisi!');
      return;
    }

    const parsedTarget = newBucketTarget ? parseInt(newBucketTarget, 10) : 0;
    if (newBucketTarget && (isNaN(parsedTarget) || parsedTarget < 0)) {
      setBucketError('Target jumlah harus berupa angka positif!');
      return;
    }

    onAddBucket({
      name: newBucketName.trim(),
      targetAmount: parsedTarget,
      color: newBucketColor,
      icon: newBucketIcon,
    });

    // Reset Form
    setNewBucketName('');
    setNewBucketTarget('');
    setBucketError('');
    setShowAddForm(false);
  };

  // Submit General Allocations from Saku Utama
  const handleGeneralTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(transferAmount, 10);
    if (!transferAmount || isNaN(amount) || amount <= 0) {
      setTransferError('Nominal alokasi harus berupa angka di atas 0!');
      return;
    }

    if (amount > unallocatedBalance) {
      setTransferError(`Dana tidak mencukupi! Saldo Bebas Utama hanya ${formatRupiah(unallocatedBalance)}`);
      return;
    }

    if (!transferTarget) {
      setTransferError('Pilih kantong alokasi tujuan!');
      return;
    }

    const targetBucket = buckets.find((b) => b.id === transferTarget);
    if (!targetBucket) {
      setTransferError('Kantong tujuan tidak valid!');
      return;
    }

    onTransferFunds(
      amount,
      transferTarget,
      `Pindahan dana ke ${targetBucket.name}`
    );

    // Reset Form
    setTransferAmount('');
    setTransferError('');
    setShowTransferForm(false);
  };

  // Submit individual pocket manage action
  const handleManageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManageError('');
    setManageSuccess('');

    const targetBucket = buckets.find(b => b.id === selectedBucketId);
    if (!targetBucket) return;

    const amount = parseInt(manageAmount, 10);
    if (!manageAmount || isNaN(amount) || amount <= 0) {
      setManageError('Nominal rupiah harus berupa angka lebih tinggi dari 0!');
      return;
    }

    const bucketBalance = bucketBalances[targetBucket.id] || 0;

    if (selectedTab === 'deposit') {
      if (amount > unallocatedBalance) {
        setManageError(`Gagal! Saldo Bebas Saku Utama saat ini tidak mencukupi (${formatRupiah(unallocatedBalance)})`);
        return;
      }
      onTransferFunds(amount, targetBucket.id, manageDescription.trim() || `Dana dialokasikan mandiri`);
      setManageSuccess(`Berhasil mengalokasikan ${formatRupiah(amount)} ke ${targetBucket.name}!`);
    } 
    
    else if (selectedTab === 'withdraw') {
      if (amount > bucketBalance) {
        setManageError(`Gagal! Saldo di ${targetBucket.name} tidak cukup untuk ditarik (${formatRupiah(bucketBalance)})`);
        return;
      }
      onWithdrawFunds(amount, targetBucket.id, manageDescription.trim() || `Ditarik kembali ke Saku Utama`);
      setManageSuccess(`Berhasil memulihkan ${formatRupiah(amount)} ke Saku Utama!`);
    } 
    
    else if (selectedTab === 'expense') {
      if (amount > bucketBalance) {
        setManageError(`Dana di ${targetBucket.name} tidak mencukupi (${formatRupiah(bucketBalance)})`);
        return;
      }
      if (!manageDescription.trim()) {
        setManageError('Keterangan pengeluaran saku wajib ditulis!');
        return;
      }
      onSpendFromPocket(amount, targetBucket.id, manageDescription.trim(), manageDate);
      setManageSuccess(`Pengeluaran saku sebesar ${formatRupiah(amount)} berhasil disimpan!`);
    } 
    
    else if (selectedTab === 'income') {
      if (!manageDescription.trim()) {
        setManageError('Keterangan sumber pemasukan saku wajib ditulis!');
        return;
      }
      onIncomeToPocket(amount, targetBucket.id, manageDescription.trim(), manageDate);
      setManageSuccess(`Pendapatan saku sebesar ${formatRupiah(amount)} berhasil ditambahkan!`);
    }

    // Delay form close
    setTimeout(() => {
      setSelectedBucketId(null);
      setManageAmount('');
      setManageDescription('');
      setManageError('');
      setManageSuccess('');
    }, 1200);
  };

  const currentSelectedBucket = buckets.find(b => b.id === selectedBucketId);
  const currentSelectedBucketBalance = currentSelectedBucket ? (bucketBalances[currentSelectedBucket.id] || 0) : 0;

  return (
    <div id="allocation-manager-section" className="space-y-6">
      
      {/* Dynamic Header Box for Allocation Grid */}
      <div id="allocations-sub-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 id="allocation-deck-title" className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Kantong Alokasi Mandiri
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Bagi dana dari saku utama ke pos-pos khusus (Tabungan, Dana Darurat, Dana Investasi, dll.) agar tidak saling bercampur.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {buckets.length > 0 && unallocatedBalance > 0 && (
            <button
              id="btn-trigger-transfer"
              onClick={() => {
                setShowTransferForm(!showTransferForm);
                setShowAddForm(false);
              }}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-300" />
              Alokasikan Dana
            </button>
          )}
          <button
            id="btn-trigger-add-bucket"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setShowTransferForm(false);
            }}
            className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Buat Kantong Baru
          </button>
        </div>
      </div>

      {/* 1. Modal / Form - Create Allocation Saku */}
      {showAddForm && (
        <div id="add-bucket-card" className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1">
              <Plus className="w-3.5 h-3.5 text-indigo-500" /> Buat Kantong Alokasi Baru
            </h4>
            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateBucket} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nama Kantong / Peruntukan <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="Contoh: Tabungan Liburan, Dana Darurat, Pendidikan Anak"
                  value={newBucketName}
                  onChange={(e) => {
                    setNewBucketName(e.target.value);
                    setBucketError('');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Target Jumlah (Rp) <span className="text-slate-400 font-normal">(Opsional)</span></label>
                <input
                  type="number"
                  placeholder="Contoh: 15000000"
                  value={newBucketTarget}
                  onChange={(e) => {
                    setNewBucketTarget(e.target.value);
                    setBucketError('');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-slate-50"
                />
              </div>
            </div>

            {/* Icon Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">Pilih Icon Representasi</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {AVAILABLE_ICONS.map((ico) => {
                  const Icon = ico.component;
                  return (
                    <button
                      key={ico.name}
                      type="button"
                      onClick={() => setNewBucketIcon(ico.name)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        newBucketIcon === ico.name
                          ? 'border-indigo-500 bg-indigo-50/50 text-indigo-750'
                          : 'border-slate-150 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="text-[9px] text-slate-400 truncate w-full text-center font-normal">{ico.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Pilih Warna Aksen</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_COLORS.map((col) => (
                  <button
                    key={col.value}
                    type="button"
                    onClick={() => setNewBucketColor(col.value)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-bold capitalize transition-all flex items-center gap-1.5 cursor-pointer ${
                      newBucketColor === col.value
                        ? 'border-indigo-600 ring-2 ring-indigo-100 font-extrabold shadow-3xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${col.active}`}></span>
                    {col.value}
                  </button>
                ))}
              </div>
            </div>

            {bucketError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg leading-snug">
                {bucketError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Buat Saku Alokasi
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Modal / Form - Transfer / Allocations Distributor */}
      {showTransferForm && (
        <div id="transfer-funds-card" className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-850">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 font-sans">
            <div>
              <h4 className="text-xs font-extrabold text-indigo-300 uppercase tracking-widest flex items-center gap-1">
                <ArrowRightLeft className="w-3.5 h-3.5" /> Alokasikan Saldo Bebas Utama
              </h4>
              <p className="text-[10px] text-slate-400 mt-1">
                Ambil tabungan yang mengendap bebas di Saku Utama lalu distribusikan ke Pos Saku pilihan Anda.
              </p>
            </div>
            <button onClick={() => setShowTransferForm(false)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleGeneralTransfer} className="space-y-4">
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold">SALDO BEBAS UTAMA (SIAP DIALOKASIKAN)</span>
                <span className="text-sm font-extrabold text-emerald-400">{formatRupiah(unallocatedBalance)}</span>
              </div>
              <span className="text-2xs font-semibold text-slate-400 italic">Siap Terdistribusi</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-2xs font-bold text-slate-300 mb-1">Nominal yang Akan Dipindahkan <span className="text-rose-400">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-2xs font-extrabold">Rp</span>
                  </div>
                  <input
                    type="number"
                    placeholder="Contoh: 500000"
                    value={transferAmount}
                    onChange={(e) => {
                      setTransferAmount(e.target.value);
                      setTransferError('');
                    }}
                    className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-300 mb-1">Pilih Kantong Pos Alokasi <span className="text-rose-400">*</span></label>
                <select
                  value={transferTarget}
                  onChange={(e) => {
                    setTransferTarget(e.target.value);
                    setTransferError('');
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">-- Pilih Kantong --</option>
                  {buckets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Tersimpan: {formatRupiah(bucketBalances[b.id] || 0)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {transferError && (
              <div className="p-3 bg-rose-950/50 border border-rose-900 text-rose-300 text-xs font-bold rounded-lg leading-snug">
                {transferError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-extrabold rounded-lg cursor-pointer transition-all"
              >
                Konfirmasi Transfer / Alokasi
              </button>
              <button
                type="button"
                onClick={() => setShowTransferForm(false)}
                className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Render Allocation Pockets / Saving Pots Cards Block */}
      {buckets.length === 0 ? (
        /* Saku / Pockets Empty State */
        <div id="buckets-empty-fallback" className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl mx-auto flex items-center justify-center mb-3">
            <Gem className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-slate-700">Belum Ada Saku Alokasi Terjadwal</p>
          <p className="text-2xs text-slate-400 max-w-sm mx-auto mt-1 leading-normal">
            Gunakan tombol <strong className="text-indigo-600 font-extrabold cursor-pointer" onClick={() => setShowAddForm(true)}>"Buat Kantong Baru"</strong> di atas untuk membuat pos khusus keuangan keluarga Anda, seperti Dana Darurat, Tabungan Liburan, Biaya Zakat, dll.
          </p>
        </div>
      ) : (
        /* Bento Grid of Active Buckets */
        <div id="allocation-bento-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {buckets.map((b) => {
            const currentAmount = bucketBalances[b.id] || 0;
            const target = b.targetAmount;
            const percent = target > 0 ? Math.min(100, Math.round((currentAmount / target) * 100)) : 0;
            const colorClass = AVAILABLE_COLORS.find((c) => c.value === b.color) || AVAILABLE_COLORS[0];

            return (
              <div
                key={b.id}
                id={`bucket-bento-card-${b.id}`}
                className="bg-white border border-slate-100 hover:border-slate-300 rounded-2xl p-5 shadow-3xs hover:shadow-xs transition-all relative group overflow-hidden"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${colorClass.bg} border shrink-0`}>
                    {renderIconComponent(b.icon, 'w-5 h-5')}
                  </div>

                  <div className="flex items-center gap-1 transition-all shrink-0">
                    {onUpdateBucket && (
                      <button
                        onClick={() => {
                          setEditingBucketId(b.id);
                          setEditBucketName(b.name);
                          setEditBucketTarget(String(b.targetAmount || 0));
                          setEditBucketIcon(b.icon || 'gem');
                          setEditBucketColor(b.color || 'indigo');
                          setEditBucketError('');
                        }}
                        title="Edit Kantong Alokasi"
                        className="text-slate-450 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      id={`btn-delete-bucket-${b.id}`}
                      onClick={() => {
                        if (window.confirm(`Hapus Kantong "${b.name}"? Segala transaksi keuangan yang terekam di dalam kantong alokasi ini tidak akan hilang, melainkan kembali diletakkan sebagai Kas Saku Utama.`)) {
                          onDeleteBucket(b.id);
                        }
                      }}
                      title="Hapus Kantong Alokasi"
                      className="text-slate-450 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Saku Meta */}
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 text-sm truncate pr-4" title={b.name}>
                    {b.name}
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-extrabold text-slate-900">
                      {formatRupiah(currentAmount)}
                    </span>
                    {percent >= 100 ? (
                      <span className="inline-flex items-center bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border border-rose-100">
                        Overspent
                      </span>
                    ) : percent >= 85 ? (
                      <span className="inline-flex items-center bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border border-amber-100 animate-pulse">
                        Suhu Anggaran
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Target Progress Bar */}
                {target > 0 ? (
                  <div className="mt-4 pt-1 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 font-sans">
                      <span>Target: {formatRupiah(target)}</span>
                      <span className={`${colorClass.bg} px-1.5 py-0.5 rounded-sm`}>{percent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full ${colorClass.active} rounded-full transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 pt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-50 text-slate-500 uppercase tracking-widest border border-slate-100">
                      Tabungan Fleksibel
                    </span>
                  </div>
                )}

                {/* QUICK MANUAL MANAGE TRIGGER */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    id={`btn-manage-bucket-${b.id}`}
                    onClick={() => {
                      setManageAmount('');
                      setManageDescription('');
                      setManageError('');
                      setManageSuccess('');
                      setSelectedBucketId(b.id);
                      setSelectedTab('deposit');
                    }}
                    className="w-full py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-650 text-[11px] font-bold rounded-xl transition-all border border-slate-200/60 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
                    Kelola Saldo Saku
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* INDIVIDUAL POCKET TRANSACTION MANAGEMENT MODAL */}
      {selectedBucketId && currentSelectedBucket && (
        <div id="pocket-management-modal-backdrop" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-3xs flex items-center justify-center p-4">
          <div id="pocket-management-modal-content" className="w-full max-w-md bg-white rounded-3xl border border-slate-150 shadow-2xl overflow-hidden p-6 relative">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-750 border border-indigo-100 rounded-lg">
                  {renderIconComponent(currentSelectedBucket.icon, 'w-4 h-4')}
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Kelola Keuangan Saku</h3>
                  <p className="text-[10px] text-slate-400 font-bold">{currentSelectedBucket.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedBucketId(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Balances Status Row */}
            <div className="grid grid-cols-2 gap-3 mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div>
                <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Saldo Saku ini</span>
                <span className="text-xs font-black text-slate-800">{formatRupiah(currentSelectedBucketBalance)}</span>
              </div>
              <div>
                <span className="block text-[8px] font-black uppercase text-indigo-500 tracking-wider">Saldo Bebas Utama</span>
                <span className="text-xs font-black text-indigo-600">{formatRupiah(unallocatedBalance)}</span>
              </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl mb-4 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => {
                  setSelectedTab('deposit');
                  setManageError('');
                }}
                className={`py-2 rounded-lg text-center transition-all cursor-pointer ${
                  selectedTab === 'deposit'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-850'
                }`}
                title="Pindahkan uang dari Saku Utama ke Pos ini"
              >
                Isi Pos
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTab('withdraw');
                  setManageError('');
                }}
                className={`py-2 rounded-lg text-center transition-all cursor-pointer ${
                  selectedTab === 'withdraw'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-850'
                }`}
                title="Tarik uang dari Pos ini kembali ke Saku Utama"
              >
                Tarik
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTab('expense');
                  setManageError('');
                }}
                className={`py-2 rounded-lg text-center transition-all cursor-pointer ${
                  selectedTab === 'expense'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-850'
                }`}
                title="Catat belanja langsung didebit dari Pos ini"
              >
                Belanja
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTab('income');
                  setManageError('');
                }}
                className={`py-2 rounded-lg text-center transition-all cursor-pointer ${
                  selectedTab === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-850'
                }`}
                title="Catat pemasukan mandiri untuk Pos ini"
              >
                Pendapatan
              </button>
            </div>

            {/* ACTIVE ACTION PANEL DESCRIPTION */}
            <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 mb-4 text-slate-650 text-[10px] leading-relaxed">
              {selectedTab === 'deposit' && (
                <span>💡 <strong>Isi Saku</strong> - Memindahkan sebagian saldo yang mengendap bebas di Saku Utama ke dalam Saku <strong>{currentSelectedBucket.name}</strong> ini.</span>
              )}
              {selectedTab === 'withdraw' && (
                <span>💡 <strong>Tarik Dana</strong> - Mengambil saldo dari dalam Saku <strong>{currentSelectedBucket.name}</strong> untuk dipulihkan kembali ke Kas Saku Utama yang ber-saldo mengendap bebas.</span>
              )}
              {selectedTab === 'expense' && (
                <span>💡 <strong>Belanja Langsung</strong> - Mencatat pembelanjaan barang/keperluan domestik yang biayanya dibebankan langsung untuk didebit mengurangi saldo Saku <strong>{currentSelectedBucket.name}</strong>.</span>
              )}
              {selectedTab === 'income' && (
                <span>💡 <strong>Masukan Langsung</strong> - Mencatat uang masuk/pendapatan operasional atau hadiah baru diluar saku utama, langsung ditambahkan menyatu ke Saku <strong>{currentSelectedBucket.name}</strong>.</span>
              )}
            </div>

            {/* FORM */}
            <form onSubmit={handleManageSubmit} className="space-y-4 font-sans text-xs">
              
              {/* Nominal */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nominal Jumlah (Rp) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-bold text-[11px]">Rp</span>
                  </div>
                  <input
                    type="number"
                    placeholder="Contoh: 150000"
                    value={manageAmount}
                    onChange={(e) => {
                      setManageAmount(e.target.value);
                      setManageError('');
                    }}
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl font-extrabold focus:outline-hidden focus:ring-4 focus:ring-indigo-100 bg-slate-50 focus:bg-white transition-all text-sm"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {selectedTab === 'deposit' || selectedTab === 'withdraw' ? 'Keterangan Pemindahan (Opsional)' : 'Keterangan / Keperluan Transaksi *'}
                </label>
                <input
                  type="text"
                  placeholder={
                    selectedTab === 'deposit' ? 'Contoh: Sisihan bonus bulanan' :
                    selectedTab === 'withdraw' ? 'Contoh: Cairkan untuk beli beras' :
                    selectedTab === 'expense' ? 'Contoh: Beli asuransi, servis mobil' : 'Contoh: Dividen investasi, THR masuk'
                  }
                  value={manageDescription}
                  onChange={(e) => {
                    setManageDescription(e.target.value);
                    setManageError('');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold focus:outline-hidden focus:ring-4 focus:ring-indigo-100 bg-slate-50 focus:bg-white transition-all"
                />
              </div>

              {/* Date Input for transactions (expense/income only) */}
              {(selectedTab === 'expense' || selectedTab === 'income') && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tanggal Transaksi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={manageDate}
                    onChange={(e) => setManageDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold focus:outline-hidden focus:ring-4 focus:ring-indigo-100 bg-slate-50 focus:bg-white transition-all"
                  />
                </div>
              )}

              {/* Error Alert panel */}
              {manageError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 font-bold leading-normal text-center text-xs">
                  {manageError}
                </div>
              )}

              {/* Success Alert panel */}
              {manageSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-850 font-bold leading-normal text-center text-xs flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  {manageSuccess}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedBucketId(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 text-white rounded-xl cursor-pointer shadow-xs transition-colors ${
                    selectedTab === 'deposit' ? 'bg-indigo-600 hover:bg-indigo-700' :
                    selectedTab === 'withdraw' ? 'bg-amber-600 hover:bg-amber-700' :
                    selectedTab === 'expense' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-605 bg-emerald-600 hover:bg-emerald-750'
                  }`}
                >
                  {selectedTab === 'deposit' ? 'Lakukan Alokasi' :
                   selectedTab === 'withdraw' ? 'Ambil Uang' :
                   selectedTab === 'expense' ? 'Catat Pengeluaran' : 'Catat Pemasukan'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* EDIT BUCKET MODAL */}
      {editingBucketId && onUpdateBucket && (
        <div id="edit-bucket-modal-backdrop" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-3xs flex items-center justify-center p-4">
          <div id="edit-bucket-modal-content" className="w-full max-w-sm bg-white rounded-3xl border border-slate-150 shadow-2xl overflow-hidden p-6 relative">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Gem className="w-4 h-4 text-indigo-650" />
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Ubah Detil Saku</h3>
              </div>
              <button 
                onClick={() => setEditingBucketId(null)}
                className="text-slate-400 hover:text-slate-655 p-1 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!editBucketName.trim()) {
                setEditBucketError('Nama saku wajib diisi.');
                return;
              }
              const targetVal = parseInt(editBucketTarget.replace(/[^0-9]/g, ''), 10) || 0;
              onUpdateBucket(editingBucketId, {
                name: editBucketName.trim(),
                targetAmount: targetVal,
                icon: editBucketIcon,
                color: editBucketColor,
              });
              setEditingBucketId(null);
            }} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Nama Kantong Alokasi</label>
                <input
                  type="text"
                  value={editBucketName}
                  onChange={(e) => setEditBucketName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-bold focus:outline-hidden focus:border-indigo-500 text-slate-850"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Target Alokasi IDR (Biarkan 0 jika fleksibel)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-450 text-xs">Rp</span>
                  <input
                    type="text"
                    value={editBucketTarget}
                    onChange={(e) => setEditBucketTarget(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-extrabold text-slate-800 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Selector for Icon */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Pilih Icon Representasi</label>
                <div className="grid grid-cols-6 gap-2">
                  {AVAILABLE_ICONS.map((ico) => {
                    const IconComponent = ico.component;
                    const isSelected = editBucketIcon === ico.name;
                    return (
                      <button
                        key={ico.name}
                        type="button"
                        onClick={() => setEditBucketIcon(ico.name)}
                        className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-550'
                        }`}
                        title={ico.label}
                      >
                        <IconComponent className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector for Color */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Warna Identitas</label>
                <div className="grid grid-cols-6 gap-2">
                  {AVAILABLE_COLORS.map((col) => {
                    const isSelected = editBucketColor === col.value;
                    return (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => setEditBucketColor(col.value)}
                        className={`h-7 rounded-lg border-2 transition-all cursor-pointer ${col.bg} ${
                          isSelected ? 'border-amber-400 ring-2 ring-indigo-100 scale-105' : 'border-transparent'
                        }`}
                        title={col.value}
                      />
                    );
                  })}
                </div>
              </div>

              {editBucketError && (
                <p className="text-rose-600 font-extrabold text-[10px]">{editBucketError}</p>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBucketId(null)}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
