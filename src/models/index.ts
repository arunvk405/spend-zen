export type TransactionType = 'INCOME' | 'EXPENSE';
export type HistoryRetentionType = '3months' | '6months' | 'all';

export interface RecurringBill {
    id: string;
    name: string;
    amount: number;
    category: string;
    dueDate: number; // day of month (1-31)
    accountId: string; // 'cash' or bank/card id
    period: 'monthly' | 'yearly';
    lastPaidMonth?: string; // e.g. "2026-07"
}

export interface SavingsGoal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    color: string;
    createdAt: string;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    cashAccountName?: string;
    historyRetention?: HistoryRetentionType;
    monthlySalary?: number;
    customCategories?: any[];
    categoryBudgets?: Record<string, number>;
    recurringBills?: RecurringBill[];
    savingsGoals?: SavingsGoal[];
}


export interface Transaction {
    id: string | number;
    amount: number;
    type: TransactionType;
    category: string;
    date: string; // ISO format
    accountId: string; // 'cash', bank account Firestore ID, or credit card Firestore ID
    note?: string;
}

export interface ProjectedExpense {
    id: string;
    userId: string;
    amount: number;
    description: string;
    createdAt: string;
}

// Legacy single Account (kept for cash only)
export interface Account {
    id: string;
    name: string;
    balance: number;
    icon: string;
    color: string;
}

// Multiple Bank Accounts
export interface BankAccount {
    id: string;
    userId: string;
    bankName: string;
    accountType: 'Savings' | 'Current' | 'Salary' | 'Other';
    initialBalance: number; // User-set opening balance
    color: string;
    createdAt: string;
}

export interface BankAccountWithBalance extends BankAccount {
    computedBalance: number; // initialBalance + income txns - expense txns
}

// Multiple Credit Cards
export interface CreditCard {
    id: string;
    userId: string;
    cardName: string;
    creditLimit: number;
    dueDay: number; // Day of the month (1-31)
    color: string;
    createdAt: string;
    updatedAt?: string;
    usagePeriod?: string;
}

export interface CreditCardWithBalance extends CreditCard {
    usedAmount: number;     // expense txns - payment txns (income txns on this card)
    dueAmount: number;      // = usedAmount (outstanding)
    availableBalance: number; // creditLimit - usedAmount
}

export type Category = {
    name: string;
    icon: string;
    color: string;
    type: TransactionType;
};

export const INCOME_CATEGORIES: Category[] = [
    { name: 'Salary', icon: 'briefcase', color: '#4CAF50', type: 'INCOME' },
    { name: 'Savings', icon: 'piggy-bank', color: '#2196F3', type: 'INCOME' },
    { name: 'Gifts', icon: 'gift', color: '#9C27B0', type: 'INCOME' },
    { name: 'Dividends', icon: 'trending-up', color: '#FF9800', type: 'INCOME' },
    { name: 'Freelance', icon: 'laptop', color: '#607D8B', type: 'INCOME' },
    { name: 'Others', icon: 'package', color: '#9E9E9E', type: 'INCOME' },
];

export const EXPENSE_CATEGORIES: Category[] = [
    { name: 'Food', icon: 'utensils', color: '#F44336', type: 'EXPENSE' },
    { name: 'Gifts', icon: 'gift', color: '#FF9800', type: 'EXPENSE' },
    { name: 'Health/medical', icon: 'cross', color: '#E91E63', type: 'EXPENSE' },
    { name: 'Home', icon: 'home', color: '#795548', type: 'EXPENSE' },
    { name: 'Transportation', icon: 'car', color: '#2196F3', type: 'EXPENSE' },
    { name: 'Personal', icon: 'user', color: '#9C27B0', type: 'EXPENSE' },
    { name: 'Pets', icon: 'paw-print', color: '#607D8B', type: 'EXPENSE' },
    { name: 'Utilities', icon: 'file-text', color: '#FF5722', type: 'EXPENSE' },
    { name: 'Entertainment', icon: 'film', color: '#673AB7', type: 'EXPENSE' },
    { name: 'Investment/SIP', icon: 'trending-up', color: '#4CAF50', type: 'EXPENSE' },
    { name: 'Debt', icon: 'credit-card', color: '#000000', type: 'EXPENSE' },
    { name: 'Others', icon: 'package', color: '#9E9E9E', type: 'EXPENSE' },
];

export const ACCOUNT_COLORS = [
    '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#F44336',
    '#00BCD4', '#FF5722', '#607D8B', '#E91E63', '#3F51B5',
    '#009688', '#8BC34A',
];

// Legacy static accounts (kept for backward compatibility in add.tsx only)
export const ACCOUNTS: Account[] = [
    { id: 'cash', name: 'Cash in Hand', balance: 0, icon: 'wallet', color: '#4CAF50' },
    { id: 'bank', name: 'Bank Account', balance: 0, icon: 'landmark', color: '#2196F3' },
    { id: 'credit', name: 'Credit Card', balance: 0, icon: 'credit-card', color: '#F44336' },
];
