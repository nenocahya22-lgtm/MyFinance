/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Account {
  id: string; // e.g. "acc-bca", "acc-cash"
  name: string; // e.g. "Bank BCA", "Kas / Cash"
  balanceType: 'bank' | 'cash' | 'e-wallet' | 'other';
  color: string; // e.g. "blue", "emerald", "amber", "purple", "cyan", "indigo", "rose"
  accountNumber?: string; // e.g. "123-456-7890" (optional)
  initialBalance: number; // e.g. initial bank balance before logging
}

export interface AllocationBucket {
  id: string;
  name: string;
  targetAmount: number; // 0 means no target
  color: string; // color tag like "indigo", "emerald", "rose", "cyan", "amber", "purple"
  icon: string; // icon name from lucide
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  bucketId: string; // "umum" (default) or reference to AllocationBucket.id
  accountId?: string; // Source / Active Account (linked to Account.id)
  toAccountId?: string; // Receiving Account for 'transfer' transaction (linked to Account.id)
  createdAt: string;
  category?: string; // e.g. "Makanan & Minuman", "Transportasi", etc.
  createdBy?: string; // username/id of the person who created this transaction
  createdByName?: string; // display name of the person
}

export interface FinanceSummaryData {
  totalIncome: number;
  totalExpense: number;
  remainingBalance: number;
  allocatedBalance: number;
  unallocatedBalance: number;
}

