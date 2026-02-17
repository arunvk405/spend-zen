export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
    id: number;
    amount: number;
    type: TransactionType;
    category: string;
    date: string; // ISO format
    accountId: string;
    note?: string;
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
];

export const EXPENSE_CATEGORIES: Category[] = [
    { name: 'Food', icon: 'utensils', color: '#F44336', type: 'EXPENSE' },
    { name: 'Transport', icon: 'car', color: '#FFEB3B', type: 'EXPENSE' },
    { name: 'Rent', icon: 'home', color: '#795548', type: 'EXPENSE' },
    { name: 'Shopping', icon: 'shopping-cart', color: '#E91E63', type: 'EXPENSE' },
    { name: 'Entertainment', icon: 'film', color: '#673AB7', type: 'EXPENSE' },
    { name: 'Bills', icon: 'file-text', color: '#FF5722', type: 'EXPENSE' },
];

export const ACCOUNTS: Account[] = [
    { id: 'cash', name: 'Cash in Hand', balance: 0, icon: 'wallet', color: '#4CAF50' },
    { id: 'bank', name: 'Bank Account', balance: 0, icon: 'landmark', color: '#2196F3' },
    { id: 'credit', name: 'Credit Card', balance: 0, icon: 'credit-card', color: '#F44336' },
];
