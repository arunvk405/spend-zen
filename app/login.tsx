import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../src/database/firebaseConfig';
import { useAuth } from '../src/context/AuthContext';
import { useThemeColors } from '../src/theme/colors';
import { Mail, Lock } from 'lucide-react-native';

export default function LoginScreen() {
    const Colors = useThemeColors();
    const router = useRouter();
    const { user, loginWithGoogle } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Auto-redirect if already logged in
    useEffect(() => {
        if (user) {
            router.replace('/(tabs)');
        }
    }, [user]);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please enter both email and password");
            return;
        }

        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            console.error(error);
            let message = "Failed to login. Please check your credentials.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                message = "Invalid email or password.";
            }
            Alert.alert("Login Failed", message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: '#F8FAFC' }]}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }]}>
                    <View style={styles.headerSection}>
                        <View style={styles.logoRow}>
                            <Text style={[styles.logoPart1, { color: '#0F172A' }]}>Spend</Text>
                            <Text style={[styles.logoPart2, { color: '#2563EB' }]}>Zen</Text>
                        </View>
                        <Text style={[styles.title, { color: '#0F172A' }]}>Welcome Back</Text>
                        <Text style={[styles.subtitle, { color: '#64748B' }]}>
                            Login to continue your journey
                        </Text>
                    </View>

                    <View style={styles.form}>
                        {/* Email Field */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: '#475569' }]}>Email address</Text>
                            <View style={[styles.inputWrapper, { borderColor: '#E2E8F0' }]}>
                                <Mail size={18} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: '#1E293B' }]}
                                    placeholder="Email address"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>
                        </View>

                        {/* Password Field */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: '#475569' }]}>Password</Text>
                            <View style={[styles.inputWrapper, { borderColor: '#E2E8F0' }]}>
                                <Lock size={18} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: '#1E293B' }]}
                                    placeholder="Password"
                                    placeholderTextColor="#94A3B8"
                                    secureTextEntry
                                    value={password}
                                    onChangeText={setPassword}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: '#0F172A' }]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Login</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={[styles.dividerLine, { backgroundColor: '#F1F5F9' }]} />
                            <Text style={[styles.dividerText, { color: '#94A3B8' }]}>OR CONTINUE WITH</Text>
                            <View style={[styles.dividerLine, { backgroundColor: '#F1F5F9' }]} />
                        </View>

                        <TouchableOpacity
                            style={[styles.socialButton, { borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }]}
                            onPress={loginWithGoogle}
                            disabled={loading}
                        >
                            <Image
                                source={require('../assets/google_logo.png')}
                                style={styles.googleIcon}
                                resizeMode="contain"
                            />
                            <Text style={[styles.socialButtonText, { color: '#0F172A' }]}>Continue with Google</Text>
                        </TouchableOpacity>

                        <Link href="/signup" asChild>
                            <TouchableOpacity style={styles.createAccountBtn}>
                                <Text style={[styles.createAccountText, { color: '#0F172A' }]}>Create an Account</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
    },
    card: {
        padding: 32,
        borderRadius: 24,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    logoPart1: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    logoPart2: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '500',
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
        backgroundColor: '#FFFFFF',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    button: {
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 12,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    socialButton: {
        flexDirection: 'row',
        height: 56,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        gap: 12,
    },
    socialButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
    googleIcon: {
        width: 22,
        height: 22,
    },
    createAccountBtn: {
        alignItems: 'center',
        marginTop: 12,
    },
    createAccountText: {
        fontSize: 15,
        fontWeight: '700',
    }
});


