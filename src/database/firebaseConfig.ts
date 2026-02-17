import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration - USER: Replace with your actual project config from Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyDemoKeyForFinTrackExpenseManager2026",
    authDomain: "fintrack-demo.firebaseapp.com",
    projectId: "fintrack-expense-demo",
    storageBucket: "fintrack-expense-demo.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app);
export const auth = getAuth(app);
