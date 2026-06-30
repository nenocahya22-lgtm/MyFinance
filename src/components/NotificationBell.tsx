import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCircle, AlertTriangle, Info, ShieldAlert, ExternalLink } from 'lucide-react';

export interface AppNotification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error' | 'danger';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionable?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

interface NotificationBellProps {
  notifications: AppNotification[];
  onClear: (id: string) => void;
  onClearAll: () => void;
  onMarkRead: (id: string) => void;
}

export default function NotificationBell({ 
  notifications, 
  onClear, 
  onClearAll, 
  onMarkRead 
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error': case 'danger': return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      default: return <Info className="w-4 h-4 text-indigo-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-50 border-emerald-100';
      case 'warning': return 'bg-amber-50 border-amber-100';
      case 'error': case 'danger': return 'bg-rose-50 border-rose-100';
      default: return 'bg-indigo-50 border-indigo-100';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Baru saja';
    if (diffMin < 60) return `${diffMin}m lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}j lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
        aria-label="Notifikasi"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-indigo-600' : 'text-slate-500'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-rose-500 text-[9px] font-black text-white flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute right-4 sm:right-0 top-20 sm:top-full mt-0 sm:mt-2 w-[calc(100vw-32px)] sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden animate-slide-up max-h-[70vh]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Notifikasi
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded-md text-[9px] font-bold">
                  {unreadCount} baru
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Hapus Semua
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-xs font-bold text-slate-400">Tidak ada notifikasi</p>
                <p className="text-[10px] text-slate-400 mt-1">Semua aman dan terkendali!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 transition-colors ${!notif.read ? 'bg-indigo-50/30' : ''} hover:bg-slate-50`}
                    onClick={() => {
                      onMarkRead(notif.id);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center border ${getBgColor(notif.type)}`}>
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs ${notif.read ? 'font-semibold text-slate-600' : 'font-black text-slate-800'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[9px] text-slate-400 whitespace-nowrap shrink-0">
                            {formatTime(notif.timestamp)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>
                        {notif.actionable && notif.actionLabel && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              notif.onAction?.();
                            }}
                            className="mt-1.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {notif.actionLabel}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onClear(notif.id);
                        }}
                        className="shrink-0 p-0.5 text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with total count */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
              <p className="text-[10px] text-slate-400 font-semibold text-center">
                {notifications.length} notifikasi tersimpan
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
