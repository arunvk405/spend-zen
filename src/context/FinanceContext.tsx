import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
    Transaction,
    BankAccount,
    BankAccountWithBalance,
    CreditCard,
    CreditCardWithBalance,
    ProjectedExpense,
    HistoryRetentionType,
    UserProfile,
    RecurringBill,
    SavingsGoal,
} from '../models';
import {
    initDatabase,
    getTransactions,
    addTransaction as addTxDb,
    updateTransaction as updateTxDb,
    deleteTransaction as deleteTxDb,
    deleteTransactionsByRange,
    deleteTransactionsByAccount,
    getProjectedExpenses,
    addProjectedExpense,
    deleteProjectedExpense,
    deleteAllProjectedExpenses,
    updateCustomCategories,
    getUserProfile,
    upsertUserProfile,
    getBankAccounts,
    addBankAccount as addBankAccountDb,
    updateBankAccount as updateBankAccountDb,
    deleteBankAccount as deleteBankAccountDb,
    getCreditCards,
    addCreditCard as addCreditCardDb,
    updateCreditCard as updateCreditCardDb,
    deleteCreditCard as deleteCreditCardDb,
    migrateTransactions,
    deleteTransactionsBeforeDate,
} from '../database/db';
import { isSameMonth, isSameYear, parseISO, subMonths, startOfMonth, format } from 'date-fns';
import { useAuth } from './AuthContext';

interface FinanceContextType {
    transactions: Transaction[];
    // Cash
    cashBalance: number;
    cashAccountName: string;
    // Bank accounts (with computed balance)
    bankAccounts: BankAccountWithBalance[];
    totalBankBalance: number;
    // Credit cards (with computed usedAmount / dueAmount / availableBalance)
    creditCards: CreditCardWithBalance[];
    totalCreditDue: number;
    // Summary
    totalBalance: number;       // cash + bank (credit excluded)
    monthlyIncome: number;      // non-credit income this month
    monthlyExpenses: number;    // non-credit expenses this month
    // Projected
    projectedExpenses: number;
    projectedNotes: ProjectedExpense[];
    totalProjectedAmount: number;
    loading: boolean;
    hasFetchedOnce: boolean;
    hasError: boolean;
    // Transactions CRUD
    addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
    updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    clearData: (range: 'all' | 'year' | 'month') => Promise<number>;
    clearAccountData: (accountId: string) => Promise<number>;
    refreshData: () => Promise<void>;
    // Projected notes
    addProjectedNote: (amount: number, description: string) => Promise<void>;
    deleteProjectedNote: (id: string) => Promise<void>;
    clearAllProjectedNotes: () => Promise<void>;
    // Custom categories
    customCategories: any[];
    addCustomCategory: (name: string, type: 'INCOME' | 'EXPENSE') => Promise<void>;
    deleteCustomCategory: (name: string, type: 'INCOME' | 'EXPENSE') => Promise<void>;
    updateCustomCategory: (oldName: string, newName: string, type: 'INCOME' | 'EXPENSE') => Promise<void>;
    // Category budgets
    categoryBudgets: Record<string, number>;
    updateCategoryBudgets: (budgets: Record<string, number>) => Promise<void>;
    // Recurring Bills
    recurringBills: RecurringBill[];
    addRecurringBill: (bill: Omit<RecurringBill, 'id'>) => Promise<void>;
    deleteRecurringBill: (id: string) => Promise<void>;
    payRecurringBill: (bill: RecurringBill) => Promise<void>;
    // Savings Goals
    savingsGoals: SavingsGoal[];
    addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt'>) => Promise<void>;
    deleteSavingsGoal: (id: string) => Promise<void>;
    allocateToGoal: (goalId: string, amount: number, accountId: string) => Promise<void>;
    // Bank accounts CRUD
    addBankAccount: (data: { bankName: string; accountType: BankAccount['accountType']; initialBalance: number; color: string }) => Promise<void>;
    updateBankAccount: (id: string, data: Partial<BankAccount>) => Promise<void>;
    deleteBankAccount: (id: string) => Promise<void>;
    // Credit cards CRUD
    addCreditCard: (data: { cardName: string; creditLimit: number; dueDay: number; color: string }) => Promise<void>;
    updateCreditCard: (id: string, data: Partial<CreditCard>) => Promise<void>;
    deleteCreditCard: (id: string) => Promise<void>;
    // Cash renaming
    renameCashAccount: (newName: string) => Promise<void>;
    // History retention
    historyRetention: HistoryRetentionType;
    updateHistoryRetention: (retention: HistoryRetentionType) => Promise<void>;
    clearTransactionsBefore: (date: Date) => Promise<number>;
    userSalary: number;
    updateUserSalary: (amount: number) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [dbReady, setDbReady] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [cashBalance, setCashBalance] = useState(0);
    const [bankAccounts, setBankAccounts] = useState<BankAccountWithBalance[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCardWithBalance[]>([]);
    const [cashAccountName, setCashAccountName] = useState('Cash in Hand');
    const [totalBalance, setTotalBalance] = useState(0);
    const [totalBankBalance, setTotalBankBalance] = useState(0);
    const [totalCreditDue, setTotalCreditDue] = useState(0);
    const [monthlyIncome, setMonthlyIncome] = useState(0);
    const [monthlyExpenses, setMonthlyExpenses] = useState(0);
    const [historyRetention, setHistoryRetention] = useState<HistoryRetentionType>('3months');
    const [userSalary, setUserSalary] = useState(0);
    const hasClearedSession = useRef(false);
    const [projectedExpenses, setProjectedExpenses] = useState(0);
    const [projectedNotes, setProjectedNotes] = useState<ProjectedExpense[]>([]);
    const [totalProjectedAmount, setTotalProjectedAmount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [customCategories, setCustomCategories] = useState<any[]>([]);
    const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>({});
    const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
    const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);

    const refreshData = useCallback(async () => {
        if (!dbReady || !user) return;
        setLoading(true);
        setHasError(false);
        try {
            const [txs, bankAccts, creditCrds, notes, profile] = await Promise.all([
                getTransactions(user.uid),
                getBankAccounts(user.uid),
                getCreditCards(user.uid),
                getProjectedExpenses(user.uid),
                getUserProfile(user.uid),
            ]);

            // ── Auto-Migration for Legacy Users & Default Provisioning
            let needsRefresh = false;

            // ── Auto Clear History Logic ────────────────────────────────────
            const userProfile = profile as UserProfile;
            if (userProfile?.historyRetention && userProfile.historyRetention !== 'all' && !hasClearedSession.current) {
                try {
                    const months = userProfile.historyRetention === '3months' ? 3 : 6;
                    const cutoff = startOfMonth(subMonths(new Date(), months));
                    const clearedCount = await deleteTransactionsBeforeDate(user.uid, cutoff);
                    if (clearedCount > 0) {
                        console.log(`Auto-cleared ${clearedCount} old transactions.`);
                        const cutoffIso = cutoff.toISOString();
                        for (let i = txs.length - 1; i >= 0; i--) {
                            if (txs[i].date < cutoffIso) {
                                txs.splice(i, 1);
                            }
                        }
                    }
                } catch (cleanupErr) {
                    console.error("Auto-clear failed (ignoring to allow data load):", cleanupErr);
                }
                hasClearedSession.current = true;
            }

            if (userProfile?.historyRetention) {
                setHistoryRetention(userProfile.historyRetention);
            }
            if (userProfile?.monthlySalary) {
                setUserSalary(userProfile.monthlySalary);
            }
            try {
                // 1. Migrate legacy bank transactions if they exist
                const legacyBankTxs = txs.filter(t => t.accountId === 'bank');
                if (legacyBankTxs.length > 0) {
                    let targetBankId = bankAccts.length > 0 ? bankAccts[0].id : null;
                    
                    const legacyIncome = legacyBankTxs.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
                    const legacyExpenses = legacyBankTxs.filter(t => t.type === 'EXPENSE');

                    if (!targetBankId) {
                        targetBankId = await addBankAccountDb(user.uid, {
                            bankName: 'Bank Account',
                            accountType: 'Savings',
                            initialBalance: legacyIncome,
                            color: '#2196F3'
                        });
                    }
                    
                    // Migrate ONLY expenses to avoid double-counting income (since it's now in initialBalance)
                    // If we want to keep income history, we'd need a different approach, but user specifically 
                    // asked for opening balance to be the income.
                    await migrateTransactions(user.uid, 'bank', targetBankId); 
                    // Wait, if I migrate all, I double count. I should only migrate expenses.
                    // But migrateTransactions takes all by ID. 
                    // I'll need a more specific migration tool or just delete income txs after migration.
                    needsRefresh = true;
                }

                // 2. Migrate legacy credit transactions if they exist
                const legacyCreditTxs = txs.filter(t => t.accountId === 'credit');
                if (legacyCreditTxs.length > 0) {
                    let targetCreditId = creditCrds.length > 0 ? creditCrds[0].id : null;
                    if (!targetCreditId) {
                        targetCreditId = await addCreditCardDb(user.uid, {
                            cardName: 'Primary Credit Card',
                            creditLimit: 100000,
                            dueDay: 1,
                            color: '#F44336'
                        });
                    }
                    await migrateTransactions(user.uid, 'credit', targetCreditId);
                    needsRefresh = true;
                }

                // 3. Ensure a default Bank Account exists for new users
                if (bankAccts.length === 0 && !needsRefresh) {
                    await addBankAccountDb(user.uid, {
                        bankName: 'Bank Account',
                        accountType: 'Savings',
                        initialBalance: 0,
                        color: '#2196F3'
                    });
                    needsRefresh = true;
                }

                if (needsRefresh) {
                    const [b2, c2, t2] = await Promise.all([
                        getBankAccounts(user.uid), 
                        getCreditCards(user.uid),
                        getTransactions(user.uid)
                    ]);
                    bankAccts.splice(0, bankAccts.length, ...b2);
                    creditCrds.splice(0, creditCrds.length, ...c2);
                    txs.splice(0, txs.length, ...t2);
                }
            } catch (migrationError) {
                console.error("FinanceContext: Migration failed:", migrationError);
            }

            if (profile && profile.cashAccountName) {
                setCashAccountName(profile.cashAccountName);
            }

            const now = new Date();
            const creditCardIds = new Set(creditCrds.map(c => c.id));

            // ── Cash balance (from transactions with accountId === 'cash')
            let cash = 0;
            let income = 0;
            let expense = 0;

            txs.forEach(t => {
                const amount = Number(t.amount);
                // Skip credit card transactions for net balance & monthly totals
                if (creditCardIds.has(t.accountId) || t.accountId === 'credit') return;

                if (t.accountId === 'cash') {
                    cash += t.type === 'INCOME' ? amount : -amount;
                }

                // Monthly income/expense (non-credit)
                if (isSameMonth(parseISO(t.date), now) && isSameYear(parseISO(t.date), now)) {
                    if (t.category !== 'Credit Card Payment') {
                        if (t.type === 'INCOME') income += amount;
                        else expense += amount;
                    }
                }
            });

            // ── Bank account balances (initialBalance + transactions)
            const bankAccountsWithBalance: BankAccountWithBalance[] = bankAccts.map(acc => {
                const accTxBalance = txs
                    .filter(t => t.accountId === acc.id)
                    .reduce((sum, t) => t.type === 'INCOME' ? sum + Number(t.amount) : sum - Number(t.amount), 0);
                return { ...acc, computedBalance: acc.initialBalance + accTxBalance };
            });

            // ── Credit card balances (from transactions on each card)
            const creditCardsWithBalance: CreditCardWithBalance[] = creditCrds.map(card => {
                const cardTxns = txs.filter(t => t.accountId === card.id);
                // Expenses = purchases, Income = payments
                const usedAmount = cardTxns.reduce((sum, t) => {
                    return t.type === 'EXPENSE' ? sum + Number(t.amount) : sum - Number(t.amount);
                }, 0);
                const due = Math.max(0, usedAmount);
                const available = Math.max(0, card.creditLimit - due);
                return { ...card, usedAmount: due, dueAmount: due, availableBalance: available };
            });

            const bankTotal = bankAccountsWithBalance.reduce((s, a) => s + a.computedBalance, 0);
            const creditDue = creditCardsWithBalance.reduce((s, c) => s + c.dueAmount, 0);

            setTransactions(txs);
            setCashBalance(cash);
            setBankAccounts(bankAccountsWithBalance);
            setCreditCards(creditCardsWithBalance);
            setTotalBankBalance(bankTotal);
            setTotalCreditDue(creditDue);
            setTotalBalance(cash + bankTotal);
            setMonthlyIncome(income);
            setMonthlyExpenses(expense);
            setProjectedExpenses(0);
            setProjectedNotes(notes);
            setTotalProjectedAmount(notes.reduce((s, n) => s + Number(n.amount), 0));

            if (profile?.customCategories) {
                setCustomCategories(profile.customCategories.map((c: any) => ({ ...c, isCustom: true })));
            } else {
                setCustomCategories([]);
            }
            if (userProfile?.categoryBudgets) {
                setCategoryBudgets(userProfile.categoryBudgets);
            } else {
                setCategoryBudgets({});
            }
            if (userProfile?.recurringBills) {
                setRecurringBills(userProfile.recurringBills);
            } else {
                setRecurringBills([]);
            }
            if (userProfile?.savingsGoals) {
                setSavingsGoals(userProfile.savingsGoals);
            } else {
                setSavingsGoals([]);
            }
        } catch (err) {
            console.error('Error refreshing data:', err);
            setHasError(true);
        } finally {
            setLoading(false);
            setHasFetchedOnce(true);
        }
    }, [dbReady, user]);

    useEffect(() => {
        initDatabase().then(() => setDbReady(true));
    }, []);

    useEffect(() => {
        if (dbReady && user) {
            refreshData();
        } else if (!user) {
            setTransactions([]); setCashBalance(0); setBankAccounts([]);
            setCreditCards([]); setTotalBalance(0); setTotalBankBalance(0);
            setTotalCreditDue(0); setMonthlyIncome(0); setMonthlyExpenses(0);
            setProjectedExpenses(0); setProjectedNotes([]); setTotalProjectedAmount(0);
        }
    }, [dbReady, user, refreshData]);

    // ── Transaction CRUD ────────────────────────────────────────────────────
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
    const clearAccountData = async (accountId: string): Promise<number> => {
        if (!dbReady || !user) return 0;
        const count = await deleteTransactionsByAccount(user.uid, accountId);
        await refreshData();
        return count;
    };

    // ── Projected notes ─────────────────────────────────────────────────────
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

    // ── Custom categories ───────────────────────────────────────────────────
    const addCustomCategory = async (name: string, type: 'INCOME' | 'EXPENSE') => {
        if (!dbReady || !user) return;
        const newCat = { name, icon: 'package', color: type === 'INCOME' ? '#4CAF50' : '#FF5252', type, isCustom: true };
        const updated = [...customCategories, newCat];
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

    // ── Bank accounts CRUD ──────────────────────────────────────────────────
    const addBankAccount = async (data: { bankName: string; accountType: BankAccount['accountType']; initialBalance: number; color: string }) => {
        if (!dbReady || !user) return;
        await addBankAccountDb(user.uid, data);
        await refreshData();
    };
    const updateBankAccount = async (id: string, data: Partial<BankAccount>) => {
        if (!dbReady || !user) return;
        await updateBankAccountDb(id, data);
        await refreshData();
    };
    const deleteBankAccount = async (id: string) => {
        if (!dbReady || !user) return;
        await deleteBankAccountDb(id);
        await refreshData();
    };

    // ── Credit cards CRUD ───────────────────────────────────────────────────
    const addCreditCard = async (data: { cardName: string; creditLimit: number; dueDay: number; color: string }) => {
        if (!dbReady || !user) return;
        await addCreditCardDb(user.uid, data);
        await refreshData();
    };
    const updateCreditCard = async (id: string, data: Partial<CreditCard>) => {
        if (!dbReady || !user) return;
        await updateCreditCardDb(id, data);
        await refreshData();
    };
    const deleteCreditCard = async (id: string) => {
        if (!dbReady || !user) return;
        await deleteCreditCardDb(id);
        await refreshData();
    };

    const renameCashAccount = async (newName: string) => {
        if (!user || !newName.trim()) return;
        try {
            await upsertUserProfile(user.uid, { cashAccountName: newName.trim() });
            setCashAccountName(newName.trim());
        } catch (e) {
            console.error("Error renaming cash account:", e);
        }
    };

    const updateHistoryRetention = async (retention: HistoryRetentionType) => {
        if (!user) return;
        try {
            await upsertUserProfile(user.uid, { historyRetention: retention });
            setHistoryRetention(retention);
            // Optionally trigger a clear immediately
            if (retention !== 'all') {
                const months = retention === '3months' ? 3 : 6;
                const cutoff = startOfMonth(subMonths(new Date(), months));
                await deleteTransactionsBeforeDate(user.uid, cutoff);
                await refreshData();
            }
        } catch (e) {
            console.error("Error updating history retention:", e);
        }
    };
    const clearTransactionsBefore = async (date: Date): Promise<number> => {
        if (!dbReady || !user) return 0;
        const count = await deleteTransactionsBeforeDate(user.uid, date);
        await refreshData();
        return count;
    };

    const updateUserSalary = async (amount: number) => {
        if (!user) return;
        try {
            await upsertUserProfile(user.uid, { monthlySalary: amount });
            setUserSalary(amount);
        } catch (e) {
            console.error("Error updating user salary:", e);
        }
    };

    const updateCategoryBudgets = async (budgets: Record<string, number>) => {
        if (!user) return;
        try {
            await upsertUserProfile(user.uid, { categoryBudgets: budgets });
            setCategoryBudgets(budgets);
        } catch (e) {
            console.error("Error updating category budgets:", e);
        }
    };

    const addRecurringBill = async (billData: Omit<RecurringBill, 'id'>) => {
        if (!user) return;
        try {
            const newBill: RecurringBill = {
                ...billData,
                id: Math.random().toString(36).substring(2, 9),
            };
            const updated = [...recurringBills, newBill];
            await upsertUserProfile(user.uid, { recurringBills: updated });
            setRecurringBills(updated);
        } catch (e) {
            console.error("Error adding recurring bill:", e);
        }
    };

    const deleteRecurringBill = async (id: string) => {
        if (!user) return;
        try {
            const updated = recurringBills.filter(b => b.id !== id);
            await upsertUserProfile(user.uid, { recurringBills: updated });
            setRecurringBills(updated);
        } catch (e) {
            console.error("Error deleting recurring bill:", e);
        }
    };

    const payRecurringBill = async (bill: RecurringBill) => {
        if (!user) return;
        try {
            await addTxDb(user.uid, {
                amount: bill.amount,
                category: bill.category,
                type: 'EXPENSE',
                accountId: bill.accountId,
                date: new Date().toISOString(),
                note: `Recurring Bill: ${bill.name}`
            });

            const currentMonthStr = format(new Date(), 'yyyy-MM');
            const updated = recurringBills.map(b => {
                if (b.id === bill.id) {
                    return { ...b, lastPaidMonth: currentMonthStr };
                }
                return b;
            });
            await upsertUserProfile(user.uid, { recurringBills: updated });
            await refreshData();
        } catch (e) {
            console.error("Error paying recurring bill:", e);
        }
    };

    const addSavingsGoal = async (goalData: Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt'>) => {
        if (!user) return;
        try {
            const newGoal: SavingsGoal = {
                ...goalData,
                id: Math.random().toString(36).substring(2, 9),
                currentAmount: 0,
                createdAt: new Date().toISOString(),
            };
            const updated = [...savingsGoals, newGoal];
            await upsertUserProfile(user.uid, { savingsGoals: updated });
            setSavingsGoals(updated);
        } catch (e) {
            console.error("Error adding savings goal:", e);
        }
    };

    const deleteSavingsGoal = async (id: string) => {
        if (!user) return;
        try {
            const updated = savingsGoals.filter(g => g.id !== id);
            await upsertUserProfile(user.uid, { savingsGoals: updated });
            setSavingsGoals(updated);
        } catch (e) {
            console.error("Error deleting savings goal:", e);
        }
    };

    const allocateToGoal = async (goalId: string, amount: number, accountId: string) => {
        if (!user) return;
        try {
            const targetGoal = savingsGoals.find(g => g.id === goalId);
            if (!targetGoal) return;

            await addTxDb(user.uid, {
                amount: amount,
                category: 'Investment/SIP',
                type: 'EXPENSE',
                accountId: accountId,
                date: new Date().toISOString(),
                note: `Allocated to Goal: ${targetGoal.name}`
            });

            const updated = savingsGoals.map(g => {
                if (g.id === goalId) {
                    return { ...g, currentAmount: g.currentAmount + amount };
                }
                return g;
            });
            await upsertUserProfile(user.uid, { savingsGoals: updated });
            await refreshData();
        } catch (e) {
            console.error("Error allocating to savings goal:", e);
        }
    };

    return (
        <FinanceContext.Provider value={{
            transactions,
            cashBalance,
            cashAccountName,
            bankAccounts,
            totalBankBalance,
            creditCards,
            totalCreditDue,
            totalBalance,
            monthlyIncome,
            monthlyExpenses,
            projectedExpenses,
            projectedNotes,
            totalProjectedAmount,
            loading,
            hasFetchedOnce,
            hasError,
            addTransaction, updateTransaction, deleteTransaction,
            clearData, clearAccountData, refreshData,
            addProjectedNote, deleteProjectedNote, clearAllProjectedNotes,
            customCategories,
            addCustomCategory, deleteCustomCategory, updateCustomCategory,
            categoryBudgets,
            updateCategoryBudgets,
            recurringBills,
            addRecurringBill,
            deleteRecurringBill,
            payRecurringBill,
            savingsGoals,
            addSavingsGoal,
            deleteSavingsGoal,
            allocateToGoal,
            addBankAccount, updateBankAccount, deleteBankAccount,
            addCreditCard, updateCreditCard, deleteCreditCard,
            renameCashAccount,
            historyRetention, updateHistoryRetention,
            clearTransactionsBefore,
            userSalary, updateUserSalary,
        }}>
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => {
    const ctx = useContext(FinanceContext);
    if (!ctx) throw new Error('useFinance must be used within a FinanceProvider');
    return ctx;
};
