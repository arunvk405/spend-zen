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
    limit,
    getDoc,
    setDoc
} from 'firebase/firestore';
import { auth } from './firebaseConfig';

const COLLECTION_NAME = 'transactions';
const USERS_COLLECTION = 'users';

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
            where("userId", "==", userId),
            orderBy("date", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id as any, // Firebase uses strings, we type cast for compatibility 
            ...doc.data()
        })) as Transaction[];
    } catch (e) {
        console.error("Error getting transactions: ", e);
        return [];
    }
}

// Special function for Admin to see EVERYTHING
export async function getAllTransactionsAdmin(): Promise<any[]> {
    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (e) {
        console.error("Error getting all transactions: ", e);
        return [];
    }
}

export async function getTotalBalance(userId: string): Promise<number> {
    const transactions = await getTransactions(userId);
    return transactions.reduce((acc, curr) => {
        return curr.type === 'INCOME' ? acc + curr.amount : acc - curr.amount;
    }, 0);
}

export async function getMonthlySummary(userId: string, yearMonth: string) {
    const transactions = await getTransactions(userId);
    const monthly = transactions.filter(t => t.date.startsWith(yearMonth));

    const income = monthly
        .filter(t => t.type === 'INCOME')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const expense = monthly
        .filter(t => t.type === 'EXPENSE')
        .reduce((acc, curr) => acc + curr.amount, 0);

    return { income, expense };
}

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
