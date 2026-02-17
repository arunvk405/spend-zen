import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Transaction, Account, ACCOUNTS } from '../models';
import { initDatabase, getTransactions, addTransaction as addTxDb, getTotalBalance, getMonthlySummary, deleteTransaction as deleteTxDb } from '../database/db';
import { format } from 'date-fns';

interface FinanceContextType {
    transactions: Transaction[];
    accounts: Account[];
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    loading: boolean;
    addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
    deleteTransaction: (id: number) => Promise<void>;
    refreshData: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [dbReady, setDbReady] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>(ACCOUNTS);
    const [totalBalance, setTotalBalance] = useState(0);
    const [monthlyIncome, setMonthlyIncome] = useState(0);
    const [monthlyExpenses, setMonthlyExpenses] = useState(0);
    const [loading, setLoading] = useState(true);

    const refreshData = useCallback(async () => {
        if (!dbReady) return;

        setLoading(true);
        try {
            const txs = await getTransactions(null);
            const balance = await getTotalBalance(null);
            const currentMonth = format(new Date(), 'yyyy-MM');
            const summary = await getMonthlySummary(null, currentMonth);

            setTransactions(txs);
            setTotalBalance(balance);
            setMonthlyIncome(summary.income);
            setMonthlyExpenses(summary.expense);

            // Update individual account balances locally from the fetched transactions
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
    }, [dbReady]);

    useEffect(() => {
        initDatabase().then(() => {
            setDbReady(true);
        });
    }, []);

    useEffect(() => {
        if (dbReady) {
            refreshData();
        }
    }, [dbReady, refreshData]);

    const addTransaction = async (tx: Omit<Transaction, 'id'>) => {
        if (!dbReady) return;
        await addTxDb(null, tx);
        await refreshData();
    };

    const deleteTransaction = async (id: number) => {
        if (!dbReady) return;
        await deleteTxDb(null, id);
        await refreshData();
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
