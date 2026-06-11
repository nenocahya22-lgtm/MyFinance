import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Landmark, 
  Users, 
  AlertTriangle,
  PlusCircle,
  PiggyBank,
  Percent,
  CheckCircle2,
  Calendar,
  Lock
} from 'lucide-react';
import { Transaction, FinanceSummaryData, Account, AllocationBucket, Goal } from '../types';

interface DashboardProps {
  summary: FinanceSummaryData;
  recentTransactions: Transaction[];
  onlineMembers: any[];
  liveActivities: any[];
  dailyThreshold: number;
  todayExpense: number;
  syncCode?: string;
  syncUserId?: string;
  onOpenTxModal: () => void;
  onDeleteTx: (id: string) => void;
  buckets: AllocationBucket[];
  accounts: Account[];
  selectedMonth: string;
  goals: Goal[];
  currentUser?: any;
}

export default function Dashboard({
  summary,
  recentTransactions,
  onlineMembers,
  liveActivities,
  dailyThreshold,
  todayExpense,
  syncCode,
  syncUserId,
  onOpenTxModal,
  onDeleteTx,
  buckets,
  accounts,
  selectedMonth,
  goals,
  currentUser
}: DashboardProps) {

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const isBalanceNegative = summary.remainingBalance < 0;
  const overThreshold = todayExpense > dailyThreshold;

  const getIndoMonthLabel = (mKey: string) => {
    if (mKey === 'all') return 'Semua Periode';
    const parts = mKey.split('-');
    if (parts.length !== 2) return mKey;
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${months[parseInt(parts[1], 10) - 1] || parts[1]} ${parts[0]}`;
  };

  // Pre-calculate custom mini SVG chart bars for the last few days
  const dailyFlows = React.useMemo(() => {
    const daily: Record<string, { income: number; expense: number; dateStr: string }> = {};
    recentTransactions.slice(0, 20).forEach(t => {
      const day = t.date;
      if (!daily[day]) {
        daily[day] = { income: 0, expense: 0, dateStr: day };
      }
      if (t.type === 'income') daily[day].income += t.amount;
      else if (t.type === 'expense') daily[day].expense += t.amount;
    });

    return Object.values(daily)
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
      .slice(-7);
  }, [recentTransactions]);

  // SPECIFIC REQUIREMENT: Split Suami vs Istri expenses separately
  const userExpensesSplit = React.useMemo(() => {
    const splits: Record<string, number> = {};
    let totalExpenseSum = 0;
    
    recentTransactions.forEach(t => {
      if (t.type === 'expense') {
        const creatorName = t.creator?.name || 'Anggota Lain';
        splits[creatorName] = (splits[creatorName] || 0) + t.amount;
        totalExpenseSum += t.amount;
      }
    });

    return Object.entries(splits).map(([name, amount]) => {
      const pct = totalExpenseSum > 0 ? (amount / totalExpenseSum) * 100 : 0;
      return { name, amount, pct };
    }).sort((a, b) => b.amount - a.amount);
  }, [recentTransactions]);

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: GREETING & LIMIT ALERTS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6.5 md:p-8 text-white shadow-lg relative overflow-hidden">
        
        {/* Subtle background overlay circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl transform translate-x-12 -translate-y-12 shrink-0 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-500/5 rounded-full blur-2xl transform -translate-x-12 translate-y-12 shrink-0 pointer-events-none" />

        <div className="space-y-2.5 z-10">
          <span className="px-3.5 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-200">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <h2 className="text-xl md:text-2xl font-black tracking-tight mt-1.5 flex items-center gap-2">
            Halo, {currentUser?.name || syncUserId || 'Keluarga Bijak'}! 👋
          </h2>
          <p className="text-sm text-slate-350 text-slate-300 font-semibold max-w-xl leading-relaxed">
            Selamat datang di portal pembukuan multi-user. Anggota keluarga Anda tersambung secara real-time via Socket.IO untuk pemantauan optimal.
          </p>
        </div>

        {/* Quick action button */}
        <button
          type="button"
          onClick={onOpenTxModal}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-xs uppercase tracking-wider px-5.5 py-3.5 rounded-2xl transition-all cursor-pointer shadow-lg shadow-indigo-600/30 z-10"
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span>Tambah Transaksi Baru</span>
        </button>

      </div>

      {/* AMBANG BATAS ANGGARAN ALERTS */}
      {overThreshold && (
        <div className="bg-red-50 dark:bg-rose-950/40 border border-red-150 dark:border-rose-900/60 p-4.5 rounded-2xl flex items-start gap-3 text-red-850 dark:text-rose-200 shadow-3xs animate-bounce">
          <AlertTriangle className="w-5 h-5 text-red-650 dark:text-rose-450 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-black uppercase tracking-wider block text-[10px] text-red-700 dark:text-rose-400">🚨 ALARM: MELEBIHI BATAS BUDGET HARIAN!</span>
            <p className="font-semibold leading-relaxed mt-1">
              Pengeluaran hari ini sebesar <span className="font-black text-rose-600 dark:text-rose-450">{formatRupiah(todayExpense)}</span> telah melampaui ambang batas harian keluarga Anda (<span className="font-black">{formatRupiah(dailyThreshold)}</span>). Harap koordinasikan pembelanjaan dengan pasangan Anda.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 2: RINGKASAN KEWANNGAN 4-COLUMN CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Saldo Bersih */}
        <div className={`p-6 rounded-3xl border transition-all duration-300 shadow-3xs hover:shadow-2xs ${
          isBalanceNegative 
            ? 'bg-rose-950 border-rose-900 text-rose-50' 
            : 'bg-indigo-950 border-indigo-900 text-white'
        }`}>
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-85 block">
              Saldo Bersih Keluarga
            </span>
            <div className="p-2 bg-white/10 rounded-xl text-white">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black mt-4 tracking-tight leading-none">
            {formatRupiah(summary.remainingBalance)}
          </h3>
          <p className="text-[10px] mt-4 opacity-70 font-semibold">
            {isBalanceNegative ? '⚠️ Kas Keluarga Minus! Hemat pengeluaran' : '🟢 Anggaran dalam kondisi surplus'}
          </p>
        </div>

        {/* Card 2: Pendapatan */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-3xs hover:shadow-2xs transition-all duration-300">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
              Pendapatan Bulan Ini
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950 rounded-xl text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/30">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black mt-4 tracking-tight leading-none text-slate-900 dark:text-white">
            {formatRupiah(summary.totalIncome)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-4 font-semibold">
            Buku Periode: <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{getIndoMonthLabel(selectedMonth)}</span>
          </p>
        </div>

        {/* Card 3: Pengeluaran */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-3xs hover:shadow-2xs transition-all duration-300">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
              Pengeluaran Bulan Ini
            </span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950 rounded-xl text-rose-600 dark:text-rose-450 border border-rose-100 dark:border-rose-900/30">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black mt-4 tracking-tight leading-none text-slate-900 dark:text-white">
            {formatRupiah(summary.totalExpense)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-4 font-semibold">
            {todayExpense > 0 ? `Hari ini belanja ${formatRupiah(todayExpense)}` : 'Saku pengeluaran hari ini aman'}
          </p>
        </div>

        {/* Card 4: Dana Tersimpan */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-3xs hover:shadow-2xs transition-all duration-300">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
              Dana Saku Alokasi
            </span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-xl text-indigo-600 dark:text-indigo-455 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black mt-4 tracking-tight leading-none text-slate-900 dark:text-white">
            {formatRupiah(summary.allocatedBalance)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-4 font-semibold">
            Sisa Saku Utama: <span className="font-extrabold text-slate-700 dark:text-slate-300">{formatRupiah(summary.unallocatedBalance)}</span>
          </p>
        </div>

      </div>

      {/* SECIFIC REQUIREMENT - MULTI-USER EXPENSE SPLIT (Suami vs Istri) & TARGET FINANCIAL GOALS PROGRESS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Widget: Split Pengeluaran Suami vs Istri */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-3xs">
          <div className="border-b border-slate-50 dark:border-slate-800 pb-3 mb-4">
            <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider">
              Pembagian Belanja Suami & Istri
            </h3>
            <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5">Proporsi pengeluaran per individu pencatat dalam database keluarga</p>
          </div>

          {userExpensesSplit.length === 0 ? (
            <div className="py-12 text-center text-xs font-bold text-slate-450 italic bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
              Belum ada data belanja yang terbagi bulan ini.
            </div>
          ) : (
            <div className="space-y-4">
              {userExpensesSplit.map((u, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      {u.name}
                    </span>
                    <span className="font-black text-slate-900 dark:text-white">
                      {formatRupiah(u.amount)} <span className="text-[10px] text-slate-400 font-extrabold">({u.pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  {/* Custom animated comparing progress bar */}
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${u.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Widget: Financial Goals Progress bars */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-3xs">
          <div className="border-b border-slate-50 dark:border-slate-800 pb-3 mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider">
                Target & Tabungan Keluarga
              </h3>
              <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5">Dana Darurat, Rumah, Pendidikan Anak & Kendaraan</p>
            </div>
            <span className="p-1 px-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg uppercase tracking-wider">
              Meters
            </span>
          </div>

          {goals.length === 0 ? (
            <div className="py-12 text-center text-xs font-bold text-slate-450 italic bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
              Belum ada target keuangan aktif. Pengaturan Tabungan ada di menu samping.
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map((g) => {
                const goalPct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
                return (
                  <div key={g.id} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="font-extrabold text-slate-800 dark:text-slate-300">{g.name}</span>
                      <span className="font-black text-slate-900 dark:text-white">
                        {formatRupiah(g.currentAmount)} / <span className="text-slate-400 font-bold">{formatRupiah(g.targetAmount)}</span>
                      </span>
                    </div>
                    {/* Progress Slider Bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${goalPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight shrink-0">
                        {goalPct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* SECTION 3 & 4 DOUBLE COLUMN: FLOW CHART AND RECENT TRANSACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Chart Box */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-3xs">
          <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-4 mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider">
                Arus Kas Masuk vs Keluar
              </h3>
              <p className="text-[10px] text-slate-400">Analitik visual berdasarkan tanggal 7 entri terakhir</p>
            </div>
            
            <div className="flex gap-2.5 text-[9px]">
              <span className="flex items-center gap-1 font-bold text-slate-500">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" />
                Masuk
              </span>
              <span className="flex items-center gap-1 font-bold text-slate-500">
                <span className="w-2.5 h-2.5 bg-rose-505 bg-rose-500 rounded-xs" />
                Keluar
              </span>
            </div>
          </div>

          {dailyFlows.length === 0 ? (
            <div className="py-14 text-center text-xs font-bold text-slate-400 bg-slate-50/50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-150">
              Belum ada diagram kas bulanan. Catat transaksi terlebih dahulu!
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-44 flex items-end justify-between gap-3 pt-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                {dailyFlows.map((flow, index) => {
                  const maxInput = Math.max(...dailyFlows.map(f => Math.max(f.income, f.expense))) || 10000;
                  const inPct = (flow.income / maxInput) * 100;
                  const exPct = (flow.expense / maxInput) * 100;
                  const daySplit = flow.dateStr.split('-');
                  const simpleDay = daySplit.length === 3 ? `${daySplit[2]}/${daySplit[1]}` : flow.dateStr;

                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                      {/* Tooltip */}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-800 text-white font-mono text-[8px] p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-20 shadow-md">
                        <span className="block border-b border-slate-800 font-extrabold mb-1">{flow.dateStr}</span>
                        <span className="block text-emerald-400">Masuk: {formatRupiah(flow.income)}</span>
                        <span className="block text-rose-400">Keluar: {formatRupiah(flow.expense)}</span>
                      </span>

                      <div className="w-full flex items-end justify-center gap-1 h-full">
                        <div 
                          className="w-2 md:w-3.5 bg-emerald-500 hover:bg-emerald-600 rounded-t-xs transition-all duration-300"
                          style={{ height: `${Math.max(inPct, 3)}%` }}
                        />
                        <div 
                          className="w-2 md:w-3.5 bg-rose-500 hover:bg-rose-600 rounded-t-xs transition-all duration-300"
                          style={{ height: `${Math.max(exPct, 3)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 font-mono mt-1 shrink-0">
                        {simpleDay}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SAKU ALLOCATIONS METERS PREVIEW */}
          <div className="mt-6 pt-5 border-t border-slate-50 dark:border-slate-800 space-y-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Alokasi Dana Saku Teratas</span>
            {buckets.length === 0 ? (
              <p className="text-[10px] text-slate-450 italic">Belum ada kantong saku alokasi diatur.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {buckets.slice(0, 4).map((b) => (
                  <div key={b.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] font-extrabold text-slate-400 block truncate">{b.name}</span>
                    <span className="text-xs font-black text-slate-800 dark:text-white mt-1 block">
                      {formatRupiah(b.balance || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right: Recent activity logs & WebSockets presence panel */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-6 lg:col-start-1 xl:col-span-5">
          
          {/* Recent transactions list */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-3xs">
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider">
                  Catatan Transaksi Terkini
                </h3>
                <p className="text-[10px] text-slate-400">Disediakan realtime oleh semua anggota ruangan keluarga</p>
              </div>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="py-12 text-center text-xs font-bold text-slate-450 italic bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                Belum ada kas tercatat untuk buku periode ini.
              </div>
            ) : (
              <div className="space-y-3.5">
                {recentTransactions.slice(0, 5).map((tx) => (
                  <div 
                    key={tx.id} 
                    className="flex items-center justify-between gap-3 pb-3 border-b border-dashed border-slate-100 dark:border-slate-800 last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className="block text-xs font-bold text-slate-850 dark:text-slate-200 truncate leading-snug">
                        {tx.description}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-450 dark:text-slate-500 font-semibold leading-none">
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                          {tx.date}
                        </span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-black uppercase truncate leading-none">
                          {tx.category || 'Belanja'}
                        </span>
                        {tx.creator && (
                          <span className="text-slate-400 font-bold leading-none">
                            • pencatat: {tx.creator.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`block text-xs font-black ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {tx.type === 'income' ? '+' : '-'} {formatRupiah(tx.amount)}
                      </span>
                      
                      <button
                        onClick={() => {
                          // Guards only matching creator/role inside app logic before hitting backend
                          if (currentUser?.role === 'MEMBER' && tx.creatorId !== currentUser?.id) {
                            alert('Akses Ditolak! Anda member biasa, hanya boleh membuang transaksi yang Anda buat sendiri!');
                            return;
                          }
                          if (window.confirm(`Yakin ingin memindahkan transaksi "${tx.description}" ke Tempat Sampah?`)) {
                            onDeleteTx(tx.id);
                          }
                        }}
                        className="text-[9px] font-black text-rose-500 hover:text-rose-700 hover:underline mt-1 cursor-pointer focus:outline-none"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Socket.IO Presence list */}
          {syncCode && (
            <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 p-5 rounded-3xl space-y-3.5">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-bounce" />
                <div>
                  <h4 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider leading-none">
                    Kehadiran Online Realtime
                  </h4>
                  <span className="text-[9px] text-indigo-600 dark:text-indigo-400 block mt-1 font-bold">
                    Socket.IO Ruang Keluarga Teraktif ({onlineMembers.length} Aktif)
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {onlineMembers.map((member, idx) => (
                  <span 
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 shadow-3xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{member.name || member.userId}</span>
                    <span className="text-[8px] py-0.5 px-1 bg-slate-100 dark:bg-slate-800 rounded font-mono font-medium text-slate-500 uppercase leading-none">
                      {member.role}
                    </span>
                  </span>
                ))}
              </div>

              {/* Feed of other family member's edits */}
              {liveActivities.length > 0 && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 max-h-[120px] overflow-y-auto custom-scrollbar">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Notifikasi Feed Saku:</span>
                  {liveActivities.map((act, index) => (
                    <div key={index} className="flex justify-between items-center text-[10px] bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[200px]">
                        <strong>{act.userName}</strong>: {act.description}
                      </span>
                      <span className="text-slate-400 shrink-0 font-mono text-[8px]">
                        {new Date(act.timestamp).toLocaleTimeString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
