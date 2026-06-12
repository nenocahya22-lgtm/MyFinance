import React, { useState } from 'react';
import { ShieldCheck, Search, Filter, Clock, User, Layers, HardHat } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogViewerProps {
  logs: AuditLog[];
}

export default function AuditLogViewer({ logs }: AuditLogViewerProps) {
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = React.useMemo(() => {
    return logs.filter(log => {
      const matchAction = filterAction === 'ALL' || log.action === filterAction;
      const matchSearch = 
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.tableName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchAction && matchSearch;
    });
  }, [logs, filterAction, searchTerm]);

  return (
    <div className="space-y-6 animate-slide-up">
      
      {/* Header card banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6.5 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5.5 h-5.5 text-indigo-600 animate-pulse" />
            Jurnal Keamanan & Audit Log
          </h2>
          <p className="text-xs text-slate-455 dark:text-slate-400">
            Jejak digital real-time keluarga. Melacak kronologi input, update, hapus lunak, dan pemulihan data.
          </p>
        </div>
        
        {/* Total logs count */}
        <span className="p-1 px-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-xs font-black rounded-xl uppercase tracking-wider shrink-0 w-fit">
          {logs.length} Total Entri Log
        </span>
      </div>

      {/* Filter and Search rail bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4.5 rounded-3xl shadow-3xs flex flex-col sm:flex-row justify-between items-center gap-3">
        
        {/* Filters buttons tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {['ALL', 'CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LOGIN'].map((act) => {
            const isAct = filterAction === act;
            return (
              <button
                key={act}
                onClick={() => setFilterAction(act)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  isAct
                    ? 'bg-slate-950 dark:bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {act}
              </button>
            );
          })}
        </div>

        {/* Search input field */}
        <div className="relative w-full sm:max-w-xs shrink-0">
          <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center w-4 h-4 text-slate-400 dark:text-slate-500 my-auto pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari log audit..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

      </div>

      {/* Main logs display list */}
      {filteredLogs.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-850 rounded-3xl p-8 max-w-xl mx-auto">
          <Search className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-xs font-black text-slate-850 dark:text-white uppercase">Tidak Ada Log Kecocokan</h3>
          <p className="text-xs text-slate-400 mt-2">
            Periksa kembali pencarian Anda atau kembalikan filter ke mode &quot;ALL&quot; untuk melihat logs terlacak lainnya.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-3xs">
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {filteredLogs.map((log) => {
              // Set color colors for each audited action
              let actionColor = 'bg-slate-100 text-slate-650';
              if (log.action === 'CREATE') actionColor = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400';
              else if (log.action === 'UPDATE') actionColor = 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400';
              else if (log.action === 'DELETE') actionColor = 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400';
              else if (log.action === 'RESTORE') actionColor = 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400';
              else if (log.action === 'LOGIN') actionColor = 'bg-slate-900 dark:bg-slate-800 text-white';

              return (
                <div key={log.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-all">
                  
                  {/* Action pill and table column info */}
                  <div className="flex sm:flex-col items-center sm:items-start gap-2 shrink-0 sm:w-28">
                    <span className={`px-2 py-1 text-[8px] font-black uppercase tracking-wider rounded font-mono ${actionColor}`}>
                      {log.action}
                    </span>
                    <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-1 font-mono">
                      {log.tableName}
                    </span>
                  </div>

                  {/* Main description and metadata info */}
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                      {log.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-semibold leading-none pt-0.5">
                      <span className="flex items-center gap-1 shrink-0 font-extrabold">
                        <User className="w-3.5 h-3.5" /> {log.userId}
                      </span>
                    </div>
                  </div>

                  {/* Timestamp log date representation */}
                  <div className="shrink-0 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono font-medium mt-1 sm:mt-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-105 w-full sm:w-auto">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(log.timestamp).toLocaleString('id-ID')}</span>
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
