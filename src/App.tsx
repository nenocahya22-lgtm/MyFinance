import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Coins, 
  Download, 
  HelpCircle,
  Sparkles, 
  Layers, 
  Plus,
  RefreshCw,
  TrendingUp,
  LayoutDashboard,
  Shield,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  X,
  CheckCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  Link,
  Users,
  LogOut,
  Sparkle,
  User,
  Mail,
  CalendarDays,
  Gem,
  Pencil
} from 'lucide-react';
import { Transaction, TransactionType, AllocationBucket, FinanceSummaryData, Account } from './types';
import ChatPanel from './components/ChatPanel';
import FamilyMembersPanel from './components/FamilyMembersPanel';
import TransactionForm from './components/TransactionForm';
import FinanceSummary from './components/FinanceSummary';
import TransactionsTable from './components/TransactionsTable';
import AllocationBuckets from './components/AllocationBuckets';
import SecurityGate from './components/SecurityGate';
import AccountsManager from './components/AccountsManager';
import AnalyticsCharts from './components/AnalyticsCharts';
import MonthlyNotificationCenter from './components/MonthlyNotificationCenter';
import DebtInstallmentTracker, { DebtItem } from './components/DebtInstallmentTracker';
import NotificationBell, { AppNotification } from './components/NotificationBell';
import ToastContainer from './components/ToastContainer';
import { exportTransactionsToExcel, exportTransactionsToPDF } from './utils/exportHelpers';
import { hashSHA256 } from './utils/crypto';
// Initial default buckets with EXACTLY 0 IDR allocated (keep valid empty status initially)
const DEFAULT_BUCKETS: AllocationBucket[] = [];

const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc-cash', name: 'Dompet Utama', balanceType: 'cash', color: 'indigo', initialBalance: 0 }
];

// Auto-migrate: Wipe old legacy / dummy local storage data once to ensure absolute clean state
if (typeof window !== 'undefined' && !localStorage.getItem('keuangan_rumah_tangga_clean_reset_v3')) {
  localStorage.removeItem('keuangan_rumah_tangga_accounts_v2');
  localStorage.removeItem('keuangan_rumah_tangga_buckets_v2');
  localStorage.removeItem('keuangan_rumah_tangga_records_v2');
  localStorage.removeItem('keuangan_rumah_tangga_custom_months_v2');
  localStorage.removeItem('keuangan_rumah_tangga_selected_month_v2');
  localStorage.removeItem('keuangan_sync_code');
  localStorage.removeItem('keuangan_sync_last_updated');
  localStorage.setItem('keuangan_rumah_tangga_clean_reset_v3', 'true');
}

export default function App() {
  // State for Accounts Management
  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const saved = localStorage.getItem('keuangan_rumah_tangga_accounts_v2');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Gagal memuat Rekening:', e);
    }
    return DEFAULT_ACCOUNTS;
  });

  // State for Bookkeeping Months
  const [customMonths, setCustomMonths] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('keuangan_rumah_tangga_custom_months_v2');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return [new Date().toISOString().substring(0, 7)];
  });

  // State for monthly selected filter (defaults to current month)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const saved = localStorage.getItem('keuangan_rumah_tangga_selected_month_v2');
    if (saved) return saved;
    return new Date().toISOString().substring(0, 7);
  });

  // Persist selected month
  useEffect(() => {
    localStorage.setItem('keuangan_rumah_tangga_selected_month_v2', selectedMonth);
  }, [selectedMonth]);

  // Persist custom months list
  useEffect(() => {
    localStorage.setItem('keuangan_rumah_tangga_custom_months_v2', JSON.stringify(customMonths));
  }, [customMonths]);

  // State for Allocation Buckets
  const [buckets, setBuckets] = useState<AllocationBucket[]>(() => {
    try {
      const saved = localStorage.getItem('keuangan_rumah_tangga_buckets_v2');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Gagal memuat Kantong Alokasi:', e);
    }
    return DEFAULT_BUCKETS; // Sensible starting buckets with 0 balances
  });

  // State for all transactions (Strictly empty at start!)
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('keuangan_rumah_tangga_records_v2');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Gagal memuat riwayat transaksi:', e);
    }
    return []; // Blank initial state as requested by User!
  });

  // State for debts and commitments
  const [debts, setDebts] = useState<DebtItem[]>(() => {
    try {
      const saved = localStorage.getItem('keuangan_rumah_tangga_debts_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Gagal memuat Hutang-Piutang:', e);
    }
    return [];
  });

  const [onlineMembers, setOnlineMembers] = useState<{ userId: string; role: string; socketId: string }[]>([]);
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
// Real-time domestic syncing states
  const [syncCode, setSyncCode] = useState<string>(() => {
    return localStorage.getItem('keuangan_sync_code') || '';
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');
  const [syncError, setSyncError] = useState<string>('');
  const [localLastUpdatedAt, setLocalLastUpdatedAt] = useState<string>(() => {
    return localStorage.getItem('keuangan_sync_last_updated') || '';
  });
  const [syncCodeInput, setSyncCodeInput] = useState<string>('');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [showSyncPanel, setShowSyncPanel] = useState<boolean>(false);
  const [showNewMForm, setShowNewMForm] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem('keuangan_sync_token') || '');
  const [authUserId, setAuthUserId] = useState<string>('');
  const [authRole, setAuthRole] = useState<string>('ANGGOTA');
  const [showFamilyPanel, setShowFamilyPanel] = useState(false);
  const [newMonthInput, setNewMonthInput] = useState<string>(() => {
    // default to next month
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().substring(0, 7);
  });

  // Dynamic Real-time toast notifications state
  const [toasts, setToasts] = useState<{
    id: string;
    type: 'success' | 'warning' | 'info' | 'error';
    title: string;
    message: string;
  }[]>([]);

  // Enhanced notification bell state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addNotification = (type: AppNotification['type'], title: string, message: string, actionable?: boolean, actionLabel?: string, onAction?: () => void) => {
    const id = Math.random().toString(36).substring(2, 10);
    const newNotif: AppNotification = {
      id, type, title, message,
      timestamp: new Date(),
      read: false,
      actionable,
      actionLabel,
      onAction,
    };
    setNotifications((prev) => [newNotif, ...prev].slice(0, 50)); // max 50
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const addToast = (type: 'success' | 'warning' | 'info' | 'error', title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 10);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    // Also add to notification bell
    addNotification(type, title, message);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Toast on Selected Month changed
  const isFirstMonthRender = useRef(true);
  useEffect(() => {
    if (isFirstMonthRender.current) {
      isFirstMonthRender.current = false;
      return;
    }
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    let monthLabel = '';
    if (selectedMonth === 'all') {
      monthLabel = 'Semua Periode';
    } else {
      const [yr, mt] = selectedMonth.split('-');
      const mName = monthNames[parseInt(mt, 10) - 1] || mt;
      monthLabel = `${mName} ${yr}`;
    }
    addToast('info', 'Pindah Periode', `Menampilkan pembukuan untuk periode ${monthLabel}.`);
  }, [selectedMonth]);

  // Google Authenticated Syncing States
  const [googleUser, setGoogleUser] = useState<{ email: string; name: string; picture: string } | null>(() => {
    try {
      const saved = localStorage.getItem('keuangan_google_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [partnerEmail, setPartnerEmail] = useState<string>(() => {
    return localStorage.getItem('keuangan_partner_email') || '';
  });

  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    return localStorage.getItem('keuangan_google_client_id') || '499871279638-q21uta2g92mhsv0a8etk4popq2c029jf.apps.googleusercontent.com';
  });

  const [authMode, setAuthMode] = useState<'instant' | 'oauth'>(() => {
    return (localStorage.getItem('keuangan_auth_mode') as 'instant' | 'oauth') || 'instant';
  });

  const isSyncingFromServerRef = useRef(false);

  // Calculate under-the-hood room code using alphabetical Google Account sorted join
  const getGoogleRoomCode = (userEmail: string, spouseEmail: string): string => {
    const email1 = userEmail.toLowerCase().trim();
    const email2 = spouseEmail.toLowerCase().trim();
    if (!email2) {
      return `GOOG_${email1}`;
    }
    const sorted = [email1, email2].sort();
    return `GOOGSHARED_${sorted[0]}_${sorted[1]}`;
  };

  // Safe client-side JWT decoder
  function parseJwt(token: string) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  // Load GIS Script dynamic mount
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    return () => {
      try {
        document.head.removeChild(script);
      } catch (e) {}
    };
  }, []);

  // Sync code updates automatically when Google user or spouse email state changes
  useEffect(() => {
    if (googleUser && googleUser.email) {
      const room = getGoogleRoomCode(googleUser.email, partnerEmail);
      setSyncCode(room);
      localStorage.setItem('keuangan_sync_code', room);
      // Auto-join ke server untuk dapatkan JWT token
      autoJoinServer(room, googleUser.email);
    }
  }, [googleUser, partnerEmail]);

  const autoJoinServer = async (roomCode: string, userEmail: string) => {
    try {
      const existingToken = localStorage.getItem('keuangan_sync_token');
      // Kalau sudah punya token untuk room ini, skip
      if (existingToken) {
        try {
          const payload = JSON.parse(atob(existingToken.split('.')[1]));
          if (payload.code === roomCode && payload.exp > Date.now() / 1000) return;
        } catch {}
      }
      const res = await fetch('/api/sync/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: roomCode,
          userId: userEmail,
          role: 'KEPALA_KELUARGA',
          clientTransactions: [],
          clientBuckets: [],
          clientAccounts: [],
          clientDebts: []
        })
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('keuangan_sync_token', data.token);
        console.log('[Auth]  JWT token berhasil didapat untuk room:', roomCode);
      }
      if (data.group) {
        const { transactions: sTx, buckets: sB, accounts: sAcc, debtData: sDebt, updatedAt: sUpdatedAt } = data.group;
        isSyncingFromServerRef.current = true;
        if (sTx && sTx.length > 0) setTransactions(sTx);
        if (sB && sB.length > 0) setBuckets(sB);
        if (sAcc && sAcc.length > 0) setAccounts(sAcc);
        if (sDebt && sDebt.length > 0) setDebts(sDebt);
        if (sUpdatedAt) {
          setLocalLastUpdatedAt(sUpdatedAt);
          localStorage.setItem('keuangan_sync_last_updated', sUpdatedAt);
          setLastSyncedTime(new Date(sUpdatedAt).toLocaleTimeString('id-ID'));
        }
      }
    } catch (err) {
      console.error('[Auth] Gagal auto-join server:', err);
    }
  };

  useEffect(() => {
    localStorage.setItem('keuangan_partner_email', partnerEmail);
  }, [partnerEmail]);

  useEffect(() => {
    localStorage.setItem('keuangan_google_client_id', googleClientId);
  }, [googleClientId]);

  useEffect(() => {
    localStorage.setItem('keuangan_auth_mode', authMode);
  }, [authMode]);

  // Persist accounts locally
  useEffect(() => {
    try {
      localStorage.setItem('keuangan_rumah_tangga_accounts_v2', JSON.stringify(accounts));
    } catch (e) {
      console.error('Gagal menyimpan Rekening:', e);
    }
  }, [accounts]);

  // Persist debts locally
  useEffect(() => {
    try {
      localStorage.setItem('keuangan_rumah_tangga_debts_v2', JSON.stringify(debts));
    } catch (e) {
      console.error('Gagal menyimpan Hutang-Piutang:', e);
    }
  }, [debts]);

  // Decode JWT to get current user info
  useEffect(() => {
    const token = localStorage.getItem('keuangan_sync_token');
    if (token) {
      setAuthToken(token);
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.userId) setAuthUserId(payload.userId);
        if (payload.role) setAuthRole(payload.role);
      } catch {}
    }
  }, [syncCode]);

  // Polling: sync data dari server setiap 4 detik
  useEffect(() => {
    if (!syncCode) return;
    
    const interval = setInterval(() => {
      fetchLatestData();
    }, 4000);

    return () => clearInterval(interval);
  }, [syncCode]);

  // Polling: anggota online setiap 10 detik
  useEffect(() => {
    if (!syncCode) return;

    const fetchMembers = async () => {
      try {
        const token = localStorage.getItem('keuangan_sync_token');
        if (!token) return;
        const res = await fetch('/api/sync/members', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setOnlineMembers(data.members || []);
      } catch {}
    };

    fetchMembers();
    const interval = setInterval(fetchMembers, 10000);
    return () => clearInterval(interval);
  }, [syncCode]);

  // Polling: aktivitas keluarga setiap 15 detik
  useEffect(() => {
    if (!syncCode) return;

    const fetchActivity = async () => {
      try {
        const token = localStorage.getItem('keuangan_sync_token');
        if (!token) return;
        const since = lastActivityFetchRef.current;
        const res = await fetch('/api/sync/activity?since=' + encodeURIComponent(since), {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.logs && data.logs.length > 0) {
          setActivityHistory(prev => {
            const existing = new Set(prev.map(l => l.id));
            const newLogs = data.logs.filter((l) => !existing.has(l.id));
            return [...newLogs, ...prev].slice(0, 50);
          });
          lastActivityFetchRef.current = new Date().toISOString();
        }
      } catch {}
    };

    fetchActivity();
    const interval = setInterval(fetchActivity, 15000);
    return () => clearInterval(interval);
  }, [syncCode]);  // Sync update to server when local content is altered (debounced slightly to prevent overlapping runs)
  useEffect(() => {
    if (!syncCode) return;
    
    // If state change comes from a polling/auto-join push, prevent self-feedback loop
    if (isSyncingFromServerRef.current) {
      isSyncingFromServerRef.current = false;
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      pushDataToServer(transactions, buckets, accounts, debts);
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [transactions, buckets, accounts, debts, syncCode]);

  // Store last sync session states to storage
  useEffect(() => {
    if (localLastUpdatedAt) {
      localStorage.setItem('keuangan_sync_last_updated', localLastUpdatedAt);
    } else {
      localStorage.removeItem('keuangan_sync_last_updated');
    }
  }, [localLastUpdatedAt]);

  useEffect(() => {
    if (syncCode) {
      localStorage.setItem('keuangan_sync_code', syncCode);
    } else {
      localStorage.removeItem('keuangan_sync_code');
    }
  }, [syncCode]);

  // Method to poll/pull standard state from synchronization cloud server (fallback / initial pull)
  const fetchLatestData = async () => {
    const currentCode = localStorage.getItem('keuangan_sync_code');
    const currentToken = localStorage.getItem('keuangan_sync_token');
    if (!currentCode) return;
    try {
      setIsSyncing(true);
      const res = await fetch(`/api/sync/pull?code=${encodeURIComponent(currentCode)}`, {
        headers: {
          'Authorization': currentToken ? `Bearer ${currentToken}` : ''
        }
      });
      if (!res.ok) throw new Error('API pull failure');
      const data = await res.json();
      if (data.group) {
        const { transactions: sTx, buckets: sB, accounts: sAcc, debtData: sDebt, updatedAt: sUpdatedAt } = data.group;
        
        const currentLocalStamp = localStorage.getItem('keuangan_sync_last_updated') || '';
        if (sUpdatedAt !== currentLocalStamp) {
          isSyncingFromServerRef.current = true;
          setTransactions(sTx || []);
          setBuckets(sB || []);
          if (sAcc && Array.isArray(sAcc)) {
            setAccounts(sAcc);
          }
          if (sDebt && Array.isArray(sDebt)) {
            setDebts(sDebt);
          }
          setLocalLastUpdatedAt(sUpdatedAt);
          setLastSyncedTime(new Date(sUpdatedAt).toLocaleTimeString('id-ID'));
        }
        setSyncError('');
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      setSyncError('Koneksi terganggu. Mencoba memulihkan hubungan real-time...');
    } finally {
      setIsSyncing(false);
    }
  };

  // Method to upload/push state modifications to cloud server
  const pushDataToServer = async (txList: Transaction[], bList: AllocationBucket[], accList: Account[], dList: DebtItem[] = []) => {
    const currentCode = localStorage.getItem('keuangan_sync_code');
    const currentToken = localStorage.getItem('keuangan_sync_token');
    if (!currentCode) return;
    try {
      setIsSyncing(true);
      const res = await fetch('/api/sync/update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': currentToken ? `Bearer ${currentToken}` : ''
        },
        body: JSON.stringify({
          code: currentCode,
          transactions: txList,
          buckets: bList,
          accounts: accList,
          debtData: dList
        })
      });
      if (!res.ok) throw new Error('API push failure');
      const data = await res.json();
      if (data.group) {
        setLocalLastUpdatedAt(data.group.updatedAt);
        setLastSyncedTime(new Date(data.group.updatedAt).toLocaleTimeString('id-ID'));
        setSyncError('');
      }
    } catch (err) {
      console.error('Push Error:', err);
      setSyncError('Data disimpan lokal. Menunggu sambungan internet kembali untuk sync...');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncError('');
    setSyncMessage('');

    const trimmedInput = syncCodeInput.toUpperCase().trim();
    if (!trimmedInput) {
      setSyncError('Kode / Nama Rumah Tangga wajib diisi!');
      return;
    }

    try {
      setIsSyncing(true);
      const computedUserId = googleUser ? googleUser.email : `Pengguna_${Math.random().toString(36).substring(2, 6)}`;
      const res = await fetch('/api/sync/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: trimmedInput,
          clientTransactions: transactions,
          clientBuckets: buckets,
          clientAccounts: accounts,
          clientDebts: debts,
          userId: computedUserId,
          role: 'KEPALA_KELUARGA'
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal terhubung!');
      }

      const data = await res.json();
      if (data.group) {
        setSyncCode(trimmedInput);
        localStorage.setItem('keuangan_sync_code', trimmedInput);
        if (data.token) {
          localStorage.setItem('keuangan_sync_token', data.token);
        }
        
        const { transactions: sTx, buckets: sB, accounts: sAcc, debtData: sDebt, updatedAt: sUpdatedAt } = data.group;
        isSyncingFromServerRef.current = true;
        setTransactions(sTx || []);
        setBuckets(sB || []);
        if (sAcc && Array.isArray(sAcc)) {
          setAccounts(sAcc);
        }
        if (sDebt && Array.isArray(sDebt)) {
          setDebts(sDebt);
        }
        setLocalLastUpdatedAt(sUpdatedAt);
        localStorage.setItem('keuangan_sync_last_updated', sUpdatedAt);
        setLastSyncedTime(new Date(sUpdatedAt).toLocaleTimeString('id-ID'));
        setSyncMessage(data.message || 'Saku Bersama Berhasil Terhubung!');
        setSyncCodeInput('');
      }
    } catch (err: any) {
      setSyncError(err.message || 'Gagal tersambung ke server.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectSync = () => {
    if (window.confirm('Lepas hubungan sinkronisasi ini? Seluruh data saat ini akan tetap tersimpan di perangkat Anda saja, namun data baru tidak lagi dikirimkan ke perangkat pasangan Anda secara langsung.')) {
      setSyncCode('');
      setLocalLastUpdatedAt('');
      setLastSyncedTime('');
      setGoogleUser(null);
      setPartnerEmail('');
      setOnlineMembers([]);
      localStorage.removeItem('keuangan_sync_code');
      localStorage.removeItem('keuangan_sync_last_updated');
      localStorage.removeItem('keuangan_sync_token');
      localStorage.removeItem('keuangan_google_user');
      localStorage.removeItem('keuangan_partner_email');
      setSyncMessage('Hubungan sinkronisasi berhasil dinonaktifkan. Aplikasi kembali ke mode offline (Lokal).');
    }
  };

  // Security lock & configurations states
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return !!localStorage.getItem('keuangan_secure_pin');
  });
  const [showSecurityModal, setShowSecurityModal] = useState<boolean>(false);
  const [hasPin, setHasPin] = useState<boolean>(() => {
    return !!localStorage.getItem('keuangan_secure_pin');
  });

  const [currentPinInput, setCurrentPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [confirmNewPin, setConfirmNewPin] = useState<string>('');
  const [newHintInput, setNewHintInput] = useState<string>('');
  const [modalError, setModalError] = useState<string>('');
  const [modalSuccess, setModalSuccess] = useState<string>('');

  const refreshHasPin = () => {
    setHasPin(!!localStorage.getItem('keuangan_secure_pin'));
  };

  const resetModalFields = () => {
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmNewPin('');
    setNewHintInput('');
    setModalError('');
    setModalSuccess('');
  };

  const handleUpdateSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    const storedPin = localStorage.getItem('keuangan_secure_pin');

    if (storedPin) {
      const isCurrentMatch = 
        currentPinInput === storedPin || 
        hashSHA256(currentPinInput) === storedPin;

      if (!isCurrentMatch) {
        setModalError('PIN saat ini tidak sesuai!');
        return;
      }

      if (!newPinInput) {
        // Turning off security
        localStorage.removeItem('keuangan_secure_pin');
        localStorage.removeItem('keuangan_secure_pin_hint');
        setModalSuccess('PIN pengunci keamanan berhasil dinonaktifkan.');
        setTimeout(() => {
          refreshHasPin();
          setShowSecurityModal(false);
          resetModalFields();
        }, 1500);
        return;
      }
    }

    if (newPinInput.length < 4) {
      setModalError('PIN baru minimal harus terdiri dari 4 digit angka!');
      return;
    }

    const cleanNewPin = newPinInput.replace(/[^0-9]/g, '');
    if (cleanNewPin !== newPinInput) {
      setModalError('PIN baru hanya boleh berisi angka saja!');
      return;
    }

    if (newPinInput !== confirmNewPin) {
      setModalError('Konfirmasi PIN baru tidak sesuai!');
      return;
    }

    // Hash and store PIN code with SHA-256
    localStorage.setItem('keuangan_secure_pin', hashSHA256(newPinInput));
    if (newHintInput.trim()) {
      localStorage.setItem('keuangan_secure_pin_hint', newHintInput.trim());
    } else {
      localStorage.removeItem('keuangan_secure_pin_hint');
    }

    setModalSuccess('PIN keamanan Anda berhasil disimpan!');
    setTimeout(() => {
      refreshHasPin();
      setShowSecurityModal(false);
      resetModalFields();
    }, 1500);
  };

  // Persist buckets
  useEffect(() => {
    try {
      localStorage.setItem('keuangan_rumah_tangga_buckets_v2', JSON.stringify(buckets));
    } catch (e) {
      console.error('Gagal menyimpan Kantong Alokasi:', e);
    }
  }, [buckets]);

  // Persist transactions
  useEffect(() => {
    try {
      localStorage.setItem('keuangan_rumah_tangga_records_v2', JSON.stringify(transactions));
    } catch (e) {
      console.error('Gagal menyimpan riwayat transaksi:', e);
    }
  }, [transactions]);

  // Handle adding new custom bucket
  const handleAddBucket = (bucketData: Omit<AllocationBucket, 'id'>) => {
    const newBucket: AllocationBucket = {
      ...bucketData,
      id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setBuckets((prev) => [...prev, newBucket]);
    addToast('success', 'Saku Baru Dibuat ', `Kantong Saku "${bucketData.name}" siap dialokasikan anggaran.`);
  };

  // Handle deleting bucket (transfers associated tx back to "umum")
  const handleDeleteBucket = (id: string) => {
    const target = buckets.find(b => b.id === id);
    setBuckets((prev) => prev.filter((b) => b.id !== id));
    setTransactions((prev) => 
      prev.map((tx) => tx.bucketId === id ? { ...tx, bucketId: 'umum' } : tx)
    );
    addToast('warning', 'Saku Alokasi Dihapus ', `Saku "${target?.name || ''}" dihapus. Riwayat transaksi dialihkan ke Saku Utama.`);
  };

  // Handle updating an existing custom bucket
  const handleUpdateBucket = (id: string, updatedData: { name: string; targetAmount: number; color: string; icon: string }) => {
    setBuckets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updatedData } : b))
    );
    addToast('success', 'Saku Diperbarui ', `Perubahan informasi Saku "${updatedData.name}" berhasil disimpan.`);
  };

  // Handle updating an existing account / wallet
  const handleUpdateAccount = (id: string, updatedData: Partial<Account>) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, ...updatedData } : acc))
    );
    addToast('success', 'Rekening Diperbarui ', `Informasi penyimpanan "${updatedData.name || 'Rekening'}" berhasil disesuaikan.`);
  };

  // Handle adding a new bookkeeping month
  const handleAddBookMonth = (yrMonth: string) => {
    if (!yrMonth || !/^\d{4}-\d{2}$/.test(yrMonth)) return;
    if (!customMonths.includes(yrMonth)) {
      setCustomMonths((prev) => [...prev, yrMonth]);
    }
    setSelectedMonth(yrMonth);
    // Convert YYYY-MM to Indonesian
    const [yr, mt] = yrMonth.split('-');
    const mNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const name = mNames[parseInt(mt, 10) - 1] || mt;
    addToast('success', 'Buku Baru Dimulai ', `Lembar pembukuan periode ${name} ${yr} telah ditambahkan.`);
  };

  // Handle deleting a bookkeeping month
  const handleDeleteBookMonth = (yrMonth: string) => {
    if (customMonths.length <= 1) {
      alert("Minimal harus ada satu bulan pembukuan terdaftar!");
      return;
    }
    if (window.confirm(`Hapus pembukuan bulan ${yrMonth}? Catatan transaksi di dalam bulan ini tidak akan terhapus, namun bulan ini akan hilang dari filter pencarian cepat.`)) {
      const remaining = customMonths.filter(m => m !== yrMonth);
      setCustomMonths(remaining);
      if (selectedMonth === yrMonth) {
        setSelectedMonth(remaining[0] || 'all');
      }
      addToast('warning', 'Buku Bulanan Dihapus ', `Periode ${yrMonth} dibersihkan dari daftar pembukuan cepat.`);
    }
  };

  // 1. Calculate dynamic balances for each account (rekening)
  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    
    // Initialize with each account's initial balance
    accounts.forEach((acc) => {
      balances[acc.id] = acc.initialBalance || 0;
    });

    // Compute from transactions ledger
    transactions.forEach((tx) => {
      if (tx.type === 'income') {
        if (tx.accountId && balances[tx.accountId] !== undefined) {
          balances[tx.accountId] += tx.amount;
        }
      } else if (tx.type === 'expense') {
        if (tx.accountId && balances[tx.accountId] !== undefined) {
          balances[tx.accountId] -= tx.amount;
        }
      } else if (tx.type === 'transfer') {
        if (tx.accountId && balances[tx.accountId] !== undefined) {
          balances[tx.accountId] -= tx.amount;
        }
        if (tx.toAccountId && balances[tx.toAccountId] !== undefined) {
          balances[tx.toAccountId] += tx.amount;
        }
      }
    });

    return balances;
  }, [accounts, transactions]);

  // 2. Calculate dynamic balances for each pocket / allocation bucket
  const bucketBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    
    // Set initial zero balances
    buckets.forEach((b) => {
      balances[b.id] = 0;
    });

    // Compute from transactions ledger
    transactions.forEach((tx) => {
      if (tx.bucketId && tx.bucketId !== 'umum') {
        if (balances[tx.bucketId] === undefined) {
          balances[tx.bucketId] = 0;
        }
        if (tx.type === 'income') {
          balances[tx.bucketId] += tx.amount;
        } else if (tx.type === 'expense') {
          balances[tx.bucketId] -= tx.amount;
        }
      }
    });

    return balances;
  }, [transactions, buckets]);

  // 3. Extract unique months for drop-down filter
  const availableMonths = useMemo(() => {
    const list = new Set<string>();
    customMonths.forEach(m => list.add(m));
    transactions.forEach((tx) => {
      if (tx.date && tx.date.length >= 7) {
        list.add(tx.date.substring(0, 7)); // YYYY-MM
      }
    });
    return Array.from(list).sort().reverse();
  }, [transactions, customMonths]);

  // 4. Monthly transactions subset filter
  const filteredTransactionsByMonth = useMemo(() => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter((tx) => tx.date && tx.date.substring(0, 7) === selectedMonth);
  }, [transactions, selectedMonth]);

  // 5. Calculations for summary card values
  const summary: FinanceSummaryData = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    filteredTransactionsByMonth.forEach((tx) => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalExpense += tx.amount;
      }
    });

    const remainingBalance = totalIncome - totalExpense;

    // Sum of pockets balance in the active/filtered scope
    let allocatedBalance = 0;
    Object.keys(bucketBalances).forEach((bId) => {
      let bIncome = 0;
      let bExpense = 0;
      filteredTransactionsByMonth.forEach((tx) => {
        if (tx.bucketId === bId) {
          if (tx.type === 'income') bIncome += tx.amount;
          else if (tx.type === 'expense') bExpense += tx.amount;
        }
      });
      allocatedBalance += (bIncome - bExpense);
    });

    const unallocatedBalance = remainingBalance - allocatedBalance;

    return {
      totalIncome,
      totalExpense,
      remainingBalance,
      allocatedBalance,
      unallocatedBalance,
    };
  }, [filteredTransactionsByMonth, bucketBalances]);

  // Statistics counters (e.g. badge info)
  const counts = useMemo(() => {
    let incomeCount = 0;
    let expenseCount = 0;

    filteredTransactionsByMonth.forEach((tx) => {
      tx.type === 'income' ? incomeCount++ : expenseCount++;
    });

    return {
      total: filteredTransactionsByMonth.length,
      incomeCount,
      expenseCount,
    };
  }, [filteredTransactionsByMonth]);

  // Insert a new transaction
  const handleAddTransaction = (data: {
    type: TransactionType;
    amount: number;
    description: string;
    date: string;
    bucketId: string;
    accountId?: string;
    category?: string;
  }) => {
    const newTx: Transaction = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 12),
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: data.date,
      bucketId: data.bucketId,
      accountId: data.accountId,
      category: data.category,
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [newTx, ...prev]);

    const formattedVal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.amount);
    const label = data.type === 'income' ? 'Pemasukan ' : 'Pengeluaran ';
    addToast('success', `${label} Berhasil Dicatat`, `${data.description} senilai ${formattedVal} ditambahkan ke sistem.`);
  };

  // Create accounts handlers
  const handleAddAccount = (accData: Omit<Account, 'id'>) => {
    const newAcc: Account = {
      ...accData,
      id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setAccounts((prev) => [...prev, newAcc]);
    addToast('success', 'Rekening Ditambahkan ', `Akun penyimpanan "${accData.name}" siap digunakan.`);
  };

  const handleDeleteAccount = (id: string) => {
    const target = accounts.find(a => a.id === id);
    const updatedAccounts = accounts.filter((a) => a.id !== id);
    
    if (updatedAccounts.length === 0) {
      setAccounts(DEFAULT_ACCOUNTS);
      addToast('info', 'Penyimpanan Direset ', 'Penyimpanan telah dibersihkan kembali ke "Dompet Utama" kosong.');
    } else {
      setAccounts(updatedAccounts);
      addToast('warning', 'Rekening Dihapus ', `Akun penyimpanan "${target?.name || ''}" telah dibersihkan dari sistem.`);
    }

    setTransactions((prev) =>
      prev.map((tx) => {
        let updated = { ...tx };
        if (tx.accountId === id) delete updated.accountId;
        if (tx.toAccountId === id) delete updated.toAccountId;
        return updated;
      })
    );
  };

  const handleAccountTransfer = (fromAccountId: string, toAccountId: string, amount: number, description: string, dateStr: string) => {
    const fromAcc = accounts.find((a) => a.id === fromAccountId);
    const toAcc = accounts.find((a) => a.id === toAccountId);
    if (!fromAcc || !toAcc) return;

    const newTx: Transaction = {
      id: `tx-tf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'transfer',
      amount,
      description: description || `Transfer dari ${fromAcc.name} ke ${toAcc.name}`,
      date: dateStr || new Date().toISOString().substring(0, 10),
      bucketId: 'umum',
      accountId: fromAccountId,
      toAccountId: toAccountId,
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [newTx, ...prev]);
    const formattedVal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    addToast('success', 'Transfer Rekening Berhasil ', `Dana ${formattedVal} dipindahkan dari ${fromAcc.name} ke ${toAcc.name}.`);
  };

  // Internal wallet allocation transfer (Saku Utama -> Saku Alokasi)
  const handleTransferFunds = (amount: number, targetBucketId: string, description: string) => {
    const todayStr = new Date().toISOString().substring(0, 10);
    const targetBucket = buckets.find((b) => b.id === targetBucketId);
    if (!targetBucket) return;

    // 1. Transaction Cash OUT from 'umum' Saku Utama
    const txOut: Transaction = {
      id: `tx-tf-out-${Date.now()}-1`,
      type: 'expense',
      amount,
      description: `[Alokasi Keluar] ${description}`,
      date: todayStr,
      bucketId: 'umum',
      createdAt: new Date().toISOString(),
    };

    // 2. Transaction Cash IN to target Saku
    const txIn: Transaction = {
      id: `tx-tf-in-${Date.now()}-2`,
      type: 'income',
      amount,
      description: `[Alokasi Masuk] Diterima di ${targetBucket.name}`,
      date: todayStr,
      bucketId: targetBucketId,
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [txIn, txOut, ...prev]);
    const formattedVal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    addToast('success', 'Alokasi Saku Sukses ', `Dana ${formattedVal} dialokasikan ke saku "${targetBucket.name}".`);
  };

  // Withdraw money from a pocket back to Saku Utama
  const handleWithdrawFromPocket = (amount: number, sourceBucketId: string, description: string) => {
    const todayStr = new Date().toISOString().substring(0, 10);
    const sourceBucket = buckets.find((b) => b.id === sourceBucketId);
    if (!sourceBucket) return;

    // 1. Transaction Cash OUT from bucket pocket (reduces pocket balance)
    const txOut: Transaction = {
      id: `tx-tf-out-${Date.now()}-1`,
      type: 'expense',
      amount,
      description: `[Tarik Saku] ${description}`,
      date: todayStr,
      bucketId: sourceBucketId,
      createdAt: new Date().toISOString(),
    };

    // 2. Transaction Cash IN to Saku Utama ('umum') (increases Saku Utama)
    const txIn: Transaction = {
      id: `tx-tf-in-${Date.now()}-2`,
      type: 'income',
      amount,
      description: `[Pencairan Saku] Cair dari ${sourceBucket.name}`,
      date: todayStr,
      bucketId: 'umum',
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [txIn, txOut, ...prev]);
    const formattedVal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    addToast('info', 'Saldo Saku Ditarik ', `Dana ${formattedVal} dikembalikan dari saku "${sourceBucket.name}" ke Kas Saku Utama.`);
  };

  // Record an expense directly from a pocket
  const handleDirectPocketExpense = (amount: number, bucketId: string, description: string, dateStr: string) => {
    const bucket = buckets.find((b) => b.id === bucketId);
    const bucketName = bucket ? bucket.name : 'Saku';
    const newTx: Transaction = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 12),
      type: 'expense',
      amount,
      description: `[Saku: ${bucketName}] ${description}`,
      date: dateStr || new Date().toISOString().substring(0, 10),
      bucketId: bucketId,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);
    const formattedVal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    addToast('warning', 'Belanja Langsung Saku ', `Dana Saku "${bucketName}" dipakai belanja ${formattedVal} untuk ${description}.`);
  };

  // Record an income directly to a pocket
  const handleDirectPocketIncome = (amount: number, bucketId: string, description: string, dateStr: string) => {
    const bucket = buckets.find((b) => b.id === bucketId);
    const bucketName = bucket ? bucket.name : 'Saku';
    const newTx: Transaction = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 12),
      type: 'income',
      amount,
      description: `[Saku: ${bucketName}] ${description}`,
      date: dateStr || new Date().toISOString().substring(0, 10),
      bucketId: bucketId,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);
    const formattedVal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    addToast('success', 'Pendapatan Saku Dicatat ', `Menambah saldo Saku "${bucketName}" senilai ${formattedVal}.`);
  };

  // Delete transaction card
  const handleDeleteTransaction = (id: string) => {
    const target = transactions.find(t => t.id === id);
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    addToast('info', 'Catatan Dihapus ', `Transaksi "${target?.description || ''}" berhasil dibersihkan.`);
  };

  // Clear all database back to virgin empty state
  const handleClearAll = () => {
    setTransactions([]);
    setBuckets(DEFAULT_BUCKETS);
    setAccounts(DEFAULT_ACCOUNTS);
    addToast('error', 'Hapus Seluruh Data ', 'Seluruh riwayat pencatatan transaksi, rekening, dan saku alokasi Anda telah dibersihkan!');
  };

  // CSV Export for Pandas-compliance
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert('Tidak ada transaksi untuk diekspor!');
      return;
    }

    // CSV headers matching Pandas parsing structures
    const headers = ['ID', 'Tipe', 'Tanggal', 'Keterangan', 'Nominal_Jumlah_IDR', 'Kantong_Alokasi', 'Dibuat_Pada'];
    const rows = transactions.map((tx) => {
      const bDetail = tx.bucketId === 'umum' ? 'Saku Utama' : (buckets.find(b => b.id === tx.bucketId)?.name || 'Saku Terhapus');
      return [
        tx.id,
        tx.type === 'income' ? 'Uang Masuk / Pendapatan' : 'Uang Keluar / Pengeluaran',
        tx.date,
        `"${tx.description.replace(/"/g, '""')}"`, // escape quotes for security
        tx.amount,
        `"${bDetail.replace(/"/g, '""')}"`,
        tx.createdAt,
      ];
    });

    const csvContent = 
      'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const todayStr = new Date().toISOString().substring(0, 10);
    link.setAttribute('download', `keuangan_rumah_tangga_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLocked) {
    return (
      <SecurityGate 
        onUnlock={() => setIsLocked(false)} 
        isAppLocked={isLocked}
        onPINConfigChange={refreshHasPin}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50/50 flex flex-col selection:bg-indigo-600 selection:text-white pb-6">
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      
      {/* Dynamic Colored Brand Ribbon Banner */}
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-indigo-600 to-rose-500 shrink-0"></div>

      {/* Global Navigation Hub */}
      <nav className="bg-white border-b border-slate-100 py-4 px-4 sticky top-0 z-40 backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/30">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-850 tracking-tight">Finanku</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-50 border border-indigo-100 text-indigo-700 uppercase tracking-widest">
                  Rumah Tangga Pro
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Sistem Budgeting Amplop & Ledger Terintegrasi</p>
            </div>
          </div>

          {/* Export & Security Actions Box */}
          <div className="flex flex-wrap items-center gap-2 border-slate-100 sm:border-l sm:pl-3">
            {/* Family Members */}
            {syncCode && (
              <button
                onClick={() => setShowFamilyPanel(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold bg-[#000] text-white hover:bg-[#16181a] transition-all cursor-pointer border border-[#000]"
                title="Anggota Keluarga"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluarga</span>
              </button>
            )}
            {/* Notification Bell */}
            <NotificationBell
              notifications={notifications}
              onClear={removeNotification}
              onClearAll={clearAllNotifications}
              onMarkRead={markNotificationRead}
            />
            {/* Real-time Sync link action button */}
            <button
              id="btn-toggle-sync-panel"
              onClick={() => setShowSyncPanel(!showSyncPanel)}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none ${
                googleUser
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : syncCode 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'
              }`}
              title={googleUser ? `Terkoneksi Google: ${googleUser.email}` : 'Hubungkan HP / Google Account'}
            >
              {googleUser ? (
                <>
                  {googleUser.picture ? (
                    <img src={googleUser.picture} alt="Google Avatar" className="w-[18px] h-[18px] rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  <span className="max-w-[120px] truncate uppercase font-extrabold">{googleUser.name.split(' ')[0]}</span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
                </>
              ) : syncCode ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span className="max-w-[120px] truncate uppercase font-extrabold">{syncCode}</span>
                </>
              ) : (
                <>
                  <Link className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Saku Bersama</span>
                </>
              )}
            </button>

            {/* Quick manual lock action */}
            {hasPin && (
              <button
                id="btn-lock-session"
                onClick={() => setIsLocked(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all border border-rose-100 cursor-pointer"
                title="Kunci Sesi Belanja"
              >
                <Lock className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Kunci Aplikasi</span>
              </button>
            )}

            {/* Config lock action */}
            <button
              id="btn-trigger-security-settings"
              onClick={() => {
                resetModalFields();
                setShowSecurityModal(true);
              }}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                hasPin 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100'
              }`}
            >
              {hasPin ? (
                <>
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PIN Aktif</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span>Atur PIN</span>
                </>
              )}
            </button>

            <button
              id="btn-export-csv"
              onClick={handleExportCSV}
              disabled={transactions.length === 0}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold transition-all border outline-hidden ${
                transactions.length === 0
                  ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 active:scale-98 cursor-pointer'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              CSV
            </button>

            <button
              id="btn-export-excel"
              onClick={() => exportTransactionsToExcel(transactions)}
              disabled={transactions.length === 0}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold transition-all border outline-hidden ${
                transactions.length === 0
                  ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 active:scale-98 cursor-pointer'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Excel
            </button>

            <button
              id="btn-export-pdf"
              onClick={() => exportTransactionsToPDF(transactions, {
                totalIncome: summary.totalIncome,
                totalExpense: summary.totalExpense,
                netSavings: summary.remainingBalance
              })}
              disabled={transactions.length === 0}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold transition-all border outline-hidden ${
                transactions.length === 0
                  ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 active:scale-98 cursor-pointer'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-rose-600" />
              PDF
            </button>
          </div>
        </div>
      </nav>

      {/* Main Core Viewport Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 md:py-10 space-y-8">
        
        {/* App Greeting Callout */}
        <div id="welcome-callout" className="flex flex-col md:flex-row md:items-start justify-between gap-6 bg-linear-to-r from-slate-900 to-indigo-950 p-6 rounded-3xl text-white relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <LayoutDashboard className="w-48 h-48 text-white rotate-12" />
          </div>
          
          <div className="space-y-2 max-w-2xl z-10">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-500/20 text-indigo-205 rounded-full text-[10px] font-black uppercase tracking-wider text-indigo-300">
              <Sparkles className="w-3.5 h-3.5" /> Alokasi Amplop Pintar
            </span>
            <h2 className="text-xl md:text-2xl font-black tracking-tight leading-snug">
              Atur Keuangan Domestik Anda Secara Sistematis
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Alokasikan uang masuk ke dalam berbagai kantong digital seperti <strong className="text-white">Dana Darurat</strong>, <strong className="text-white">Tabungan Haji</strong>, atau <strong className="text-white">Investasi Mandiri</strong>. Saat pengeluaran tiba, bebankan langsung ke pos alokasi terkait agar rencana tabungan tidak berkurang tiba-tiba.
            </p>
          </div>

          <div className="space-y-1 bg-white/5 border border-white/10 p-4 rounded-2xl md:max-w-xs shrink-0 self-start text-xs leading-relaxed">
            <h5 className="font-bold text-indigo-200 flex items-center gap-1.5 mb-1 text-2xs uppercase tracking-widest">
              <HelpCircle className="w-4 h-4 shrink-0" /> Rumus Distribusi Saldo
            </h5>
            <p className="text-slate-350 text-[11px] font-medium font-sans">
              <strong>Saku Utama</strong> adalah sisa uang bebas yang belum dipindahkan ke kantong alokasi khusus mana pun. 
            </p>
          </div>
        </div>

        {/* Dynamic Cloud Synchronization setup panel for Households */}
        {(showSyncPanel || !googleUser) && (
          <div id="sync-setup-panel" className="bg-white border border-indigo-100 rounded-3xl p-6 shadow-md relative overflow-hidden transition-all duration-300">
            {/* Top decorative background icon */}
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 text-indigo-50/10 select-none pointer-events-none">
              <Users className="w-36 h-36" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 relative">
              {/* Informative column (Left side) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-700 inline-flex shrink-0">
                    <Users className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-850 uppercase tracking-wide leading-tight">
                      Saku Berbagi Suami Istri (Real-Time Sync)
                    </h3>
                    <p className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider">
                      Sinkronisasi Akun Google Otomatis
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Kini memantau keuangan keluarga menjadi instan dan otomatis! Dengan masuk ke akun Google yang sama pada device berbeda, atau dengan mendaftarkan email pasangan Anda di bawah, data saku alokasi, saldo, dan catatan pengeluaran & pemasukan akan tersinkronisasi secara real-time di HP masing-masing tanpa repot mengetik ulang.
                </p>

                {/* Connection Map visual for Spouse Linking */}
                {googleUser ? (
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-3">
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block">
                      DIAGRAM SALURAN SAKU BERBAGI
                    </span>
                    <div className="flex items-center justify-between gap-3 text-center">
                      <div className="flex flex-col items-center bg-white p-2.5 rounded-xl border border-emerald-100 shadow-3xs flex-1 max-w-[150px]">
                        <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs uppercase mb-1">
                          {googleUser.picture ? (
                            <img src={googleUser.picture} alt="A" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            googleUser.name.charAt(0)
                          )}
                        </span>
                        <span className="text-[10px] font-black text-slate-700 truncate w-full">{googleUser.name.split(' ')[0]}</span>
                        <span className="text-[9px] text-slate-400 truncate w-full italic">Email Anda</span>
                      </div>

                      <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="w-full flex items-center justify-center">
                          <div className="h-0.5 bg-emerald-200 grow relative">
                            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                          </div>
                          <span className="px-2 font-mono text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 rounded-md shrink-0 py-0.5">
                            {partnerEmail ? 'Shared Room' : 'Single Room'}
                          </span>
                          <div className="h-0.5 bg-emerald-200 grow relative">
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                          </div>
                        </div>
                        <span className="text-[9px] font-black text-emerald-600 mt-1 uppercase tracking-wider">
                          Real-Time Sync HP
                        </span>
                      </div>

                      <div className="flex flex-col items-center bg-white p-2.5 rounded-xl border border-emerald-100 shadow-3xs flex-1 max-w-[150px]">
                        <span className="w-8 h-8 rounded-full bg-indigo-50 border border-slate-205 text-indigo-700 flex items-center justify-center font-black text-xs uppercase mb-1">
                          {partnerEmail ? partnerEmail.charAt(0).toUpperCase() : <Users className="w-4 h-4 text-slate-400" />}
                        </span>
                        <span className="text-[10px] font-black text-slate-700 truncate w-full">
                          {partnerEmail ? partnerEmail.split('@')[0].toUpperCase() : 'Menunggu'}
                        </span>
                        <span className="text-[9px] text-slate-400 truncate w-full italic">
                          {partnerEmail ? 'Pasangan' : 'Kosong (Lokal)'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 space-y-1 font-medium bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                    <span className="font-bold text-slate-600 uppercase block text-3xs tracking-wider"> PETUNJUK KONEKSI:</span>
                    <p className="leading-snug">
                      1. Gunakan mode <strong>Hubungkan Instan</strong> untuk uji coba instan dengan mengetik alamat email Google yang sama pada 2 device berbeda.
                    </p>
                    <p className="leading-snug">
                      2. Gunakan mode <strong>Google Authentication</strong> dengan mendaftarkan Google Client ID Anda agar login lewat pop-up Google secara resmi.
                    </p>
                  </div>
                )}

                {/* Connection Status Badge */}
                {syncCode ? (
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                        <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                        Status: Terhubung ({syncCode.replace('GOOGSHARED_', 'BERSAMA: ').replace('GOOG_', 'PRIBADI: ')})
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 text-indigo-500 animate-spin" />
                        Terakhir update: {lastSyncedTime || 'Sinkronisasi Aktif'}
                      </span>
                    </div>

                    {onlineMembers.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">
                          Anggota Keluarga Online:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {onlineMembers.map((m) => (
                            <span 
                              key={m.userId} 
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-bold shadow-3xs"
                            >
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                              {m.userId.split('@')[0]} ({m.role})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 pt-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-50 border border-slate-200 text-slate-500 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                      <WifiOff className="w-3.5 h-3.5 text-slate-400" />
                      Mode Mandiri (Offline / Lokal)
                    </span>
                  </div>
                )}
              </div>

              {/* Login/Linking Form Column (Right side) */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-5 rounded-2xl relative z-10 shadow-3xs hover:border-slate-300 transition-all">
                {/* LOGGED IN VIEW */}
                {googleUser ? (
                  <div className="space-y-4">
                    {/* Logged in Profile details */}
                    <div className="bg-white border border-slate-150 p-3.5 rounded-xl flex items-center gap-3 shadow-3xs">
                      {googleUser.picture ? (
                        <img src={googleUser.picture} alt="Log Avatar" className="w-10 h-10 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold font-sans text-sm">
                          {googleUser.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="block text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">TERKONEKSI</span>
                        <span className="block text-xs font-black text-slate-800 truncate">{googleUser.name}</span>
                        <span className="block text-[10px] text-slate-400 truncate font-semibold">{googleUser.email}</span>
                      </div>
                    </div>

                    {/* Partner Email Management form */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        setSyncError('');
                        setSyncMessage('');

                        if (partnerEmail && (!partnerEmail.includes('@') || !partnerEmail.includes('.'))) {
                          setSyncError('Format email pasangan tidak valid!');
                          return;
                        }

                        if (partnerEmail && googleUser && partnerEmail.toLowerCase().trim() === googleUser.email.toLowerCase().trim()) {
                          setSyncError('Email pasangan tidak boleh sama dengan email Anda!');
                          return;
                        }

                        const pEmail = partnerEmail.toLowerCase().trim();
                        // Automatically update under-the-hood sync code
                        const room = getGoogleRoomCode(googleUser.email, pEmail);
                        setSyncCode(room);
                        localStorage.setItem('keuangan_sync_code', room);
                        setSyncMessage(pEmail 
                          ? `Berhasil tersambung ke Saku Bersama dengan pasangan Anda: ${pEmail}`
                          : 'Saku disinkronisasikan kembali ke akun pribadi Anda saja.'
                        );
                      }} 
                      className="space-y-3"
                    >
                      <div>
                        <label htmlFor="partner-email" className="block text-[10px] font-black text-slate-600 mb-1 leading-snug uppercase tracking-wider">
                          Email Google Pasangan / Suami / Istri
                        </label>
                        <div className="relative">
                          <input
                            id="partner-email"
                            type="email"
                            placeholder="nama.pasangan@gmail.com"
                            value={partnerEmail}
                            onChange={(e) => {
                              setPartnerEmail(e.target.value);
                              setSyncError('');
                              setSyncMessage('');
                            }}
                            className="w-full pl-8 pr-3 py-2 border border-slate-205 rounded-xl bg-white text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                          />
                          <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-1 leading-relaxed">
                          *Jika diisi, HP Anda dan HP pasangan akan saling melihat & sinkronsasi otomatis ke database saku yang sama.
                        </p>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Link className="w-3.5 h-3.5" />
                        Hubungkan Saku Pasangan
                      </button>
                    </form>

                    <div className="flex gap-2 pt-1.5 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={fetchLatestData}
                        disabled={isSyncing}
                        className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 text-2xs font-extrabold border border-slate-200 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${isSyncing ? 'animate-spin' : ''}`} />
                        Segarkan
                      </button>

                      <button
                        type="button"
                        onClick={handleDisconnectSync}
                        className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-2xs font-extrabold border border-rose-100 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                        Keluar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* NOT LOGGED IN - AUTHMORE TAB SELECTION */
                  <div className="space-y-4">
                    {/* Tabs indicator toggle */}
                    <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('instant');
                          setSyncError('');
                          setSyncMessage('');
                        }}
                        className={`py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                          authMode === 'instant' 
                            ? 'bg-white text-indigo-750 shadow-3xs' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                         Hubungkan Instan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('oauth');
                          setSyncError('');
                          setSyncMessage('');
                        }}
                        className={`py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                          authMode === 'oauth' 
                            ? 'bg-white text-indigo-750 shadow-3xs' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                         Google OAuth Resmi
                      </button>
                    </div>

                    {/* RENDER INSTANT CONNECT TAB */}
                    {authMode === 'instant' ? (
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          setSyncError('');
                          setSyncMessage('');

                          if (!syncCodeInput.includes('@') || !syncCodeInput.includes('.')) {
                            setSyncError('Ketik alamat email Google yang valid untuk uji coba instan!');
                            return;
                          }

                          const email = syncCodeInput.toLowerCase().trim();
                          const userInst = {
                            email,
                            name: email.split('@')[0].toUpperCase(),
                            picture: ''
                          };

                          setGoogleUser(userInst);
                          localStorage.setItem('keuangan_google_user', JSON.stringify(userInst));
                          
                          // Establish sync room
                          const room = getGoogleRoomCode(email, partnerEmail);
                          setSyncCode(room);
                          localStorage.setItem('keuangan_sync_code', room);

                          setSyncMessage(`Akun simulasi terhubung ke email: ${email}! Memulai real-time sync...`);
                          setSyncCodeInput('');
                        }} 
                        className="space-y-3"
                      >
                        <div>
                          <label htmlFor="temp-user-email" className="block text-[10px] font-black text-slate-600 mb-1 leading-snug uppercase tracking-wider">
                            Email Google Anda
                          </label>
                          <div className="relative">
                            <input
                              id="temp-user-email"
                              type="text"
                              placeholder="suami@gmail.com atau istri@gmail.com"
                              value={syncCodeInput}
                              onChange={(e) => {
                                setSyncCodeInput(e.target.value);
                                setSyncError('');
                                setSyncMessage('');
                              }}
                              className="w-full pl-8 pr-3 py-2 border border-slate-205 rounded-xl bg-white text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                            />
                            <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="temp-spouse-email" className="block text-[10px] font-black text-slate-600 mb-1 leading-snug uppercase tracking-wider">
                            Email Google Pasangan <span className="text-slate-400 font-medium">(Opsional)</span>
                          </label>
                          <div className="relative">
                            <input
                              id="temp-spouse-email"
                              type="email"
                              placeholder="nama.pasangan@gmail.com"
                              value={partnerEmail}
                              onChange={(e) => {
                                setPartnerEmail(e.target.value);
                                setSyncError('');
                                setSyncMessage('');
                              }}
                              className="w-full pl-8 pr-3 py-2 border border-slate-205 rounded-xl bg-white text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                            />
                            <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Link className="w-3.5 h-3.5" />
                          Masuk & Sinkronisasi
                        </button>
                      </form>
                    ) : (
                      /* RENDER OFFICIAL OAUTH TAB */
                      <div className="space-y-3.5">
                        <div className="text-center space-y-1 py-1">
                          <span className="text-2xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-widest">GOOGLE VERIFICATION MODE</span>
                          <p className="text-[10px] text-slate-400 leading-snug font-medium pt-1">
                            Tekan tombol di bawah untuk login ke akun Google resmi Anda secara aman.
                          </p>
                        </div>

                        {/* Interactive official Google GSI Button Container */}
                        <div className="bg-white border border-slate-200 p-3 rounded-2xl flex flex-col justify-center items-center shadow-3xs">
                          {/* Script-rendered official GIS button goes here */}
                          <div id="google-signin-btn-container" className="w-full flex justify-center py-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (!(window as any).google) {
                                  setSyncError('Google Identity Services SDK sedang diunduh, silakan tunggu sejenak lalu klik kembali!');
                                  return;
                                }
                                try {
                                  const cId = googleClientId.trim() || '1054366965158-mockclientid.apps.googleusercontent.com';
                                  (window as any).google.accounts.id.initialize({
                                    client_id: cId,
                                    callback: (res: any) => {
                                      const dec = parseJwt(res.credential);
                                      if (dec && dec.email) {
                                        const parsed = {
                                          email: dec.email,
                                          name: dec.name || dec.given_name || 'Alumni Google',
                                          picture: dec.picture || ''
                                        };
                                        setGoogleUser(parsed);
                                        localStorage.setItem('keuangan_google_user', JSON.stringify(parsed));
                                        
                                        const r = getGoogleRoomCode(dec.email, partnerEmail);
                                        setSyncCode(r);
                                        localStorage.setItem('keuangan_sync_code', r);
                                        
                                        setSyncMessage(`Login Google Sukses! email Anda: ${dec.email}`);
                                      } else {
                                        setSyncError('Gagal membaca kredensial profil dari Google JWT!');
                                      }
                                    }
                                  });
                                  (window as any).google.accounts.id.prompt();
                                } catch (err: any) {
                                  setSyncError(`Koneksi Gagal: ${err.message || err}`);
                                }
                              }}
                              className="w-full py-2 px-3 bg-white hover:bg-slate-50 border border-slate-205 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-3xs transition-all active:scale-98"
                            >
                              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                <path fill="#EA4335" d="M12 5.04c1.67 0 3.17.58 4.35 1.71l3.25-3.25C17.63 1.63 15 .5 12 .5 7.37.5 3.44 3.16 1.56 7.03l3.87 3C6.35 7.21 8.92 5.04 12 5.04z" />
                                <path fill="#4285F4" d="M23.5 12.25c0-.82-.07-1.62-.21-2.4H12v4.54h6.45c-.28 1.48-1.11 2.73-2.37 3.58l3.69 2.87c2.16-2 3.73-4.94 3.73-8.59z" />
                                <path fill="#FBBC05" d="M5.43 14.12c-.24-.71-.38-1.47-.38-2.25s.14-1.54.38-2.25L1.56 7.03C.56 9.03 0 11.24 0 13.62s.56 4.59 1.56 6.59l3.87-3.09z" />
                                <path fill="#34A853" d="M12 23.5c3.11 0 5.72-1.03 7.63-2.8l-3.69-2.87c-1.02.68-2.33 1.11-3.94 1.11-3.08 0-5.65-2.17-6.57-5.02L1.56 16.95C3.44 20.84 7.37 23.5 12 23.5z" />
                              </svg>
                              Masuk Lewat Akun Google
                            </button>
                          </div>
                        </div>

                        {/* Client ID Configuration gear setting */}
                        <div className="bg-white/40 border border-slate-200 p-3 rounded-xl space-y-2">
                          <label htmlFor="client-id-cfg" className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">
                             Google Client ID Kustom (Opsional)
                          </label>
                          <input
                            id="client-id-cfg"
                            type="text"
                            placeholder="Ketik Client ID Google Anda..."
                            value={googleClientId}
                            onChange={(e) => setGoogleClientId(e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-md text-[10px] font-mono focus:outline-hidden focus:border-indigo-400"
                          />
                          <p className="text-[9px] text-slate-400 font-medium leading-relaxed leading-normal">
                            *Jika kosong, aplikasi akan menggunakan Client ID bawaan penguji. Daftarkan Domain Preview Anda di Google Cloud Console APIS Credentials.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Response message banners */}
            {syncError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="leading-snug">{syncError}</span>
              </div>
            )}

            {syncMessage && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-105 text-emerald-850 text-xs font-bold rounded-xl flex items-center gap-2 animate-fade-in">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="leading-snug">{syncMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Real-time Family Activity History Log */}
        {syncCode && activityHistory.length > 0 && (
          <div id="family-activity-log-section" className="bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs hover:shadow-2xs transition-shadow space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-700 inline-flex shrink-0">
                <Users className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-850 uppercase tracking-wide leading-tight">
                  Riwayat Aktivitas Saku Bersama (Real-Time Log)
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                  Log aktivitas dan transaksi teraktual dari seluruh perangkat keluarga Anda
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-2">
              {activityHistory.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[9px] font-black uppercase tracking-wider shrink-0 mt-0.5">
                      {log.userRole}
                    </span>
                    <div className="min-w-0">
                      <span className="font-extrabold text-slate-700 break-words">{log.userId}</span>
                      <p className="text-slate-500 font-medium leading-relaxed">{log.description}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 shrink-0 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Month Selector Filter Block with "Buku Baru" Bookkeeping */}
        <div id="monthly-filter-section" className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                <CalendarDays className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-tight">Pembukuan & Filter Bulanan</h4>
                <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                  Pilih atau tambah pembukuan bulan baru untuk pemisahan data periodik
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-auto flex items-center gap-1.5 shrink-0">
                <select
                  id="selected-month-filter"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full sm:w-52 h-10 px-3 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-205 rounded-xl outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-505 transition-all cursor-pointer"
                >
                  <option value="all">Semua Periode (Gabungan)</option>
                  {availableMonths.map((m) => {
                    const [yr, mt] = m.split('-');
                    const monthNames = [
                      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                    ];
                    const mName = monthNames[parseInt(mt, 10) - 1] || mt;
                    return (
                      <option key={m} value={m}>
                        {mName} {yr}
                      </option>
                    );
                  })}
                </select>

                {selectedMonth !== 'all' && customMonths.includes(selectedMonth) && customMonths.length > 1 && (
                  <button
                    onClick={() => handleDeleteBookMonth(selectedMonth)}
                    className="p-2.5 h-10 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-150 transition-all cursor-pointer flex items-center justify-center"
                    title="Hapus bulan pembukuan ini dari pencarian cepat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowNewMForm(!showNewMForm)}
                className="inline-flex items-center gap-1 h-10 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buku Bulan Baru</span>
              </button>
            </div>
          </div>

          {showNewMForm && (
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-in">
              <div className="space-y-1 w-full sm:max-w-xs">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Pilih Bulan & Tahun Pembukuan Baru</label>
                <input
                  type="month"
                  value={newMonthInput}
                  onChange={(e) => setNewMonthInput(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-550 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (newMonthInput) {
                      handleAddBookMonth(newMonthInput);
                      setShowNewMForm(false);
                    }
                  }}
                  className="px-4 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Mulai Pembukuan Baru
                </button>
                <button
                  onClick={() => setShowNewMForm(false)}
                  className="px-3 h-10 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Real-time Monthly Financial Insights and Alerts Notification Hub */}
        <MonthlyNotificationCenter 
          summary={summary}
          selectedMonth={selectedMonth}
          buckets={buckets}
          bucketBalances={bucketBalances}
          transactions={filteredTransactionsByMonth}
        />

        {/* 1. Real-time Summary Cards Bento */}
        <section id="stats-summary-section" aria-label="Ringkasan Finansial">
          <FinanceSummary 
            summary={summary}
            transactionCount={counts.total}
            incomeCount={counts.incomeCount}
            expenseCount={counts.expenseCount}
          />
        </section>

        {/* Visual Reporting Charts Dashboard */}
        <section id="analytics-charts-section">
          <AnalyticsCharts 
            transactions={transactions} 
            buckets={buckets}
            selectedMonth={selectedMonth}
          />
        </section>

        {/* 2. Saku / Allocations Deck Box (New requested feature) */}
        <section id="allocation-deck-section" className="bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs hover:shadow-2xs transition-shadow">
          <AllocationBuckets
            buckets={buckets}
            unallocatedBalance={summary.unallocatedBalance}
            bucketBalances={bucketBalances}
            onAddBucket={handleAddBucket}
            onDeleteBucket={handleDeleteBucket}
            onUpdateBucket={handleUpdateBucket}
            onTransferFunds={handleTransferFunds}
            onWithdrawFunds={handleWithdrawFromPocket}
            onSpendFromPocket={handleDirectPocketExpense}
            onIncomeToPocket={handleDirectPocketIncome}
          />
        </section>

        {/* Detailed Bank Accounts and Wallet Balances (AccountsManager) */}
        <section id="accounts-manager-section">
          <AccountsManager
            accounts={accounts}
            accountBalances={accountBalances}
            onAddAccount={handleAddAccount}
            onDeleteAccount={handleDeleteAccount}
            onUpdateAccount={handleUpdateAccount}
            onAddTransfer={handleAccountTransfer}
          />
        </section>

        {/* Modul Hutang-Piutang dan Cicilan Keluarga */}
        <section id="debt-installment-tracker-section" className="bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs hover:shadow-2xs transition-shadow">
          <DebtInstallmentTracker
            items={debts}
            onAddItem={(item) => {
              const updated = [item, ...debts];
              setDebts(updated);
              addToast('success', 'Komitmen Dicatat ', `"${item.title}" ditambahkan ke buku hutang.`);
            }}
            onUpdateItem={(id, updatedData) => {
              const updated = debts.map((d) => d.id === id ? { ...d, ...updatedData } : d);
              setDebts(updated);
              const target = debts.find((d) => d.id === id);
              if (updatedData.status === 'paid') {
                addToast('success', 'Hutang Lunas ', `Selamat! Tagihan "${target?.title}" dinyatakan lunas.`);
              } else {
                addToast('info', 'Hutang Diperbarui ', `Pembayaran untuk "${target?.title}" telah diperbarui.`);
              }
            }}
            onDeleteItem={(id) => {
              const target = debts.find((d) => d.id === id);
              const updated = debts.filter((d) => d.id !== id);
              setDebts(updated);
              addToast('warning', 'Komitmen Dihapus ', `"${target?.title}" dibersihkan dari buku hutang.`);
            }}
          />
        </section>

        {/* 3. Form Input & Log List Grid */}
        <div id="core-interactive-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Area - Transaction Creation */}
          <section id="entry-form-column" className="lg:col-span-5">
            <TransactionForm 
              accounts={accounts} 
              buckets={buckets} 
              selectedMonth={selectedMonth}
              onAddTransaction={handleAddTransaction} 
            />
          </section>

          {/* Right Area - Advanced Log Table */}
          <section id="transactions-log-column" className="lg:col-span-7">
            <TransactionsTable 
              transactions={filteredTransactionsByMonth} 
              buckets={buckets}
              accounts={accounts}
              onDeleteTransaction={handleDeleteTransaction}
              onClearAll={handleClearAll}
            />
          </section>

        </div>

      </main>

      {/* Footer Branding - Clean & Humble to keep visual focus professional */}
      <footer id="app-footer" className="bg-white border-t border-slate-150/60 py-6 mt-16 text-center text-xs text-slate-400 font-medium shrink-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Finanku Rumah Tangga. Seluruh catatan tersimpan aman secara offline di browser perangkat Anda.</p>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Ledger Terverifikasi
          </div>
        </div>
      </footer>

      {/* Security management modal overlay */}
      {showSecurityModal && (
        <div id="security-config-modal-backdrop" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div id="security-config-modal-content" className="w-full max-w-sm bg-white rounded-3xl border border-slate-150 shadow-2xl overflow-hidden p-6 relative">
            
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-800 text-sm">Pengaturan PIN Pengunci</h3>
              </div>
              <button 
                id="btn-close-security-modal"
                onClick={() => {
                  setShowSecurityModal(false);
                  resetModalFields();
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSecurity} className="space-y-4">
              
              {/* Box A: enter current PIN to authenticate */}
              {hasPin && (
                <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="block text-[10px] font-black uppercase text-indigo-600 tracking-wider">Verifikasi Sesi</span>
                  <label htmlFor="modal-current-pin" className="block text-[11px] font-bold text-slate-700">
                    PIN Keamanan Saat Ini <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="modal-current-pin"
                    type="password"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="Wajib diisi"
                    value={currentPinInput}
                    onChange={(e) => {
                      setCurrentPinInput(e.target.value.replace(/[^0-9]/g, ''));
                      setModalError('');
                    }}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-center text-sm font-black tracking-widest text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                  />
                </div>
              )}

              {/* Box B: enter new PIN info */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="modal-new-pin" className="block text-[11px] font-bold text-slate-700">
                    {hasPin ? 'PIN Baru (Kosongkan jika mau mematikan)' : 'PIN Baru (Minimal 4 digit)'}
                  </label>
                  <input
                    id="modal-new-pin"
                    type="password"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={8}
                    placeholder={hasPin ? 'Biarkan kosong untuk hapus kunci' : 'Kombinasi angka rahasia baru'}
                    value={newPinInput}
                    onChange={(e) => {
                      setNewPinInput(e.target.value.replace(/[^0-9]/g, ''));
                      setModalError('');
                    }}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-black tracking-widest text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-indigo-100"
                  />
                  {hasPin && (
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                       Saku Tip: Biarkan "PIN Baru" kosong lalu masukkan "PIN Saat Ini" untuk menonaktifkan gembok kunci layar.
                    </p>
                  )}
                </div>

                {(!hasPin || newPinInput) && (
                  <>
                    <div className="space-y-1">
                      <label htmlFor="modal-confirm-pin" className="block text-[11px] font-bold text-slate-700">
                        Konfirmasi Ulang PIN Baru <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="modal-confirm-pin"
                        type="password"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={8}
                        placeholder="Ulangi kembali di sini"
                        value={confirmNewPin}
                        onChange={(e) => {
                          setConfirmNewPin(e.target.value.replace(/[^0-9]/g, ''));
                          setModalError('');
                        }}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-black tracking-widest text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-indigo-100"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="modal-new-hint" className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                        Petunjuk Bantuan PIN <span className="font-normal text-slate-400">(Opsional)</span>
                      </label>
                      <input
                        id="modal-new-hint"
                        type="text"
                        placeholder="Contoh: Tahun pernikahan"
                        value={newHintInput}
                        onChange={(e) => setNewHintInput(e.target.value)}
                        className="w-full px-4.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-4"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Alert error panel */}
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-bold leading-normal text-center">
                  {modalError}
                </div>
              )}

              {/* Alert success panel */}
              {modalSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-bold leading-normal text-center flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  {modalSuccess}
                </div>
              )}

              {/* Modals controls action */}
              <div className="flex gap-2.5 pt-2">
                <button
                  id="btn-cancel-modal"
                  type="button"
                  onClick={() => {
                    setShowSecurityModal(false);
                    resetModalFields();
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-modal"
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer text-center shadow-xs transition-colors"
                >
                  {hasPin && !newPinInput ? 'Hapus Kunci' : 'Simpan PIN'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Floating Dynamic Toaster Notification System */}
      <div 
        id="toast-notification-system-overlay" 
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-3.5 max-w-sm w-full font-sans pointer-events-none"
      >
        {toasts.map((toast) => {
          let toastBg = 'bg-white border-slate-100';
          let iconColor = 'text-indigo-600 bg-indigo-50 border-indigo-100';
          
          if (toast.type === 'success') {
            toastBg = 'bg-emerald-50/95 border-emerald-200 backdrop-blur-md text-emerald-950 shadow-lg shadow-emerald-100/30';
            iconColor = 'text-emerald-700 bg-emerald-100/80 border-emerald-200';
          } else if (toast.type === 'warning') {
            toastBg = 'bg-amber-50/95 border-amber-200 backdrop-blur-md text-amber-950 shadow-lg shadow-amber-100/30';
            iconColor = 'text-amber-700 bg-amber-100/80 border-amber-200';
          } else if (toast.type === 'info') {
            toastBg = 'bg-slate-900/95 border-slate-800 backdrop-blur-md text-white shadow-lg shadow-slate-900/40';
            iconColor = 'text-indigo-400 bg-slate-800 border-slate-700';
          } else if (toast.type === 'error') {
            toastBg = 'bg-rose-50/95 border-rose-200 backdrop-blur-md text-rose-950 shadow-lg shadow-rose-100/30';
            iconColor = 'text-rose-700 bg-rose-100/80 border-rose-200';
          }

          return (
            <div
              key={toast.id}
              id={`toast-${toast.id}`}
              className={`p-4 border rounded-2xl flex items-start gap-3 shadow-md pointer-events-auto transition-all animate-slide-up hover:scale-[1.01] ${toastBg}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border text-xs font-black ${iconColor}`}>
                {toast.type === 'success' && '✓'}
                {toast.type === 'warning' && '⚠'}
                {toast.type === 'info' && '💡'}
                {toast.type === 'error' && '✕'}
              </div>
              <div className="flex-1 space-y-0.5">
                <h4 className="text-xs font-black tracking-tight">{toast.title}</h4>
                <p className="text-[11px] font-semibold opacity-85 leading-relaxed">{toast.message}</p>
              </div>
              <button 
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-slate-400 hover:text-slate-650 opacity-60 hover:opacity-100 p-0.5 rounded cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Chat & Family Members */}
      {authToken && authUserId && (
        <ChatPanel
          token={authToken}
          currentUser={authUserId}
          currentName={authUserId.split('@')[0] || 'User'}
          apiBase=""
        />
      )}
      {showFamilyPanel && authToken && authUserId && (
        <FamilyMembersPanel
          token={authToken}
          currentUser={authUserId}
          currentRole={authRole}
          apiBase=""
          onClose={() => setShowFamilyPanel(false)}
        />
      )}

    </div>
  );
}
