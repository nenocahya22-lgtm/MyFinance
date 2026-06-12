import React from 'react';
import Sidebar, { ActiveTab } from './Sidebar';
import MobileNav from './MobileNav';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenTxModal: () => void;
  
  // Realtime multi-user info
  currentUser?: any;
  currentFamily?: any;
  onLogout: () => void;
  
  // Bookkeeping inputs
  customMonths: string[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onAddMonth: (month: string) => void;
}

export default function Layout({
  children,
  activeTab,
  onTabChange,
  isDarkMode,
  onToggleDarkMode,
  onOpenTxModal,
  currentUser,
  currentFamily,
  onLogout,
  customMonths,
  selectedMonth,
  onMonthChange,
  onAddMonth
}: LayoutProps) {
  
  const [newMonthInput, setNewMonthInput] = React.useState('');

  const handleAddMonthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonthInput) return;
    onAddMonth(newMonthInput);
    setNewMonthInput('');
  };

  // Convert month key like "2026-06" into Indonesian month name
  const getIndoMonthLabel = (mKey: string) => {
    if (mKey === 'all') return 'Semua Periode';
    const parts = mKey.split('-');
    if (parts.length !== 2) return mKey;
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${months[parseInt(parts[1], 10) - 1] || parts[1]} ${parts[0]}`;
  };

  return (
    <div id="financial-platform-root-wrapper" className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        
        {/* 1. DESKTOP PERMANENT SIDEBAR */}
        <Sidebar 
          activeTab={activeTab}
          onTabChange={onTabChange}
          isDarkMode={isDarkMode}
          onToggleDarkMode={onToggleDarkMode}
          currentUser={currentUser}
          currentFamily={currentFamily}
          onLogout={onLogout}
        />

        {/* 2. RECONCILED MAIN FRAME (Puzzles sidebar spacing inside desktop viewports) */}
        <div className="lg:pl-72 flex flex-col min-h-screen w-full pb-20 lg:pb-8">
          
          {/* TOP APPBAR HEADER */}
          <header className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 px-3 md:px-8 py-3 md:py-4.5 z-25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4 transition-colors">
            
            {/* Left title section */}
            <div>
              <h2 className="text-[10px] md:text-xs font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider">
                SakuKeluarga
              </h2>
              <h3 className="text-xs md:text-sm font-black text-slate-800 dark:text-white tracking-tight mt-0.5 md:mt-1">
                {getIndoMonthLabel(selectedMonth)}
              </h3>
            </div>

            {/* Bookkeeping Quick Month Selector panel */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 md:gap-2 max-w-md w-full sm:w-auto">
              
              <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-2 md:px-2.5 py-1 md:py-1.5 border border-slate-150 dark:border-slate-700/60 grow sm:grow-0">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold pr-2 border-r border-slate-200 dark:border-slate-700 select-none">
                  Buku Bulan
                </span>
                
                <select
                  aria-label="Pilih Bulan Pembukuan"
                  value={selectedMonth}
                  onChange={(e) => onMonthChange(e.target.value)}
                  className="pl-2 bg-transparent text-xs font-bold text-slate-800 dark:text-white cursor-pointer focus:outline-hidden focus:ring-0 select-none"
                >
                  <option value="all">Semua Periode (Gabungan)</option>
                  {customMonths.map(m => (
                    <option key={m} value={m}>{getIndoMonthLabel(m)}</option>
                  ))}
                </select>
              </div>

              {/* Add New Month Form */}
              <form onSubmit={handleAddMonthSubmit} className="hidden sm:flex gap-1.5 shrink-0">
                <input
                  type="month"
                  value={newMonthInput}
                  aria-label="Input Bulan Baru"
                  onChange={(e) => setNewMonthInput(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-805 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-650/10 shrink-0"
                >
                  Buku Baru
                </button>
              </form>

            </div>

          </header>

          {/* MAIN PAGE INTERIOR ROUTE AREA */}
          <main className="flex-1 px-3 md:px-8 py-4 md:py-6 max-w-7xl w-full mx-auto animate-slide-up transition-all duration-300">
            {children}
          </main>

        </div>

        {/* 3. MOBILE MENU BAR AND OVERLAYS */}
        <MobileNav 
          activeTab={activeTab}
          onTabChange={onTabChange}
          isDarkMode={isDarkMode}
          onToggleDarkMode={onToggleDarkMode}
          onOpenTxModal={onOpenTxModal}
          syncCode={currentFamily?.code}
          syncUserRole={currentUser?.role}
        />

      </div>
    </div>
  );
}
