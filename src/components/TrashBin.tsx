import React, { useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle, ShieldCheck, CheckCircle2, Square, CheckSquare } from 'lucide-react';
import { TrashItem } from '../types';

interface TrashBinProps {
  trashItems: TrashItem[];
  onRestore: (type: string, id: string) => void;
  onBulkRestore: (items: { type: string; id: string }[]) => void;
  onBulkDelete: (items: { type: string; id: string }[]) => void;
  onPurgeAll: () => void;
  userRole: 'OWNER' | 'MEMBER';
}

export default function TrashBin({
  trashItems,
  onRestore,
  onBulkRestore,
  onBulkDelete,
  onPurgeAll,
  userRole
}: TrashBinProps) {
  
  const [selectedItems, setSelectedItems] = useState<Record<string, { type: string; id: string }>>({});

  const toggleSelect = (type: string, id: string) => {
    const key = `${type}-${id}`;
    setSelectedItems((prev) => {
      const copy = { ...prev };
      if (copy[key]) {
        delete copy[key];
      } else {
        copy[key] = { type, id };
      }
      return copy;
    });
  };

  const selectAll = () => {
    if (Object.keys(selectedItems).length === trashItems.length) {
      setSelectedItems({});
    } else {
      const next: Record<string, { type: string; id: string }> = {};
      trashItems.forEach((item) => {
        next[`${item.type}-${item.id}`] = { type: item.type, id: item.id };
      });
      setSelectedItems(next);
    }
  };

  const handleBulkRestoreSelected = () => {
    const list = Object.values(selectedItems) as { type: string; id: string }[];
    if (list.length === 0) return;
    onBulkRestore(list);
    setSelectedItems({});
  };

  const handleBulkDeleteSelected = () => {
    if (userRole !== 'OWNER') {
      alert('Akses Ditolak! Hanya kepala keluarga [OWNER] yang boleh melakukan penghapusan database secara permanen.');
      return;
    }
    const list = Object.values(selectedItems) as { type: string; id: string }[];
    if (list.length === 0) return;
    if (window.confirm(`Yakin ingin MENGHAPUS PERMANEN seluruh (${list.length}) catatan terpilih? Tindakan ini tidak dapat dibatalkan!`)) {
      onBulkDelete(list);
      setSelectedItems({});
    }
  };

  const handlePurgeClick = () => {
    if (userRole !== 'OWNER') {
      alert('Akses Ditolak! Hanya kepala keluarga [OWNER] yang boleh mengosongkan tempat sampah ini.');
      return;
    }
    if (window.confirm('Yakin ingin MENGOSONGKAN SELURUH tempat sampah secara permanen? Data yang hilang tidak akan bisa recovered!')) {
      onPurgeAll();
      setSelectedItems({});
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      
      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6.5 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
            Tong Sampah Keluarga (Trash Bin)
          </h2>
          <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">
            Riwayat data lunak yang dihapus. Klik untuk memulihkan atau hapus permanen.
          </p>
        </div>

        {/* OWNER vs MEMBER header badge */}
        <div className="flex gap-2">
          {userRole === 'OWNER' ? (
            <button
              onClick={handlePurgeClick}
              disabled={trashItems.length === 0}
              className="px-4.5 py-3 bg-red-650 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-extrabold uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Kosongkan Sampah</span>
            </button>
          ) : (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/35 border border-amber-150 rounded-2xl flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-semibold">
              <AlertTriangle className="w-4.5 h-4.5" />
              <span>Role: MEMBER (Hanya Owner dapat menghapus permanen)</span>
            </div>
          )}
        </div>
      </div>

      {trashItems.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-850 rounded-3xl max-w-xl mx-auto p-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 animate-bounce" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">Tong Sampah Kosong</h3>
          <p className="text-xs text-slate-400 mt-2">
            Hebat! Tidak ada catatan keuangan yang saat ini berada dalam antrian penghapusan di database keluarga Anda.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-3xs">
          
          {/* BULK SELECTION ACTION RAIL */}
          <div className="px-6 py-4.5 bg-slate-50 dark:bg-slate-850/60 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={selectAll}
                className="text-xs font-extrabold text-slate-650 dark:text-slate-305 flex items-center gap-1.5 focus:outline-none cursor-pointer"
              >
                {Object.keys(selectedItems).length === trashItems.length ? (
                  <CheckSquare className="w-4.5 h-4.5 text-indigo-600" />
                ) : (
                  <Square className="w-4.5 h-4.5" />
                )}
                <span>Pilih Semua ({Object.keys(selectedItems).length}/{trashItems.length})</span>
              </button>
            </div>

            {Object.keys(selectedItems).length > 0 && (
              <div className="flex gap-2 animate-slide-up">
                <button
                  onClick={handleBulkRestoreSelected}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Pulihkan Terpilih</span>
                </button>
                {userRole === 'OWNER' && (
                  <button
                    onClick={handleBulkDeleteSelected}
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-650 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Permanen</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* TRASH ITEMS LIST */}
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {trashItems.map((item) => {
              const key = `${item.type}-${item.id}`;
              const isSelected = !!selectedItems[key];

              return (
                <div 
                  key={key} 
                  className={`px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors ${
                    isSelected ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                  }`}
                >
                  {/* Row Checkbox multiplier */}
                  <button
                    onClick={() => toggleSelect(item.type, item.id)}
                    className="text-slate-400 dark:text-slate-600 focus:outline-none shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4.5 h-4.5 text-indigo-600" />
                    ) : (
                      <Square className="w-4.5 h-4.5" />
                    )}
                  </button>

                  {/* Icon context based on type */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-850 dark:text-slate-250 truncate">
                        {item.name}
                      </span>
                      <span className="shrink-0 text-[8px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-850 text-slate-500 rounded font-bold uppercase tracking-wider font-mono">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">{item.details}</p>
                    {item.deletedAt && (
                      <span className="text-[9px] text-slate-400 block mt-0.5 font-bold font-mono">
                        Dibuang: {new Date(item.deletedAt).toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>

                  {/* Immediate restoring buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onRestore(item.type, item.id)}
                      className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-605 text-indigo-600 rounded-xl transition-colors cursor-pointer"
                      title="Pulihkan Data"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    {userRole === 'OWNER' && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Yakin ingin MENGHAPUS secara permanen dan mutlak item "${item.name}"?`)) {
                            onBulkDelete([{ type: item.type, id: item.id }]);
                          }
                        }}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors cursor-pointer"
                        title="Hapus Permanen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
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
