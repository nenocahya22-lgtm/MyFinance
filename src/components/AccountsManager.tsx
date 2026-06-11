import React, { useState } from 'react';
import { 
  Landmark, 
  Wallet, 
  Coins, 
  CreditCard, 
  Plus, 
  Trash2, 
  ArrowRightLeft, 
  PlusCircle, 
  CheckCircle,
  HelpCircle,
  Pencil,
  X
} from 'lucide-react';
import { Account } from '../types';

interface AccountsManagerProps {
  accounts: Account[];
  accountBalances: Record<string, number>;
  onAddAccount: (acc: Omit<Account, 'id'>) => void;
  onDeleteAccount: (id: string) => void;
  onUpdateAccount?: (id: string, updatedData: Partial<Account>) => void;
  onAddTransfer: (fromAccountId: string, toAccountId: string, amount: number, description: string, date: string) => void;
}

export default function AccountsManager({ 
  accounts, 
  accountBalances, 
  onAddAccount, 
  onDeleteAccount,
  onUpdateAccount,
  onAddTransfer
}: AccountsManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);

  // Edit account state
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBalanceType, setEditBalanceType] = useState<'bank' | 'cash' | 'e-wallet' | 'other'>('bank');
  const [editColor, setEditColor] = useState('blue');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editInitialBalanceInput, setEditInitialBalanceInput] = useState('');
  const [errorEditAccount, setErrorEditAccount] = useState('');

  // New account state
  const [name, setName] = useState('');
  const [balanceType, setBalanceType] = useState<'bank' | 'cash' | 'e-wallet' | 'other'>('bank');
  const [color, setColor] = useState('blue');
  const [accountNumber, setAccountNumber] = useState('');
  const [initialBalanceInput, setInitialBalanceInput] = useState('');
  const [errorAccount, setErrorAccount] = useState('');

  // Transfer state
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [transferAmountInput, setTransferAmountInput] = useState('');
  const [transferDesc, setTransferDesc] = useState('');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [errorTransfer, setErrorTransfer] = useState('');
  const [successTransfer, setSuccessTransfer] = useState('');

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank': return <Landmark className="w-4 h-4" />;
      case 'cash': return <Coins className="w-4 h-4" />;
      case 'e-wallet': return <Wallet className="w-4 h-4" />;
      default: return <CreditCard className="w-4 h-4" />;
    }
  };

  const colorClasses: Record<string, { bg: string; border: string; text: string; bgBadge: string }> = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-150 border-blue-200', text: 'text-blue-700', bgBadge: 'bg-blue-500' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-150 border-emerald-200', text: 'text-emerald-700', bgBadge: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-150 border-amber-200', text: 'text-amber-700', bgBadge: 'bg-amber-500' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-150 border-purple-200', text: 'text-purple-700', bgBadge: 'bg-purple-500' },
    cyan: { bg: 'bg-cyan-50', border: 'border-cyan-150 border-cyan-200', text: 'text-cyan-700', bgBadge: 'bg-cyan-500' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-150 border-indigo-200', text: 'text-indigo-700', bgBadge: 'bg-indigo-500' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-150 border-rose-200', text: 'text-rose-700', bgBadge: 'bg-rose-500' },
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAccount('');

    if (!name.trim()) {
      setErrorAccount('Nama rekening / dompet wajib diisi.');
      return;
    }

    const initBal = parseInt(initialBalanceInput.replace(/[^0-9]/g, ''), 10) || 0;

    onAddAccount({
      name: name.trim(),
      balanceType,
      color,
      accountNumber: accountNumber.trim() || undefined,
      initialBalance: initBal
    });

    setName('');
    setAccountNumber('');
    setInitialBalanceInput('');
    setShowAddForm(false);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorTransfer('');
    setSuccessTransfer('');

    if (!fromAccountId || !toAccountId) {
      setErrorTransfer('Harap pilih rekening sumber dan rekening tujuan.');
      return;
    }

    if (fromAccountId === toAccountId) {
      setErrorTransfer('Rekening sumber dan tujuan tidak boleh sama.');
      return;
    }

    const amount = parseInt(transferAmountInput.replace(/[^0-9]/g, ''), 10);
    if (isNaN(amount) || amount <= 0) {
      setErrorTransfer('Jumlah transfer harus lebih besar dari Rp 0.');
      return;
    }

    // Verify source balance
    const sourceBal = accountBalances[fromAccountId] ?? 0;
    if (amount > sourceBal) {
      if (!window.confirm('Saldo rekening sumber tidak mencukupi untuk transfer ini. Lanjutkan transfer agar saldo rek negatif?')) {
        return;
      }
    }

    const desc = transferDesc.trim() || 'Transfer antar rekening';

    onAddTransfer(fromAccountId, toAccountId, amount, desc, transferDate);

    // Reset Form
    setTransferAmountInput('');
    setTransferDesc('');
    setSuccessTransfer('Transfer dana berhasil dicatat!');
    setTimeout(() => {
      setSuccessTransfer('');
      setShowTransferForm(false);
    }, 1500);
  };

  return (
    <div id="accounts-manager-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
      
      {/* Head section */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Coins className="w-5 h-5 text-indigo-600" />
            Detail Penyimpanan & Dompet (Rekening)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pantau sisa saldo di tiap bank / kas pasutri agar pencocokan keuangan Anda valid.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setShowTransferForm(false);
          }}
          className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all select-none"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah</span>
        </button>
      </div>

      {/* Grid of existing accounts/rekening */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const calculatedBalance = accountBalances[acc.id] ?? acc.initialBalance;
          const colorStyles = colorClasses[acc.color] || colorClasses.blue;
          const isNegative = calculatedBalance < 0;

          return (
            <div 
              key={acc.id}
              className={`bg-white border rounded-2xl p-4 flex flex-col justify-between shadow-3xs relative overflow-hidden group hover:border-slate-300 transition-all ${colorStyles.border}`}
            >
              {/* Decorative side accent lines */}
              <div className={`absolute top-0 right-0 w-1.5 h-full ${colorStyles.bgBadge}`} />

              <div className="space-y-3">
                {/* Account Category Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg border ${colorStyles.bg} ${colorStyles.text}`}>
                      {getAccountIcon(acc.balanceType)}
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 tracking-tight uppercase">
                        {acc.name}
                      </h4>
                      {acc.accountNumber && (
                        <p className="text-[10px] font-mono text-slate-400">
                          {acc.accountNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 transition-all shrink-0">
                    {onUpdateAccount && (
                      <button
                        onClick={() => {
                          setEditingAccountId(acc.id);
                          setEditName(acc.name);
                          setEditBalanceType(acc.balanceType);
                          setEditColor(acc.color || 'blue');
                          setEditAccountNumber(acc.accountNumber || '');
                          setEditInitialBalanceInput(String(acc.initialBalance || 0));
                          setErrorEditAccount('');
                        }}
                        className="text-slate-450 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
                        title="Edit Penyimpanan"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (window.confirm(`Hapus rekening "${acc.name}"? Ini tidak akan menghapus riwayat transaksinya, hanya saja kaitan rekening akan dinonaktifkan.`)) {
                          onDeleteAccount(acc.id);
                        }
                      }}
                      className="text-slate-450 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 cursor-pointer transition-all"
                      title="Hapus Rekening"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Account Balance Display */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Saldo Saat Ini
                  </span>
                  <p className={`text-base font-black tracking-tight leading-none mt-1 ${isNegative ? 'text-rose-600' : 'text-slate-900'}`}>
                    {formatRupiah(calculatedBalance)}
                  </p>
                </div>
              </div>

              {/* Summary line indicating how much was initially inputted */}
              <div className="mt-3 pt-2.5 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400">
                <span>Saldo awal:</span>
                <span className="font-mono text-slate-500 font-bold">{formatRupiah(acc.initialBalance)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Button to quickly invoke Transfer between accounts */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setShowTransferForm(!showTransferForm);
            setShowAddForm(false);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 px-3.5 py-2.5 bg-slate-50 hover:bg-indigo-50/50 rounded-xl cursor-pointer transition-all active:scale-98"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Transfer Saldo Antar Rekening</span>
        </button>
      </div>

      {/* COLLAPSIBLE ADD NEW ACCOUNT FORM */}
      {showAddForm && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 md:p-6 space-y-4 animate-fade-in relative">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4 text-indigo-505 text-indigo-600" />
            Tambah Rekening / Penyimpanan Baru
          </h3>

          <form onSubmit={handleCreateAccount} className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Nama Rekening (contoh: BCA Suami, OVO Istri)</label>
              <input
                type="text"
                placeholder="Bank BCA, Kas Tunai, GoPay, Mandiri, dll"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Jenis Penyimpanan</label>
              <select
                value={balanceType}
                onChange={(e) => setBalanceType(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-hidden"
              >
                <option value="bank font-bold">🏦 Bank (M-Banking)</option>
                <option value="cash font-bold">💵 Cash / Tunai Fisik</option>
                <option value="e-wallet font-bold">📱 e-Wallet / QRIS</option>
                <option value="other font-bold">💳 Kartu / Lainnya</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Warna Label</label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-hidden"
              >
                <option value="blue">Blue (BCA)</option>
                <option value="emerald">Emerald (Cash)</option>
                <option value="purple">Purple (GoPay/Mandiri)</option>
                <option value="amber">Amber (e-Money)</option>
                <option value="rose">Rose (Dana)</option>
                <option value="cyan">Cyan (Jenius)</option>
                <option value="indigo">Indigo (OVO)</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Saldo Awal (Opsional)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-[10px] text-slate-400">Rp</span>
                <input
                  type="text"
                  placeholder="Contoh: 5000000"
                  value={initialBalanceInput}
                  onChange={(e) => setInitialBalanceInput(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-extrabold text-slate-800 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="md:col-span-6">
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Nomor Rekening / Catatan Nomor HP (Opsional)</label>
              <input
                type="text"
                placeholder="Misal: 432-155-2234 atau HP OVO"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-6 flex items-end justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 hover:shadow-md text-white text-xs font-black rounded-lg cursor-pointer flex items-center gap-1.5"
              >
                Simpan
              </button>
            </div>

            {errorAccount && (
              <div className="md:col-span-12 p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-xs font-semibold">
                ⚠️ {errorAccount}
              </div>
            )}
          </form>
        </div>
      )}

      {/* COLLAPSIBLE TRANSFER IN BETWEEN ACCOUNTS FORM */}
      {showTransferForm && (
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 md:p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
              Catat Pemindahan Rekening (Transfer Saldo Dompet)
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold italic">
              💡 Tidak mengurangi anggaran belanja pasutri, hanya mengganti penempatan lokasi fisik dana.
            </span>
          </div>

          <form onSubmit={handleTransferSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Dari Rekening Sumber (Kredit)</label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-hidden"
              >
                <option value="">Pilih Sumber...</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Saldo: {formatRupiah(accountBalances[acc.id] ?? acc.initialBalance)})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1 flex items-center justify-center text-slate-400 font-black text-lg py-2">
              ➔
            </div>

            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Ke Rekening Tujuan (Debit)</label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-hidden"
              >
                <option value="">Pilih Tujuan...</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Saldo: {formatRupiah(accountBalances[acc.id] ?? acc.initialBalance)})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Nominal Transfer</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-[10px] text-slate-400">Rp</span>
                <input
                  type="text"
                  placeholder="Contoh: 1000000"
                  value={transferAmountInput}
                  onChange={(e) => setTransferAmountInput(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-extrabold text-slate-800 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Tanggal Transfer</label>
              <input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-hidden"
              />
            </div>

            <div className="md:col-span-8">
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Keterangan Transfer (Koran Bank)</label>
              <input
                type="text"
                placeholder="Contoh: Ambil cash dari ATM BCA, isi saldo GoPay, dll"
                value={transferDesc}
                onChange={(e) => setTransferDesc(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-4 flex items-end justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowTransferForm(false)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 hover:shadow-md text-white text-xs font-black rounded-lg cursor-pointer"
              >
                Simpan Transfer
              </button>
            </div>

            {errorTransfer && (
              <div className="md:col-span-12 p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-xs font-semibold">
                ⚠️ {errorTransfer}
              </div>
            )}

            {successTransfer && (
              <div className="md:col-span-12 p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-xs font-semibold flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {successTransfer}
              </div>
            )}
          </form>
        </div>
      )}

      {/* EDIT ACCOUNT MODAL */}
      {editingAccountId && onUpdateAccount && (
        <div id="edit-account-modal-backdrop" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-3xs flex items-center justify-center p-4">
          <div id="edit-account-modal-content" className="w-full max-w-sm bg-white rounded-3xl border border-slate-150 shadow-2xl overflow-hidden p-6 relative">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-indigo-600 font-bold" />
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Ubah Detil Rekening</h3>
              </div>
              <button 
                onClick={() => setEditingAccountId(null)}
                className="text-slate-400 hover:text-slate-650 p-1 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!editName.trim()) {
                setErrorEditAccount('Nama wajib diisi.');
                return;
              }
              const initBalNum = parseInt(editInitialBalanceInput.replace(/[^0-9]/g, ''), 10) || 0;
              onUpdateAccount(editingAccountId, {
                name: editName.trim(),
                balanceType: editBalanceType,
                color: editColor,
                accountNumber: editAccountNumber.trim() || undefined,
                initialBalance: initBalNum
              });
              setEditingAccountId(null);
            }} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Nama Rekening / Penyimpanan</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-bold focus:outline-hidden focus:border-indigo-500 text-slate-850"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1 font-bold">Jenis</label>
                  <select
                    value={editBalanceType}
                    onChange={(e: any) => setEditBalanceType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="bank">🏦 Bank (M-Banking)</option>
                    <option value="cash">💵 Cash / Tunai</option>
                    <option value="e-wallet">📱 e-Wallet</option>
                    <option value="other">💳 Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1 font-bold">Label Warna</label>
                  <select
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="blue">Blue</option>
                    <option value="emerald">Emerald</option>
                    <option value="amber">Amber</option>
                    <option value="purple">Purple</option>
                    <option value="cyan">Cyan</option>
                    <option value="indigo">Indigo</option>
                    <option value="rose">Rose</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Nomor Rekening / Catatan Pendamping</label>
                <input
                  type="text"
                  placeholder="Contoh: 802-145-2311"
                  value={editAccountNumber}
                  onChange={(e) => setEditAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-semibold focus:outline-hidden text-slate-850"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Ubah Saldo Awal</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                  <input
                    type="text"
                    value={editInitialBalanceInput}
                    onChange={(e) => setEditInitialBalanceInput(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs font-extrabold text-slate-800 focus:outline-hidden"
                  />
                </div>
              </div>

              {errorEditAccount && (
                <p className="text-rose-600 font-extrabold text-[10px]">{errorEditAccount}</p>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAccountId(null)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer"
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
