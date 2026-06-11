import React, { useState, useEffect, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Plus, 
  HelpCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Wifi, 
  WifiOff 
} from 'lucide-react';
import { 
  Transaction, 
  TransactionType, 
  AllocationBucket, 
  FinanceSummaryData, 
  Account, 
  Goal, 
  Debt, 
  Installment, 
  Notification, 
  AuditLog, 
  TrashItem, 
  PresenceUser 
} from './types';

// Page components
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TransactionsPage from './components/TransactionsPage';
import AllocationBuckets from './components/AllocationBuckets';
import AccountsManager from './components/AccountsManager';
import AnalyticsCharts from './components/AnalyticsCharts';
import DebtInstallmentTracker, { DebtItem } from './components/DebtInstallmentTracker';
import AuthPage from './components/AuthPage';
import TrashBin from './components/TrashBin';
import AuditLogViewer from './components/AuditLogViewer';

// Form modals
import TransactionForm from './components/TransactionForm';
import { ActiveTab } from './components/Sidebar';

export default function App() {
  // Authentication states
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('family_jwt_token'));
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem('family_refresh_token'));
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('family_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [currentFamily, setCurrentFamily] = useState<any>(() => {
    const saved = localStorage.getItem('family_current_family');
    return saved ? JSON.parse(saved) : null;
  });

  // UI States
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('family_theme') === 'dark';
  });
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Date().toISOString().substring(0, 7); // current YYYY-MM
  });
  const [customMonths, setCustomMonths] = useState<string[]>(() => {
    return [new Date().toISOString().substring(0, 7)];
  });

  // Business States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [buckets, setBuckets] = useState<AllocationBucket[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<PresenceUser[]>([]);
  const [liveActivities, setLiveActivities] = useState<any[]>([]);

  // System States
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);
  const socketRef = useRef<any>(null);

  // Theme support
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('family_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('family_theme', 'light');
    }
  }, [isDarkMode]);

  // Toast notifier
  const addToast = (type: 'success' | 'warning' | 'info' | 'error', title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 10);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // Safe fetch helper with auto token refresh logic
  const apiFetch = async (path: string, options: RequestInit = {}) => {
    let activeToken = token;
    
    // Auto injection of headers
    const headers = {
      'Content-Type': 'application/json',
      ...(activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {}),
      ...(options.headers || {})
    };

    let response = await fetch(path, { ...options, headers });

    // Handle session expired -> Auto Refresh Token!
    if ((response.status === 401 || response.status === 403) && refreshToken) {
      console.log('Session stale. Attempting refresh token exchange...');
      try {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setToken(refreshData.token);
          localStorage.setItem('family_jwt_token', refreshData.token);

          // Retry once with new token
          const retryHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshData.token}`,
            ...(options.headers || {})
          };
          response = await fetch(path, { ...options, headers: retryHeaders });
        } else {
          handleForceLogout();
        }
      } catch {
        handleForceLogout();
      }
    }

    return response;
  };

  const handleForceLogout = () => {
    localStorage.removeItem('family_jwt_token');
    localStorage.removeItem('family_refresh_token');
    localStorage.removeItem('family_current_user');
    localStorage.removeItem('family_current_family');
    setToken(null);
    setRefreshToken(null);
    setCurrentUser(null);
    setCurrentFamily(null);
    addToast('error', 'Sesi Berakhir', 'Sesi keamanan Anda telah berakhir. Silakan login kembali.');
  };

  // Fetch all DB datasets at once
  const fetchAllData = async () => {
    if (!token) return;
    try {
      const [
        accountsRes,
        bucketsRes,
        txRes,
        goalsRes,
        debtRes,
        logRes,
        noticeRes,
        trashRes
      ] = await Promise.all([
        apiFetch('/api/accounts'),
        apiFetch('/api/buckets'),
        apiFetch('/api/transactions'),
        apiFetch('/api/goals'),
        apiFetch('/api/debts'),
        apiFetch('/api/audit-logs'),
        apiFetch('/api/notifications'),
        apiFetch('/api/trash')
      ]);

      if (accountsRes.ok) {
        const accData = await accountsRes.json();
        setAccounts(accData.accounts || []);
      }
      if (bucketsRes.ok) {
        const buckData = await bucketsRes.json();
        setBuckets(buckData.buckets || []);
      }
      if (txRes.ok) {
        const txData = await txRes.json();
        const txList = txData.transactions || [];
        setTransactions(txList);
        
        // Auto-extract booking months from all transaction dates
        const extractedMonths = new Set<string>();
        extractedMonths.add(new Date().toISOString().substring(0, 7));
        txList.forEach((t: any) => {
          if (t.date && t.date.length >= 7) {
            extractedMonths.add(t.date.substring(0, 7));
          }
        });
        setCustomMonths(Array.from(extractedMonths).sort().reverse());
      }
      if (goalsRes.ok) {
        const glData = await goalsRes.json();
        setGoals(glData.goals || []);
      }
      if (debtRes.ok) {
        const dData = await debtRes.json();
        setDebts(dData.debts || []);
      }
      if (logRes.ok) {
        const lgData = await logRes.json();
        setAuditLogs(lgData.logs || []);
      }
      if (noticeRes.ok) {
        const ntData = await noticeRes.json();
        setNotifications(ntData.notifications || []);
      }
      if (trashRes.ok) {
        const trData = await trashRes.json();
        setTrashItems(trData.trash || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Authenticate triggers
  const handleAuthSuccess = (newToken: string, newRefreshToken: string, user: any, family: any) => {
    localStorage.setItem('family_jwt_token', newToken);
    localStorage.setItem('family_refresh_token', newRefreshToken);
    localStorage.setItem('family_current_user', JSON.stringify(user));
    localStorage.setItem('family_current_family', JSON.stringify(family));
    
    setToken(newToken);
    setRefreshToken(newRefreshToken);
    setCurrentUser(user);
    setCurrentFamily(family);
    
    addToast('success', 'Membuka Sesi', `Berhasil memuat unit: ${family.name}`);
  };

  const handleLogout = () => {
    apiFetch('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    }).finally(() => {
      handleForceLogout();
    });
  };

  // Initial trigger fetch
  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token]);

  // WS Handshake and WebSockets listener
  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Connect socket
    const socket = io({
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket.IO Family Room connected Successfully');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket.IO Disonnected');
    });

    socket.on('presence:update', (members: PresenceUser[]) => {
      setOnlineMembers(members);
    });

    // SPECIFIC REQUIREMENT: Other user input/save signals background state fetch reload!
    socket.on('data:changed', (payload: any) => {
      console.log('Real-time updates received:', payload);
      
      // Update activity logs
      setLiveActivities((prev) => [
        { userName: payload.userName, description: payload.description, timestamp: new Date().toISOString() },
        ...prev.slice(0, 10)
      ]);

      // Pop visual alert toast
      addToast('info', payload.action.replace('_', ' '), payload.description);
      
      // Background reload data instantly without page reload!
      fetchAllData();
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Dynamic filter lists
  const filteredTransactions = useMemo(() => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter(t => t.date.substring(0, 7) === selectedMonth);
  }, [transactions, selectedMonth]);

  // Account dynamic balances
  const accountBalances = useMemo(() => {
    const map: Record<string, number> = {};
    accounts.forEach(a => {
      map[a.id] = a.balance || 0;
    });
    return map;
  }, [accounts]);

  // Bucket balances mapping
  const bucketBalances = useMemo(() => {
    const map: Record<string, number> = {};
    buckets.forEach(b => {
      map[b.id] = b.balance || 0;
    });
    return map;
  }, [buckets]);

  // Financial summary computation based on current monthly filters
  const summary = useMemo<FinanceSummaryData>(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    filteredTransactions.forEach(t => {
      if (t.type === 'income') totalIncome += t.amount;
      else if (t.type === 'expense') totalExpense += t.amount;
    });

    // Remaning balance computed over accounts
    const remainingBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const allocatedBalance = buckets.reduce((sum, b) => sum + (b.balance || 0), 0);
    const unallocatedBalance = Math.max(remainingBalance - allocatedBalance, 0);

    return {
      totalIncome,
      totalExpense,
      remainingBalance,
      allocatedBalance,
      unallocatedBalance
    };
  }, [filteredTransactions, accounts, buckets]);

  // Today's total expenses for warning thresh
  const todayExpense = useMemo(() => {
    const todayStr = new Date().toISOString().substring(0, 10);
    return transactions
      .filter(t => t.date === todayStr && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Business Action Callbacks
  const handleAddTransaction = async (txPayload: any) => {
    try {
      const res = await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(txPayload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan transaksi');
      }
      addToast('success', 'Transaksi Disimpan', 'Catatan kas berhasil didaftarkan ke server.');
      setIsTxModalOpen(false);
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus transaksi');
      }
      addToast('warning', 'Transaksi Dibuang', 'Catatan berhasil dipindahkan ke kotak sampah.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAddAccount = async (accPayload: any) => {
    try {
      const res = await apiFetch('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(accPayload)
      });
      if (!res.ok) throw new Error('Gagal membuat rekening baru');
      addToast('success', 'Rekening Baru', 'Penyimpanan dompet baru diatur.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      const res = await apiFetch(`/api/accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal.');
      addToast('warning', 'Rekening Dibuang', 'Saku rekening ditarik ke tong sampah.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdateAccount = async (id: string, updatedData: Partial<Account>) => {
    try {
      const res = await apiFetch(`/api/accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData)
      });
      if (!res.ok) throw new Error('Gagal.');
      addToast('success', 'Rekening Diperbarui', 'Spesifikasi detail dompet disesuaikan.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAddAccountTransfer = async (fromAccountId: string, toAccountId: string, amount: number, description: string, date: string) => {
    try {
      // Coordinated double-entry transfer ledger posts on server
      await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type: 'expense',
          amount,
          description: `[Transfer Keluar] ${description}`,
          date,
          accountId: fromAccountId,
          bucketId: 'umum',
          category: '🔄 Transfer Antar Rekening'
        })
      });

      await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type: 'income',
          amount,
          description: `[Transfer Masuk] ${description}`,
          date,
          accountId: toAccountId,
          bucketId: 'umum',
          category: '🔄 Transfer Antar Rekening'
        })
      });

      addToast('success', 'Transfer Akun Sukses', 'Dana saku antar bank dipindah bukukan.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAddBucket = async (bucketPayload: any) => {
    try {
      const res = await apiFetch('/api/buckets', {
        method: 'POST',
        body: JSON.stringify(bucketPayload)
      });
      if (!res.ok) throw new Error('Gagal menyediakan saku');
      addToast('success', 'Saku Dana Baru', 'Saku alokasi anggaran siap digunakan.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteBucket = async (id: string) => {
    try {
      const res = await apiFetch(`/api/buckets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal.');
      addToast('warning', 'Alokasi Diarsip', 'Kantong dipindahkan ke tong sampah.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdateBucket = async (id: string, updatedData: any) => {
    try {
      const res = await apiFetch(`/api/buckets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData)
      });
      if (!res.ok) throw new Error('Gagal.');
      addToast('success', 'Alokasi Diubah', 'Spesifikasi alokasi disesuaikan.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleTransferFunds = async (amount: number, targetBucketId: string, description: string) => {
    if (accounts.length === 0) {
      alert('Sediakan minimal satu Rekening Bank terlebih dahulu!');
      return;
    }
    try {
      // Moves money into bucket
      await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type: 'income',
          amount,
          description: `[Saku Alokasi] ${description}`,
          date: new Date().toISOString().substring(0, 10),
          accountId: accounts[0].id,
          bucketId: targetBucketId,
          category: '📂 Alokasi Kantong Saku'
        })
      });
      addToast('success', 'Dana Dialokasikan', 'Dana dipindahbukukan ke saku kantong.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleWithdrawFunds = async (amount: number, sourceBucketId: string, description: string) => {
    if (accounts.length === 0) {
      alert('Sediakan minimal satu Rekening Bank terlebih dahulu!');
      return;
    }
    try {
      // Takes money out from bucket
      await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type: 'expense',
          amount,
          description: `[Tarik Dana Saku] ${description}`,
          date: new Date().toISOString().substring(0, 10),
          accountId: accounts[0].id,
          bucketId: sourceBucketId,
          category: '📂 Penarikan Kantong Saku'
        })
      });
      addToast('warning', 'Dana Ditarik', 'Dana dipindahkan kembali ke Saku Utama.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSpendFromPocket = async (amount: number, bucketId: string, description: string, dateStr: string) => {
    if (accounts.length === 0) {
      alert('Sediakan minimal satu Rekening Bank terlebih dahulu!');
      return;
    }
    try {
      await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type: 'expense',
          amount,
          description,
          date: dateStr,
          accountId: accounts[0].id,
          bucketId,
          category: '🍟 Jajan Kantong Saku'
        })
      });
      addToast('success', 'Belanja Kantong', 'Ditransaksikan langsung memotong alokasi kantong.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleIncomeToPocket = async (amount: number, bucketId: string, description: string, dateStr: string) => {
    if (accounts.length === 0) {
      alert('Sediakan minimal satu Rekening Bank terlebih dahulu!');
      return;
    }
    try {
      await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type: 'income',
          amount,
          description,
          date: dateStr,
          accountId: accounts[0].id,
          bucketId,
          category: '💵 Subsidi Kantong Saku'
        })
      });
      addToast('success', 'Setoran Kantong', 'Tabungan saku bertambah.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAddGoal = async (goalPayload: any) => {
    try {
      const res = await apiFetch('/api/goals', {
        method: 'POST',
        body: JSON.stringify(goalPayload)
      });
      if (!res.ok) throw new Error('Gagal menambahkan target baru');
      addToast('success', 'Target Diatur', 'Sasaran tabungan keluarga aktif.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdateGoal = async (id: string, currentAmount: number) => {
    try {
      const targetGoal = goals.find(g => g.id === id);
      const res = await apiFetch(`/api/goals/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          name: targetGoal?.name,
          targetAmount: targetGoal?.targetAmount,
          currentAmount 
        })
      });
      if (!res.ok) throw new Error('Gagal mencatatkan akumulasi.');
      addToast('success', 'Target Ditambahkan', 'Laporan simpanan dikalibrasi.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      const res = await apiFetch(`/api/goals/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal.');
      addToast('warning', 'Target Diarsip', 'Data target dipindahkan ke tong sampah.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAddDebtItem = async (item: DebtItem) => {
    try {
      const res = await apiFetch('/api/debts', {
        method: 'POST',
        body: JSON.stringify({
          description: item.title,
          type: item.type,
          amount: item.totalAmount,
          dueDate: item.dueDate,
          notes: item.notes || '',
          monthlyPayment: item.monthlyPayment || 0
        })
      });
      if (!res.ok) throw new Error('Gagal mendaftarkan berkas cicilan');
      addToast('success', 'Item Cicilan Ditambahkan', 'Berkas hutang/piutang terdaftar.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdateDebtItem = async (id: string, updated: Partial<DebtItem>) => {
    try {
      // Gather existing values
      const existing = debts.find(d => d.id === id);
      if (!existing) return;
      const res = await apiFetch(`/api/debts/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          description: updated.title || existing.description,
          type: updated.type || existing.type,
          amount: updated.totalAmount || existing.amount,
          notes: updated.notes || existing.notes || '',
          monthlyPayment: updated.monthlyPayment || existing.monthlyPayment || 0,
          status: updated.status || existing.status,
          dueDate: updated.dueDate || existing.dueDate
        })
      });
      if (!res.ok) throw new Error('Gagal mengganti berkas.');
      addToast('success', 'Berkas Disinkronkan', 'Kalibrasi detail simpan hutang dilakukan.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteDebtItem = async (id: string) => {
    try {
      const res = await apiFetch(`/api/debts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal.');
      addToast('warning', 'Berkas Diarsipkan', 'Pemetaan dipulihkan ke Tempat Sampah.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Trash operations callbacks
  const handleRestoreTrash = async (type: string, id: string) => {
    try {
      const res = await apiFetch('/api/trash/restore', {
        method: 'POST',
        body: JSON.stringify({ type, id })
      });
      if (!res.ok) throw new Error('Gagal memulihkan.');
      addToast('success', 'Item Dipulihkan', 'Catatan keuangan aktif kembali.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleBulkRestore = async (items: { type: string; id: string }[]) => {
    try {
      const res = await apiFetch('/api/trash/bulk-restore', {
        method: 'POST',
        body: JSON.stringify({ items })
      });
      if (!res.ok) throw new Error('Gagal memulihkan massal.');
      addToast('success', 'Pemulihan Massal', `${items.length} item berhasil dikembalikan.`);
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleBulkDelete = async (items: { type: string; id: string }[]) => {
    try {
      const res = await apiFetch('/api/trash/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ items })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus.');
      }
      addToast('warning', 'Dihapus Permanen', 'Data yang dipilih dibersihkan dari database.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handlePurgeTrash = async () => {
    try {
      const res = await apiFetch('/api/trash/purge', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengosongkan.');
      }
      addToast('warning', 'Tempat Sampah Dibersihkan', 'Semua isi saku dibakar permanen.');
      fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Auth gate check
  if (!token) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      isDarkMode={isDarkMode}
      onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      onOpenTxModal={() => setIsTxModalOpen(true)}
      currentUser={currentUser}
      currentFamily={currentFamily}
      onLogout={handleLogout}
      customMonths={customMonths}
      selectedMonth={selectedMonth}
      onMonthChange={setSelectedMonth}
      onAddMonth={(m) => {
        if (!customMonths.includes(m)) {
          setCustomMonths([m, ...customMonths].sort().reverse());
        }
        setSelectedMonth(m);
        addToast('success', 'Buku Periode Baru', `Membuka buku register untuk periode ${m}`);
      }}
    >
      {/* 1. FLOATING TOASTS NOTIFICATIONS DRAWER */}
      <div id="toast-drawer-root" className="fixed top-5 right-5 z-55 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          let themeColor = 'bg-slate-900 border border-slate-800 text-white dark:bg-slate-900 dark:border-slate-800';
          let Icon = Info;
          if (t.type === 'success') {
            themeColor = 'bg-emerald-600 dark:bg-emerald-500 text-white';
            Icon = CheckCircle2;
          } else if (t.type === 'warning') {
            themeColor = 'bg-amber-500 text-white';
            Icon = AlertTriangle;
          } else if (t.type === 'error') {
            themeColor = 'bg-red-650 text-white';
            Icon = AlertTriangle;
          }

          return (
            <div 
              key={t.id} 
              className={`p-4 rounded-2xl text-white shadow-xl flex items-start gap-4 transform translate-x-0 transition-transform duration-300 pointer-events-auto shrink-0 ${themeColor}`}
            >
              <Icon className="w-5 h-5 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">{t.title}</h4>
                <p className="text-[11px] font-semibold mt-1 opacity-90 leading-relaxed">{t.message}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. REALTIME NETWORK STATUS ALARM */}
      {!isConnected && (
        <div id="real-time-disconnection-alert-box" className="p-3 bg-red-100 border border-red-200 dark:bg-red-955/40 text-red-700 dark:text-red-400 text-xs font-bold rounded-2xl flex items-center gap-3 mb-5 shadow-3xs animate-pulse">
          <WifiOff className="w-5 h-5 shrink-0" />
          <span>Realtime SakuKeluarga WS disconnected. Reconnecting dynamically...</span>
        </div>
      )}

      {/* 3. CORE ROUTING CHANNELS */}
      {activeTab === 'dashboard' && (
        <Dashboard
          summary={summary}
          recentTransactions={filteredTransactions}
          onlineMembers={onlineMembers}
          liveActivities={liveActivities}
          dailyThreshold={500000}
          todayExpense={todayExpense}
          syncCode={currentFamily?.code}
          syncUserId={currentUser?.email}
          onOpenTxModal={() => setIsTxModalOpen(true)}
          onDeleteTx={handleDeleteTransaction}
          buckets={buckets}
          accounts={accounts}
          selectedMonth={selectedMonth}
          goals={goals}
          currentUser={currentUser}
        />
      )}

      {activeTab === 'transactions' && (
        <TransactionsPage
          transactions={filteredTransactions}
          accounts={accounts}
          buckets={buckets}
          onDeleteTransaction={handleDeleteTransaction}
          summary={summary}
        />
      )}

      {activeTab === 'buckets' && (
        <AllocationBuckets
          buckets={buckets}
          unallocatedBalance={summary.unallocatedBalance}
          bucketBalances={bucketBalances}
          onAddBucket={handleAddBucket}
          onDeleteBucket={handleDeleteBucket}
          onUpdateBucket={handleUpdateBucket}
          onTransferFunds={handleTransferFunds}
          onWithdrawFunds={handleWithdrawFunds}
          onSpendFromPocket={handleSpendFromPocket}
          onIncomeToPocket={handleIncomeToPocket}
        />
      )}

      {activeTab === 'debts' && (
        <DebtInstallmentTracker
          items={debts as any}
          onAddItem={handleAddDebtItem}
          onUpdateItem={handleUpdateDebtItem}
          onDeleteItem={handleDeleteDebtItem}
        />
      )}

      {activeTab === 'accounts' && (
        <AccountsManager
          accounts={accounts}
          accountBalances={accountBalances}
          onAddAccount={handleAddAccount}
          onDeleteAccount={handleDeleteAccount}
          onUpdateAccount={handleUpdateAccount}
          onAddTransfer={handleAddAccountTransfer}
        />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsCharts
          transactions={filteredTransactions}
          buckets={buckets}
          selectedMonth={selectedMonth}
        />
      )}

      {activeTab === 'trash' && (
        <TrashBin
          trashItems={trashItems}
          onRestore={handleRestoreTrash}
          onBulkRestore={handleBulkRestore}
          onBulkDelete={handleBulkDelete}
          onPurgeAll={handlePurgeTrash}
          userRole={currentUser?.role || 'MEMBER'}
        />
      )}

      {activeTab === 'audit' && (
        <AuditLogViewer
          logs={auditLogs}
        />
      )}

      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl space-y-6 max-w-xl mx-auto shadow-3xs text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Sinkronisasi Awan Berjalan
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Akun Anda terhubung secara multipemain dengan <strong>{currentFamily?.name}</strong>. Setiap perubahan data yang dilakukan Anda atau anggota keluarga lain akan langsung disebarkan tanpa harus reload halaman.
          </p>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-left space-y-2">
            <span className="block text-[9px] font-black uppercase text-slate-400">Rincian Koneksi</span>
            <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Email: {currentUser?.email}</span>
            <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Role Peran: {currentUser?.role}</span>
            <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">PIN Join Kode: {currentFamily?.code}</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-5 py-3 border border-red-200 hover:bg-red-50 text-red-655 font-bold hover:text-red-700 text-xs uppercase tracking-wider rounded-2xl cursor-pointer transition-colors"
          >
            Keluar Sesi Keluarga
          </button>
        </div>
      )}

      {/* 4. TRANSACTION MUTATION MODAL DIALOG POPUP */}
      {isTxModalOpen && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider">
                Catat Aliran Kas Baru
              </h3>
              <button 
                onClick={() => setIsTxModalOpen(false)}
                className="text-slate-450 hover:text-slate-600 dark:hover:text-white font-extrabold text-sm"
              >
                ✕
              </button>
            </div>
            
            <TransactionForm
              accounts={accounts}
              buckets={buckets}
              selectedMonth={selectedMonth}
              onAddTransaction={handleAddTransaction}
            />
          </div>
        </div>
      )}

    </Layout>
  );
}
