/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MEMBER';
  familyId: string;
}

export interface Family {
  id: string;
  name: string;
  code: string;
}

export interface Account {
  id: string;
  name: string;
  balanceType: 'bank' | 'cash' | 'e-wallet' | 'other';
  color: string;
  accountNumber?: string;
  initialBalance: number;
  balance?: number; // calculated balance returned by the API
}

export interface AllocationBucket {
  id: string;
  name: string;
  category: string;
  targetAmount: number;
  balance?: number; // calculated balance returned by the API
  color: string;
  icon: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  bucketId?: string;
  accountId?: string;
  toAccountId?: string;
  createdAt: string;
  category?: string;
  creatorId?: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  account?: { id: string; name: string; };
  bucket?: { id: string; name: string; };
}

export interface FinanceSummaryData {
  totalIncome: number;
  totalExpense: number;
  remainingBalance: number;
  allocatedBalance: number;
  unallocatedBalance: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  is_deleted?: boolean;
}

export interface Debt {
  id: string;
  title: string;
  type: 'debt' | 'receivable';
  amount: number;
  lender: string;
  dueDate?: string;
  installments: Installment[];
  is_deleted?: boolean;
  createdAt?: string;
}

export interface Installment {
  id: string;
  debtId: string;
  amount: number;
  paymentDate: string;
  notes?: string;
  is_deleted?: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert';
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  tableName: string;
  recordId: string;
  userId: string;
  description: string;
  timestamp: string;
}

export interface TrashItem {
  id: string;
  type: string; // 'transaction' | 'account' | 'bucket' | 'goal' | 'debt' | 'installment'
  name: string;
  details: string;
  deletedAt?: string;
}

export interface PresenceUser {
  socketId: string;
  userId: string;
  role: 'OWNER' | 'MEMBER';
  name: string;
}
