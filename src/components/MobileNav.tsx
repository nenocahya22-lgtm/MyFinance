import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Layers, 
  CreditCard, 
  Menu, 
  X, 
  Landmark, 
  TrendingUp, 
  Settings, 
  Sun, 
  Moon,
  Plus,
  Target,
  Trash2,
  ShieldCheck
} from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface MobileNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenTxModal: () => void;
  syncCode?: string;
  syncUserRole?: string;
}

export default function MobileNav({
  activeTab,
  onTabChange,
  isDarkMode,
  onToggleDarkMode,
  onOpenTxModal,
  syncCode,
  syncUserRole
}: MobileNavProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const mainBottomTabs = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions' as ActiveTab, label: 'Transaksi', icon: ArrowLeftRight },
    { id: 'buckets' as ActiveTab, label: 'Alokasi', icon: Layers },
    { id: 'debts' as ActiveTab, label: 'Hutang', icon: CreditCard },
  ];

  const drawerTabs = [
    { id: 'goals' as ActiveTab, label: 'Target Keuangan', icon: Target },
    { id: 'accounts' as ActiveTab, label: 'Rekening Bank', icon: Landmark },
    { id: 'analytics' as ActiveTab, label: 'Analitik Graf', icon: TrendingUp },
    { id: 'trash' as ActiveTab, label: 'Tong Sampah', icon: Trash2 },
    { id: 'audit' as ActiveTab, label: 'Jurnal Audit Log', icon: ShieldCheck },
    { id: 'settings' as ActiveTab, label: 'Pengaturan Sync', icon: Settings },
  ];

  const handleTabClick = (tab: ActiveTab) => {
    onTabChange(tab);
    setIsDrawerOpen(false);
  };

  return (
    <div id="mobile-navigation-ui-block" className="lg:hidden">
      
      {/* 1. FLOATING ACTION BUTTON (FAB) */}
      <button
        type="button"
        onClick={onOpenTxModal}
        aria-label="Tambah Transaksi Baru secara instan"
        className="fixed bottom-20 right-5 z-40 p-4 bg-indigo-600 hover:bg-indigo-700 active:scale-90 text-white rounded-full shadow-lg shadow-indigo-600/30 border border-indigo-500/20 transition-all cursor-pointer flex items-center justify-center animate-bounce"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* 2. BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-around px-2 z-40 transition-colors duration-300">
        {mainBottomTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && !isDrawerOpen;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className="flex flex-col items-center justify-center w-14 h-full cursor-pointer relative"
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className={`text-[9px] font-bold mt-1 transition-all ${isActive ? 'text-indigo-650 dark:text-indigo-400 font-extrabold' : 'text-slate-450 dark:text-slate-505'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute top-1 w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-450" />
              )}
            </button>
          );
        })}

        {/* Hamburger Tab */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex flex-col items-center justify-center w-14 h-full cursor-pointer"
        >
          <Menu className={`w-5 h-5 ${isDrawerOpen ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span className="text-[9px] font-bold mt-1 text-slate-450">Lainnya</span>
        </button>
      </div>

      {/* 3. MOBILE MENU DRAWER OVERLAY */}
      {isDrawerOpen && (
        <div 
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 transition-opacity duration-300"
        >
          {/* Drawer Slide-up panel */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-[32px] p-6 border-t border-slate-100 dark:border-slate-850 shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto animate-slide-up"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-lg">
                  <Menu className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider">
                  Menu Lainnya
                </h3>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-full hover:bg-slate-105 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu List */}
            <div className="grid grid-cols-2 gap-2">
              {drawerTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`flex flex-col items-start gap-2 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-slate-950 dark:bg-indigo-600 text-white shadow-md' 
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Configs panel & Theme toggle */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {syncCode ? `FAMILY: ${syncCode}` : 'MODE LOKAL'}
                </span>
              </div>

              <button
                type="button"
                onClick={onToggleDarkMode}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-mono transition-all cursor-pointer"
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-center text-[9px] text-slate-400 font-medium mt-6 uppercase tracking-wider">
              SakuKeluarga • Versi 3.0 Production
            </p>

          </div>
        </div>
      )}

    </div>
  );
}
