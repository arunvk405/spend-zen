import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase configuration - USER: Replace with your actual project config from Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyCTNoVrufWA4bwV414qektw1ale-HMVsks",
    authDomain: "spend-zen-350c5.firebaseapp.com",
    projectId: "spend-zen-350c5",
    storageBucket: "spend-zen-350c5.firebasestorage.app",
    messagingSenderId: "100975576212",
    appId: "1:100975576212:web:96ad5e1b658b6d79df6081",
    measurementId: "G-3GWMWTT3ZQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();



