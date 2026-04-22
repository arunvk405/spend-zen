import { Transaction, BankAccount, CreditCard } from '../models';
import { db } from './firebaseConfig';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    deleteDoc,
    doc,
    getDoc,
    setDoc
} from 'firebase/firestore';

const COLLECTION_NAME = 'transactions';
const USERS_COLLECTION = 'users';
const PROJECTED_COLLECTION = 'projected_expenses';
const BANK_ACCOUNTS_COLLECTION = 'bank_accounts';
const CREDIT_CARDS_COLLECTION = 'credit_cards';

export async function initDatabase() {
    return true;
}

export async function upsertUserProfile(userId: string, data: any) {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        await setDoc(userRef, {
            ...data,
            lastUpdated: new Date().toISOString()
        }, { merge: true });
    } catch (e) {
        console.error("Error updating user profile:", e);
    }
}

export async function getUserProfile(userId: string) {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        const userSnap = await getDoc(userRef);
        return userSnap.exists() ? userSnap.data() : null;
    } catch (e) {
        console.error("Error getting user profile:", e);
        return null;
    }
}

export async function addTransaction(userId: string, tx: Omit<Transaction, 'id'>): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...tx,
            userId,
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (e) {
        console.error("Error adding transaction: ", e);
        throw e;
    }
}

export async function getTransactions(userId: string): Promise<Transaction[]> {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", userId)
        );
        const querySnapshot = await getDocs(q);
        const txs = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Transaction[];

        // Sort locally by date descending to avoid Firebase Index requirements
        return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (e) {
        console.error("Error getting transactions: ", e);
        return [];
    }
}


// Analytics and summary logic moved to FinanceContext for performance

export async function deleteTransaction(transactionId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, transactionId));
    } catch (e) {
        console.error("Error deleting transaction: ", e);
        throw e;
    }
}

import { isSameMonth, isSameYear, parseISO } from 'date-fns';

export async function deleteTransactionsByRange(userId: string, range: 'all' | 'year' | 'month'): Promise<number> {
    const transactions = await getTransactions(userId);
    const now = new Date();

    let toDelete: string[] = [];

    if (range === 'all') {
        toDelete = transactions.map(t => t.id as any);
    } else if (range === 'year') {
        toDelete = transactions
            .filter(t => isSameYear(parseISO(t.date), now))
            .map(t => t.id as any);
    } else if (range === 'month') {
        toDelete = transactions
            .filter(t => isSameMonth(parseISO(t.date), now))
            .map(t => t.id as any);
    }

    const promises = toDelete.map(id => deleteTransaction(id));
    await Promise.all(promises);
    return toDelete.length;
}

export async function deleteTransactionsByAccount(userId: string, accountId: string): Promise<number> {
    const transactions = await getTransactions(userId);
    const toDelete = transactions
        .filter(t => t.accountId === accountId)
        .map(t => t.id as any);

    const promises = toDelete.map(id => deleteTransaction(id));
    await Promise.all(promises);
    return toDelete.length;
}

export async function migrateTransactions(userId: string, oldAccountId: string, newAccountId: string): Promise<number> {
    try {
        const transactions = await getTransactions(userId);
        const toUpdate = transactions.filter(t => t.accountId === oldAccountId);
        
        const promises = toUpdate.map(t => {
            if (!t.id) return Promise.resolve();
            return setDoc(doc(db, COLLECTION_NAME, t.id as string), { accountId: newAccountId }, { merge: true });
        });
        
        await Promise.all(promises);
        return toUpdate.length;
    } catch (e) {
        console.error("Error migrating transactions:", e);
        return 0;
    }
}


// Projected Expenses (Next Month Planning)
export async function getProjectedExpenses(userId: string): Promise<any[]> {
    try {
        const q = query(
            collection(db, PROJECTED_COLLECTION),
            where("userId", "==", userId)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (e) {
        console.error("Error getting projected expenses: ", e);
        return [];
    }
}

export async function addProjectedExpense(userId: string, amount: number, description: string): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, PROJECTED_COLLECTION), {
            userId,
            amount,
            description,
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (e) {
        console.error("Error adding projected expense: ", e);
        throw e;
    }
}

export async function deleteProjectedExpense(id: string): Promise<void> {
    try {
        await deleteDoc(doc(db, PROJECTED_COLLECTION, id));
    } catch (e) {
        console.error("Error deleting projected expense: ", e);
        throw e;
    }
}

export async function deleteAllProjectedExpenses(userId: string): Promise<void> {
    try {
        const q = query(
            collection(db, PROJECTED_COLLECTION),
            where("userId", "==", userId)
        );
        const querySnapshot = await getDocs(q);
        const promises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(promises);
    } catch (e) {
        console.error("Error clearing all projected expenses: ", e);
        throw e;
    }
}
export async function getTransaction(transactionId: string): Promise<Transaction | null> {
    try {
        const docRef = doc(db, COLLECTION_NAME, transactionId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Transaction;
        }
        return null;
    } catch (e) {
        console.error("Error getting transaction: ", e);
        return null;
    }
}

export async function updateTransaction(transactionId: string, updates: Partial<Transaction>): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, transactionId);
        await setDoc(docRef, {
            ...updates,
            updatedAt: new Date().toISOString()
        }, { merge: true });
    } catch (e) {
        console.error("Error updating transaction: ", e);
        throw e;
    }
}

export async function updateCustomCategories(userId: string, categories: any[]) {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        await setDoc(userRef, {
            customCategories: categories,
            lastUpdated: new Date().toISOString()
        }, { merge: true });
    } catch (e) {
        console.error("Error updating custom categories:", e);
    }
}

// ─── Bank Accounts ─────────────────────────────────────────────────────────

export async function getBankAccounts(userId: string): Promise<BankAccount[]> {
    try {
        const q = query(collection(db, BANK_ACCOUNTS_COLLECTION), where('userId', '==', userId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as BankAccount))
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch (e) {
        console.error('Error getting bank accounts:', e);
        return [];
    }
}

export async function addBankAccount(
    userId: string,
    data: Omit<BankAccount, 'id' | 'userId' | 'createdAt'>,
    customId?: string
): Promise<string> {
    const accountData = {
        ...data,
        userId,
        createdAt: new Date().toISOString(),
    };
    
    if (customId) {
        await setDoc(doc(db, BANK_ACCOUNTS_COLLECTION, customId), accountData);
        return customId;
    }
    
    const docRef = await addDoc(collection(db, BANK_ACCOUNTS_COLLECTION), accountData);
    return docRef.id;
}

export async function updateBankAccount(id: string, data: Partial<BankAccount>): Promise<void> {
    await setDoc(doc(db, BANK_ACCOUNTS_COLLECTION, id), {
        ...data,
        updatedAt: new Date().toISOString(),
    }, { merge: true });
}

export async function deleteBankAccount(id: string): Promise<void> {
    await deleteDoc(doc(db, BANK_ACCOUNTS_COLLECTION, id));
}

// ─── Credit Cards ───────────────────────────────────────────────────────────

export async function getCreditCards(userId: string): Promise<CreditCard[]> {
    try {
        const q = query(collection(db, CREDIT_CARDS_COLLECTION), where('userId', '==', userId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as CreditCard))
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch (e) {
        console.error('Error getting credit cards:', e);
        return [];
    }
}

export async function addCreditCard(
    userId: string,
    data: Omit<CreditCard, 'id' | 'userId' | 'createdAt'>,
    customId?: string
): Promise<string> {
    const cardData = {
        ...data,
        userId,
        createdAt: new Date().toISOString(),
    };

    if (customId) {
        await setDoc(doc(db, CREDIT_CARDS_COLLECTION, customId), cardData);
        return customId;
    }

    const docRef = await addDoc(collection(db, CREDIT_CARDS_COLLECTION), cardData);
    return docRef.id;
}

export async function updateCreditCard(id: string, data: Partial<CreditCard>): Promise<void> {
    await setDoc(doc(db, CREDIT_CARDS_COLLECTION, id), {
        ...data,
        updatedAt: new Date().toISOString(),
    }, { merge: true });
}

export async function deleteCreditCard(id: string): Promise<void> {
    await deleteDoc(doc(db, CREDIT_CARDS_COLLECTION, id));
}

