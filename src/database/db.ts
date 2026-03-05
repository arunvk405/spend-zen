import { Transaction } from '../models';
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
