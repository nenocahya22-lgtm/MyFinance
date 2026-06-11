import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Layers, 
  CreditCard, 
  Landmark, 
  TrendingUp, 
  Settings,
  Sun,
  Moon,
  LogOut,
  Target,
  Trash2,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export type ActiveTab = 
  | 'dashboard' 
  | 'transactions' 
  | 'buckets' 
  | 'goals'
  | 'debts' 
  | 'accounts' 
  | 'analytics' 
  | 'trash' 
  | 'audit' 
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  currentUser?: any;
  currentFamily?: any;
  onLogout: () => void;
}

export default function Sidebar({ 
  activeTab, 
  onTabChange, 
  isDarkMode, 
  onToggleDarkMode,
  currentUser,
  currentFamily,
  onLogout
}: SidebarProps) {
  
  const menuItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions' as ActiveTab, label: 'Transaksi', icon: ArrowLeftRight },
    { id: 'buckets' as ActiveTab, label: 'Dana Saku (Alokasi)', icon: Layers },
    { id: 'goals' as ActiveTab, label: 'Target Keuangan', icon: Target },
    { id: 'debts' as ActiveTab, label: 'Hutang & Cicilan', icon: CreditCard },
    { id: 'accounts' as ActiveTab, label: 'Rekening Bank', icon: Landmark },
    { id: 'trash' as ActiveTab, label: 'Tong Sampah', icon: Trash2 },
    { id: 'audit' as ActiveTab, label: 'Jurnal Audit Log', icon: ShieldCheck },
    { id: 'settings' as ActiveTab, label: 'Pengaturan Sync', icon: Settings },
  ];

  return (
    <aside id="desktop-sidebar-pane" className="hidden lg:flex flex-col w-72 h-screen max-h-screen fixed top-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transition-colors duration-300 z-30">
      
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-md shadow-indigo-600/30">
            <TrendingUp className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider leading-none">
              SakuKeluarga
            </h1>
            <span className="text-[9px] text-indigo-650 dark:text-indigo-400 font-extrabold uppercase tracking-widest mt-1 block">
              REALTIME FINTECH UNIT
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav id="sidebar-nav" className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                isActive 
                  ? 'bg-slate-950 dark:bg-indigo-600 text-white shadow-md shadow-slate-900/10' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-white" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Profile Info block */}
      <div className="p-4 m-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/65 space-y-3">
        {currentUser && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-200 text-xs font-bold">
                {currentUser.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-black text-slate-800 dark:text-slate-205 truncate">
                  {currentUser.name}
                </span>
                <span className="block text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  ROLE: {currentUser.role}
                </span>
                <span className="block text-[8px] text-slate-450 truncate font-semibold">
                  {currentFamily?.name || 'Unit Keluarga'}
                </span>
              </div>
            </div>
            
            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/60 flex justify-between items-center text-[10px] font-bold text-slate-500">
              <span className="bg-slate-100 dark:bg-slate-855 px-1.5 py-0.5 rounded text-indigo-650 dark:text-indigo-400 truncate max-w-[130px]" title="PIN Keluarga">
                PIN: {currentFamily?.code}
              </span>
              <button 
                onClick={onLogout}
                className="hover:text-red-500 font-extrabold flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Out
              </button>
            </div>
          </div>
        )}

        {/* Action Widgets - Theme switch */}
        <div className="flex gap-2 pt-1 border-t border-slate-150/50 dark:border-slate-850">
          <button
            onClick={onToggleDarkMode}
            title={isDarkMode ? "Mode Terang" : "Mode Gelap"}
            className="w-full p-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:shadow-2xs rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer"
          >
            {isDarkMode ? (
              <span className="flex items-center gap-1.5 text-[10px] font-bold"><Sun className="w-3.5 h-3.5 text-amber-500" /> Mode Terang</span>
            ) : (
              <span className="flex items-center gap-1.5 text-[10px] font-bold"><Moon className="w-3.5 h-3.5 text-indigo-500" /> Mode Gelap</span>
            )}
          </button>
        </div>
      </div>

    </aside>
  );
}
