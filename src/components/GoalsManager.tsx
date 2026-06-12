import React, { useState } from 'react';
import { PiggyBank, Plus, Trash2, Calendar, Target, Edit, AlertCircle, Sparkles, Check } from 'lucide-react';
import { Goal } from '../types';

interface GoalsManagerProps {
  goals: Goal[];
  onAddGoal: (g: { name: string; targetAmount: number; currentAmount: number; targetDate?: string }) => void;
  onUpdateGoal: (id: string, currentAmount: number) => void;
  onDeleteGoal: (id: string) => void;
}

export default function GoalsManager({ goals, onAddGoal, onUpdateGoal, onDeleteGoal }: GoalsManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [contribGoalId, setContribGoalId] = useState<string | null>(null);
  const [contribAmount, setContribAmount] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;
    
    onAddGoal({
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
      targetDate: targetDate || undefined
    });

    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setTargetDate('');
    setShowAddForm(false);
  };

  const handleContribSubmit = (e: React.FormEvent, g: Goal) => {
    e.preventDefault();
    if (!contribAmount) return;
    
    const increment = parseFloat(contribAmount);
    const updatedTotal = g.currentAmount + increment;
    onUpdateGoal(g.id, updatedTotal);
    
    setContribAmount('');
    setContribGoalId(null);
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-6">
      
      {/* Header banner */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-3xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Target Keuangan Keluarga
          </h2>
          <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">
            Pantau tabungan berkemajuan seperti Dana Darurat, Dana Rumah, hingga Dana Pendidikan Anak.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider pl-4 pr-5 py-3 rounded-2xl transition-all cursor-pointer shadow-md"
        >
          {showAddForm ? 'Tutup Form' : 'Tambah Target'}
        </button>
      </div>

      {/* Add form slider */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 p-6 rounded-3xl space-y-4 shadow-xl animate-slide-up">
          <h3 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
            Sediakan Target Sasaran Baru
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Nama Target</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dana Darurat Mandiri"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Target Nominal (Rp)</label>
              <input
                type="number"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="e.g. 50000000"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Dana Terkumpul Awal (Rp)</label>
              <input
                type="number"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="e.g. 1000000"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Target Tanggal Target</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold uppercase rounded-xl transition-all cursor-pointer shadow-md"
            >
              Simpan Target
            </button>
          </div>
        </form>
      )}

      {/* Target Grid Cards view */}
      {goals.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-850 rounded-3xl p-8 max-w-xl mx-auto">
          <PiggyBank className="w-12 h-12 text-slate-405 text-indigo-400 mx-auto mb-4 animate-bounce" />
          <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase">Belum Ada Target Aktif</h3>
          <p className="text-xs text-slate-400 mt-2">
            Sediakan target keluarga bersama (e.g. Dana Pendidikan Anak) untuk mulai mendedikasikan anggaran bulanan Anda secara terfokus.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((g) => {
            const goalPct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
            const isCompleted = g.currentAmount >= g.targetAmount;
            const isContributing = contribGoalId === g.id;

            return (
              <div key={g.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-3xs space-y-4 relative overflow-hidden transition-all duration-300 hover:shadow-2xs">
                {isCompleted && (
                  <div className="absolute top-0 right-0 p-2 bg-emerald-500 text-white rounded-bl-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                    <Check className="w-3 h-3" /> Sukses
                  </div>
                )}

                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider">{g.name}</h3>
                    {g.targetDate && (
                      <span className="inline-flex items-center gap-1 text-[9px] text-slate-400 font-extrabold">
                        <Calendar className="w-3 h-3" /> Batas: {g.targetDate}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (window.confirm(`Yakin ingin membuang target "${g.name}" ke kotak sampah?`)) {
                        onDeleteGoal(g.id);
                      }
                    }}
                    className="p-1 px-2 border border-slate-150 hover:bg-red-50 text-slate-400 hover:text-red-550 rounded-lg hover:border-red-200 transition-colors cursor-pointer"
                    title="Buang ke Sampah"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress slide bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                    <span>Dana Terkumpul</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black">{goalPct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                      style={{ width: `${goalPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold pt-1">
                    <span>{formatRupiah(g.currentAmount)}</span>
                    <span>Target: {formatRupiah(g.targetAmount)}</span>
                  </div>
                </div>

                {/* Contribution quick button/form */}
                <div className="pt-2 border-t border-slate-50 dark:border-slate-800/80">
                  {isContributing ? (
                    <form onSubmit={(e) => handleContribSubmit(e, g)} className="flex gap-2 items-center animate-slide-up">
                      <input
                        type="number"
                        required
                        value={contribAmount}
                        onChange={(e) => setContribAmount(e.target.value)}
                        placeholder="e.g. 500000"
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-medium placeholder:text-slate-400 text-slate-900 dark:text-white"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl transition-all cursor-pointer"
                      >
                        Setor
                      </button>
                      <button
                        type="button"
                        onClick={() => setContribGoalId(null)}
                        className="px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 cursor-pointer"
                      >
                        Batal
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => setContribGoalId(g.id)}
                      className="w-full py-2 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/50 hover:text-indigo-600 border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-300 rounded-xl text-xs font-bold text-slate-500 transition-all cursor-pointer"
                    >
                      + Tambah Tabungan Sasaran
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
