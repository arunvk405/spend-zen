export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
    id: string | number;
    amount: number;
    type: TransactionType;
    category: string;
    date: string; // ISO format
    accountId: string;
    note?: string;
}

export interface ProjectedExpense {
    id: string;
    userId: string;
    amount: number;
    description: string;
    createdAt: string;
}

export interface Account {
    id: string; // 'cash' | 'bank' | 'credit'
    name: string;
    balance: number;
    icon: string;
    color: string;
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
    { name: 'Investment/SIP', icon: 'trending-up', color: '#4CAF50', type: 'EXPENSE' },
    { name: 'Debt', icon: 'credit-card', color: '#000000', type: 'EXPENSE' },
    { name: 'Others', icon: 'package', color: '#9E9E9E', type: 'EXPENSE' },
];

export const ACCOUNTS: Account[] = [
    { id: 'cash', name: 'Cash in Hand', balance: 0, icon: 'wallet', color: '#4CAF50' },
    { id: 'bank', name: 'Bank Account', balance: 0, icon: 'landmark', color: '#2196F3' },
    { id: 'credit', name: 'Credit Card', balance: 0, icon: 'credit-card', color: '#F44336' },
];
