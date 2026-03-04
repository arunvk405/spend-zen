import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../database/firebaseConfig';
import { upsertUserProfile } from '../database/db';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    logout: () => Promise<void>;
    loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define Admin emails here
const ADMIN_EMAILS = ['arunvk405@gmail.com']; // User: Your email is now set as admin

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                // Sync basic auth info to Firestore
                await upsertUserProfile(authUser.uid, {
                    uid: authUser.uid,
                    email: authUser.email,
                    displayName: authUser.displayName,
                    photoURL: authUser.photoURL,
                });
            }
            setUser(authUser);
            setIsAdmin(authUser ? ADMIN_EMAILS.includes(authUser.email || '') : false);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const loginWithGoogle = async () => {
        try {
            if (Platform.OS === 'web') {
                await signInWithPopup(auth, googleProvider);
            } else {
                Alert.alert("Native Support", "Google Login for mobile requires additional configuration (EAS Build). Use Web version for full functionality.");
            }
        } catch (e) {
            console.error("Google login error:", e);
            Alert.alert("Login Error", "Failed to sign in with Google");
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            // Clear theme and any other locally cached preferences
            await AsyncStorage.clear();
        } catch (e) {
            console.error("Logout error:", e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, logout, loginWithGoogle }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
