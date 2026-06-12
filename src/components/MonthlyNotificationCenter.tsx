import React, { useMemo, useState } from 'react';
import { 
  Bell, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Gem, 
  Sparkles, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Activity
} from 'lucide-react';
import { FinanceSummaryData, AllocationBucket, Transaction } from '../types';

interface MonthlyNotificationCenterProps {
  summary: FinanceSummaryData;
  selectedMonth: string;
  buckets: AllocationBucket[];
  bucketBalances: Record<string, number>;
  transactions: Transaction[];
}

interface SmartNotification {
  id: string;
  type: 'danger' | 'warning' | 'success' | 'info' | 'highlight';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function MonthlyNotificationCenter({
  summary,
  selectedMonth,
  buckets,
  bucketBalances,
  transactions
}: MonthlyNotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Format to IDR Currency helper
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  // Convert "YYYY-MM" to readable Indonesian Month Name
  const getReadableMonthName = (monthStr: string) => {
    if (monthStr === 'all') return 'Semua Periode';
    const [yr, mt] = monthStr.split('-');
    const idx = parseInt(mt, 10) - 1;
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${months[idx] || mt} ${yr}`;
  };

  // Real-time calculation of smart notification insights
  const notifications = useMemo<SmartNotification[]>(() => {
    const list: SmartNotification[] = [];
    const monthName = getReadableMonthName(selectedMonth);

    // 1. Defisit / Surplus Check (If there is record)
    if (transactions.length > 0) {
      if (summary.totalIncome > 0 && summary.totalExpense > summary.totalIncome) {
        const diff = summary.totalExpense - summary.totalIncome;
        list.push({
          id: 'cashflow-deficit',
          type: 'danger',
          title: `Arus Kas Defisit (${monthName})`,
          description: `Total pengeluaran Anda melebihi pendapatan sebesar ${formatRupiah(diff)}. Batasi berbelanja sekunder untuk menjaga kestabilan saldo.`,
          icon: ShieldAlert
        });
      } else if (summary.totalIncome > 0 && summary.totalExpense <= summary.totalIncome) {
        const surplus = summary.totalIncome - summary.totalExpense;
        list.push({
          id: 'cashflow-surplus',
          type: 'success',
          title: `Surplus Berkelanjutan (${monthName})`,
          description: `Hebat! Arus kas bulan ini surplus sebesar ${formatRupiah(surplus)}. Pertahankan rasio belanja hemat ini!`,
          icon: Sparkles
        });
      }
    }

    // 2. Budget Utilization Warning (If expenses exceed 80% of income)
    if (summary.totalIncome > 0 && summary.totalExpense > 0) {
      const percentageOfIncome = (summary.totalExpense / summary.totalIncome) * 100;
      if (percentageOfIncome > 80 && percentageOfIncome <= 100) {
        list.push({
          id: 'critical-expenses-ratio',
          type: 'warning',
          title: 'Konsumsi Bujet Kritis',
          description: `Pengeluaran bulanan sudah memakan ${percentageOfIncome.toFixed(1)}% dari seluruh pemasukan Anda. Kurangi transaksi yang tidak esensial.`,
          icon: AlertTriangle
        });
      }
    }

    // 3. Excessively High Free Funds (Idle cash warning) Or Over-allocated funds
    if (summary.unallocatedBalance > 0 && summary.totalIncome > 0) {
      list.push({
        id: 'idle-cash-suggestion',
        type: 'info',
        title: 'Dana Bebas Belum Dialokasikan',
        description: `Ada dana menganggur sebesar ${formatRupiah(summary.unallocatedBalance)} di Saku Utama. Segera sisihkan ke Saku Alokasi seperti Dana Darurat atau Investasi agar tabungan bertumbuh secara otomatis!`,
        icon: Layers
      });
    } else if (summary.unallocatedBalance < 0) {
      list.push({
        id: 'over-allocated-budget',
        type: 'warning',
        title: 'Sinyal Alokasi Melebihi Saldo',
        description: `Total target bujet saku yang direncanakan melampaui saldo nyata Anda sebesar ${formatRupiah(Math.abs(summary.unallocatedBalance))}. Harap kurangi target alokasi agar sejalan dengan saldo asli Anda.`,
        icon: AlertTriangle
      });
    }

    // 4. Checking Dana Darurat (Emergency saving health check)
    const emergencyBucket = buckets.find(b => b.id === 'b-emergency' || b.name.toLowerCase().includes('darurat') || b.name.toLowerCase().includes('emergency'));
    if (emergencyBucket) {
      const balance = bucketBalances[emergencyBucket.id] || 0;
      const target = emergencyBucket.targetAmount;
      if (target > 0) {
        const percent = (balance / target) * 100;
        if (percent < 50) {
          list.push({
            id: 'emergency-saving-slow',
            type: 'info',
            title: 'Pacu Saku Dana Darurat',
            description: `Saku Dana Darurat Anda baru terisi ${formatRupiah(balance)} dari rencana ${formatRupiah(target)} (${percent.toFixed(0)}%). Prioritaskan saku ini untuk mengantisipasi musibah atau krisis mendadak.`,
            icon: Info
          });
        }
      } else {
        list.push({
          id: 'emergency-target-zero',
          type: 'info',
          title: 'Pasang Target Suku Proteksi',
          description: `Saku Dana Darurat Anda belum memiliki target nominal alokasi. Tetapkan target (misal: 6x pengeluaran bulanan) untuk jaring pengaman keluarga.`,
          icon: Info
        });
      }
    } else {
      list.push({
        id: 'no-emergency-pocket',
        type: 'warning',
        title: 'Dana Darurat Kosong/Belum Ada',
        description: 'Sistem tidak menemukan saku penampung Dana Darurat terdedikasi. Buat satu saku alokasi berlabel proteksi untuk membentengi cashflow dari risiko eksternal.',
        icon: ShieldAlert
      });
    }

    // 5. Target Saku Goals Achievement Celebration
    buckets.forEach(b => {
      const balance = bucketBalances[b.id] || 0;
      const target = b.targetAmount;
      if (target > 0 && balance >= target) {
        list.push({
          id: `goal-completion-${b.id}`,
          type: 'highlight',
          title: `🎯 Target Saku ${b.name} Tercapai!`,
          description: `Luar biasa! Akumulasi saldo saku (${formatRupiah(balance)}) berhasil menyentuh bahkan melampaui target pencapaian ${formatRupiah(target)} Anda!`,
          icon: Gem
        });
      }
    });

    // 6. Zero Month Entries
    if (transactions.length === 0) {
      list.push({
        id: 'no-transactions-pembukuan',
        type: 'info',
        title: `Pencatatan Baru Periode ${monthName}`,
        description: 'Buku bulan ini bersih dari transaksi apa pun. Silakan catat saldo masuk awal / pengeluaran pertama menggunakan panel Catat Transaksi di bawah.',
        icon: Activity
      });
    }

    return list;
  }, [summary, buckets, bucketBalances, transactions, selectedMonth]);

  if (notifications.length === 0) return null;

  return (
    <div 
      id="monthly-notification-insight-container"
      className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden"
    >
      {/* Header section */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 relative">
            <Bell className="w-4 h-4 animate-swing" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-[9px] font-black text-white flex items-center justify-center border border-white">
              {notifications.length}
            </span>
          </div>
          <div>
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-tight">Notifikasi & Insights Real-time</h4>
            <p className="text-[10px] text-slate-400 font-semibold leading-normal">
              Evaluasi kinerja anggaran & usulan penyehatan keuangan instan
            </p>
          </div>
        </div>
        <div className="text-slate-400 shrink-0">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Insight List body */}
      {isOpen && (
        <div className="px-5 pb-5 border-t border-slate-50 pt-2 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
          {notifications.map((item) => {
            const IconComponent = item.icon;
            
            // Customize style schemes based on item urgency/type
            let cardBg = 'bg-slate-50 border-slate-200/50';
            let iconBox = 'bg-slate-100 text-slate-600 border-slate-200';
            let titleColor = 'text-slate-800';
            
            if (item.type === 'danger') {
              cardBg = 'bg-rose-50/70 border-rose-100';
              iconBox = 'bg-rose-100 text-rose-700 border-rose-200';
              titleColor = 'text-rose-900';
            } else if (item.type === 'warning') {
              cardBg = 'bg-amber-50/70 border-amber-100';
              iconBox = 'bg-amber-100 text-amber-700 border-amber-200';
              titleColor = 'text-amber-900';
            } else if (item.type === 'success') {
              cardBg = 'bg-emerald-50/70 border-emerald-100';
              iconBox = 'bg-emerald-100 text-emerald-700 border-emerald-200';
              titleColor = 'text-emerald-900';
            } else if (item.type === 'info') {
              cardBg = 'bg-indigo-50/70 border-indigo-100';
              iconBox = 'bg-indigo-100 text-indigo-700 border-indigo-200';
              titleColor = 'text-indigo-900';
            } else if (item.type === 'highlight') {
              cardBg = 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200';
              iconBox = 'bg-amber-500 text-white border-amber-400 shadow-sm';
              titleColor = 'text-amber-900';
            }

            return (
              <div 
                key={item.id} 
                id={`insight-${item.id}`}
                className={`p-3.5 border rounded-2xl flex items-start gap-3.5 transition-all text-xs hover:shadow-2xs ${cardBg}`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${iconBox}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h5 className={`font-black ${titleColor}`}>{item.title}</h5>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed leading-normal">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
