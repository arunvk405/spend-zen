import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Transaction, Account, ACCOUNTS, ProjectedExpense } from '../models';
import {
    initDatabase,
    getTransactions,
    addTransaction as addTxDb,
    updateTransaction as updateTxDb,
    deleteTransaction as deleteTxDb,
    deleteTransactionsByRange,
    getProjectedExpenses,
    addProjectedExpense,
    deleteProjectedExpense,
    deleteAllProjectedExpenses,
    updateCustomCategories,
    getUserProfile
} from '../database/db';
import { format, isSameMonth, parseISO } from 'date-fns';

import { useAuth } from './AuthContext';

interface FinanceContextType {
    transactions: Transaction[];
    accounts: Account[];
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    projectedExpenses: number;
    projectedNotes: ProjectedExpense[];
    totalProjectedAmount: number;
    loading: boolean;
    addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
    updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    clearData: (range: 'all' | 'year' | 'month') => Promise<number>;
    refreshData: () => Promise<void>;
    addProjectedNote: (amount: number, description: string) => Promise<void>;
    deleteProjectedNote: (id: string) => Promise<void>;
    clearAllProjectedNotes: () => Promise<void>;
    customCategories: any[];
    addCustomCategory: (name: string, type: 'INCOME' | 'EXPENSE') => Promise<void>;
    deleteCustomCategory: (name: string, type: 'INCOME' | 'EXPENSE') => Promise<void>;
    updateCustomCategory: (oldName: string, newName: string, type: 'INCOME' | 'EXPENSE') => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [dbReady, setDbReady] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>(ACCOUNTS);
    const [totalBalance, setTotalBalance] = useState(0);
    const [monthlyIncome, setMonthlyIncome] = useState(0);
    const [monthlyExpenses, setMonthlyExpenses] = useState(0);
    const [projectedExpenses, setProjectedExpenses] = useState(0);
    const [projectedNotes, setProjectedNotes] = useState<ProjectedExpense[]>([]);
    const [totalProjectedAmount, setTotalProjectedAmount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [customCategories, setCustomCategories] = useState<any[]>([]);

    const refreshData = useCallback(async () => {
        if (!dbReady || !user) return;

        setLoading(true);
        try {
            // Fetch ALL transactions once - minimize API calls
            const txs = await getTransactions(user.uid);

            // Calculate everything locally to avoid extra latency
            let balance = 0;
            let income = 0;
            let expense = 0;
            const now = new Date();

            txs.forEach(t => {
                const amount = Number(t.amount);
                if (t.type === 'INCOME') {
                    balance += amount;
                } else {
                    balance -= amount;
                }

                // Current month calculations
                if (isSameMonth(parseISO(t.date), now)) {
                    if (t.type === 'INCOME') {
                        income += amount;
                    } else {
                        expense += amount;
                    }
                }
            });

            setTransactions(txs);
            setTotalBalance(balance);
            setMonthlyIncome(income);
            setMonthlyExpenses(expense);

            // Remove automatic projection as per user request
            setProjectedExpenses(0);

            // Fetch Projected Notes
            const notes = await getProjectedExpenses(user.uid);
            setProjectedNotes(notes);

            const notesTotal = notes.reduce((sum, n) => sum + Number(n.amount), 0);
            setTotalProjectedAmount(notesTotal);

            const updatedAccounts = ACCOUNTS.map(acc => {
                const accBalance = txs
                    .filter((t: Transaction) => t.accountId === acc.id)
                    .reduce((sum: number, t: Transaction) => t.type === 'INCOME' ? sum + t.amount : sum - t.amount, 0);
                return { ...acc, balance: accBalance };
            });
            setAccounts(updatedAccounts);

            // Fetch Custom Categories
            const profile = await getUserProfile(user.uid);
            if (profile && profile.customCategories) {
                // Ensure all custom categories have the isCustom flag
                setCustomCategories(profile.customCategories.map((c: any) => ({
                    ...c,
                    isCustom: true
                })));
            } else {
                setCustomCategories([]);
            }
        } catch (err) {
            console.error("Error refreshing data:", err);
        } finally {
            setLoading(false);
        }
    }, [dbReady, user]);

    useEffect(() => {
        initDatabase().then(() => {
            setDbReady(true);
        });
    }, []);

    useEffect(() => {
        if (dbReady && user) {
            refreshData();
        } else if (!user) {
            // Reset data if logged out
            setTransactions([]);
            setTotalBalance(0);
            setMonthlyIncome(0);
            setMonthlyExpenses(0);
            setProjectedExpenses(0);
            setProjectedNotes([]);
            setTotalProjectedAmount(0);
            setAccounts(ACCOUNTS);
        }
    }, [dbReady, user, refreshData]);

    const addTransaction = async (tx: Omit<Transaction, 'id'>) => {
        if (!dbReady || !user) return;
        await addTxDb(user.uid, tx);
        await refreshData();
    };

    const updateTransaction = async (id: string, tx: Partial<Transaction>) => {
        if (!dbReady || !user) return;
        await updateTxDb(id, tx);
        await refreshData();
    };

    const deleteTransaction = async (id: string) => {
        if (!dbReady || !user) return;
        await deleteTxDb(id);
        await refreshData();
    };

    const clearData = async (range: 'all' | 'year' | 'month'): Promise<number> => {
        if (!dbReady || !user) return 0;
        const count = await deleteTransactionsByRange(user.uid, range);
        await refreshData();
        return count;
    };

    const addProjectedNote = async (amount: number, description: string) => {
        if (!dbReady || !user) return;
        await addProjectedExpense(user.uid, amount, description);
        await refreshData();
    };

    const deleteProjectedNote = async (id: string) => {
        if (!dbReady || !user) return;
        await deleteProjectedExpense(id);
        await refreshData();
    };
    const clearAllProjectedNotes = async () => {
        if (!dbReady || !user) return;
        await deleteAllProjectedExpenses(user.uid);
        await refreshData();
    };

    const addCustomCategory = async (name: string, type: 'INCOME' | 'EXPENSE') => {
        if (!dbReady || !user) return;
        const newCategory = {
            name,
            icon: 'package', // Default icon for custom
            color: type === 'INCOME' ? '#4CAF50' : '#FF5252',
            type,
            isCustom: true
        };
        const updated = [...customCategories, newCategory];
        await updateCustomCategories(user.uid, updated);
        setCustomCategories(updated);
    };

    const deleteCustomCategory = async (name: string, type: 'INCOME' | 'EXPENSE') => {
        if (!dbReady || !user) return;
        const updated = customCategories.filter(c => !(c.name === name && c.type === type));
        await updateCustomCategories(user.uid, updated);
        setCustomCategories(updated);
    };

    const updateCustomCategory = async (oldName: string, newName: string, type: 'INCOME' | 'EXPENSE') => {
        if (!dbReady || !user) return;
        const updated = customCategories.map(c =>
            (c.name === oldName && c.type === type) ? { ...c, name: newName } : c
        );
        await updateCustomCategories(user.uid, updated);
        setCustomCategories(updated);
    };

    return (
        <FinanceContext.Provider value={{
            transactions,
            accounts,
            totalBalance,
            monthlyIncome,
            monthlyExpenses,
            projectedExpenses,
            projectedNotes,
            totalProjectedAmount,
            loading,
            addTransaction,
            updateTransaction,
            deleteTransaction,
            clearData,
            refreshData,
            addProjectedNote,
            deleteProjectedNote,
            clearAllProjectedNotes,
            customCategories,
            addCustomCategory,
            deleteCustomCategory,
            updateCustomCategory
        }}>
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (!context) {
        throw new Error('useFinance must be used within a FinanceProvider');
    }
    return context;
};
