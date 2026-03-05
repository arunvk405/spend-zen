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
    ScrollView
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import {
    createUserWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
import { auth } from '../src/database/firebaseConfig';
import { useAuth } from '../src/context/AuthContext';
import { useThemeColors } from '../src/theme/colors';
import { Mail, Lock, User } from 'lucide-react-native';

export default function SignupScreen() {
    const Colors = useThemeColors();
    const router = useRouter();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const { user } = useAuth();

    // Auto-redirect if already logged in
    useEffect(() => {
        if (user) {
            router.replace('/(tabs)');
        }
    }, [user]);

    const handleSignup = async () => {
        if (!name || !email || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        if (password.length < 6) {
            Alert.alert("Error", "Password should be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, {
                displayName: name
            });
            router.replace('/(tabs)');
        } catch (error: any) {
            console.error(error);
            let message = "Failed to create account.";
            if (error.code === 'auth/email-already-in-use') {
                message = "This email is already registered.";
            } else if (error.code === 'auth/invalid-email') {
                message = "Invalid email address.";
            }
            Alert.alert("Sign Up Failed", message);
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
                        <Text style={[styles.title, { color: '#0F172A' }]}>Create Account</Text>
                        <Text style={[styles.subtitle, { color: '#64748B' }]}>
                            Join Spend Zen and start tracking
                        </Text>
                    </View>

                    <View style={styles.form}>
                        {/* Name Field */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: '#475569' }]}>Full Name</Text>
                            <View style={[styles.inputWrapper, { borderColor: '#E2E8F0' }]}>
                                <User size={18} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: '#1E293B' }]}
                                    placeholder="Full Name"
                                    placeholderTextColor="#94A3B8"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                        </View>

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
                            onPress={handleSignup}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Sign Up</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={[styles.footerText, { color: '#64748B' }]}>
                                Already have an account?
                                <Link href="/login" asChild>
                                    <Text style={{ color: '#2563EB', fontWeight: '800' }}> Login</Text>
                                </Link>
                            </Text>
                        </View>
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
        textAlign: 'center',
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
    footer: {
        marginTop: 12,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 15,
        fontWeight: '500',
    }
});

