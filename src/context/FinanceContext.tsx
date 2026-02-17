import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Transaction, Account, ACCOUNTS } from '../models';
import {
    initDatabase,
    getTransactions,
    addTransaction as addTxDb,
    deleteTransaction as deleteTxDb,
    deleteTransactionsByRange
} from '../database/db';
import { format, isSameMonth, parseISO } from 'date-fns';

import { useAuth } from './AuthContext';

interface FinanceContextType {
    transactions: Transaction[];
    accounts: Account[];
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    loading: boolean;
    addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    clearData: (range: 'all' | 'year' | 'month') => Promise<number>;
    refreshData: () => Promise<void>;
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
    const [loading, setLoading] = useState(false);

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

            const updatedAccounts = ACCOUNTS.map(acc => {
                const accBalance = txs
                    .filter((t: Transaction) => t.accountId === acc.id)
                    .reduce((sum: number, t: Transaction) => t.type === 'INCOME' ? sum + t.amount : sum - t.amount, 0);
                return { ...acc, balance: accBalance };
            });
            setAccounts(updatedAccounts);
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
            setAccounts(ACCOUNTS);
        }
    }, [dbReady, user, refreshData]);

    const addTransaction = async (tx: Omit<Transaction, 'id'>) => {
        if (!dbReady || !user) return;
        await addTxDb(user.uid, tx);
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

    return (
        <FinanceContext.Provider value={{
            transactions,
            accounts,
            totalBalance,
            monthlyIncome,
            monthlyExpenses,
            loading,
            addTransaction,
            deleteTransaction,
            clearData,
            refreshData
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
