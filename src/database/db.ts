import { Transaction } from '../models';

// Using localStorage as the primary storage
const STORAGE_KEY = 'fintrack_transactions_db';

const getStoredTransactions = (): Transaction[] => {
    if (typeof window === 'undefined') return [];
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error reading transactions:', e);
        return [];
    }
};

const saveTransactions = (transactions: Transaction[]) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (e) {
        console.error('Error saving transactions:', e);
    }
};

export async function initDatabase() {
    console.log("Initializing Local Storage Database...");
    return true;
}

export async function addTransaction(db: any, tx: Omit<Transaction, 'id'>): Promise<number> {
    const transactions = getStoredTransactions();
    const newTransaction: Transaction = {
        ...tx,
        id: Date.now()
    };

    transactions.push(newTransaction);
    saveTransactions(transactions);

    return newTransaction.id;
}

export async function getTransactions(db: any): Promise<Transaction[]> {
    const transactions = getStoredTransactions();
    return transactions.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getTotalBalance(db: any): Promise<number> {
    const transactions = await getTransactions(null);
    return transactions.reduce((acc, curr) => {
        return curr.type === 'INCOME' ? acc + curr.amount : acc - curr.amount;
    }, 0);
}

export async function getMonthlySummary(db: any, yearMonth: string) {
    const transactions = await getTransactions(null);
    const monthly = transactions.filter(t => t.date.startsWith(yearMonth));

    const income = monthly
        .filter(t => t.type === 'INCOME')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const expense = monthly
        .filter(t => t.type === 'EXPENSE')
        .reduce((acc, curr) => acc + curr.amount, 0);

    return { income, expense };
}

export async function deleteTransaction(db: any, transactionId: number): Promise<void> {
    const transactions = getStoredTransactions();
    const updated = transactions.filter(t => t.id !== transactionId);
    saveTransactions(updated);
}

export async function deleteTransactionsByRange(type: 'all' | 'year' | 'month'): Promise<void> {
    const transactions = getStoredTransactions();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const yearMonth = `${currentYear}-${currentMonth}`;

    let updated: Transaction[] = [];

    if (type === 'all') {
        updated = [];
    } else if (type === 'year') {
        updated = transactions.filter(t => !t.date.startsWith(`${currentYear}`));
    } else if (type === 'month') {
        updated = transactions.filter(t => !t.date.startsWith(yearMonth));
    }

    saveTransactions(updated);
}
