import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration - This is a demo project with public access
// For production, you should create your own Firebase project
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

// Initialize Firestore
export const db = getFirestore(app);
