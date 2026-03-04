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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../src/database/firebaseConfig';
import { useAuth } from '../src/context/AuthContext';
import { useThemeColors } from '../src/theme/colors';
import { Logo } from '../src/components/Logo';
import { Mail, Lock, ArrowRight, UserPlus, HelpCircle } from 'lucide-react-native';

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
            // Router replace will be handled by useEffect above or the Tab redirect
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
            style={[styles.container, { backgroundColor: Colors.background }]}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.logoSection}>
                    <Logo size={80} horizontal={false} />
                </View>

                <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <Text style={[styles.title, { color: Colors.text }]}>Welcome Back</Text>
                    <Text style={[styles.subtitle, { color: Colors.textMuted }]}>
                        Login to manage your financial zen
                    </Text>

                    <View style={styles.inputGroup}>
                        <View style={[styles.inputWrapper, { borderColor: Colors.border, backgroundColor: Colors.background }]}>
                            <Mail size={20} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: Colors.text }]}
                                placeholder="Email address"
                                placeholderTextColor={Colors.textMuted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>

                        <View style={[styles.inputWrapper, { borderColor: Colors.border, backgroundColor: Colors.background }]}>
                            <Lock size={20} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: Colors.text }]}
                                placeholder="Password"
                                placeholderTextColor={Colors.textMuted}
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: Colors.primary }]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.buttonText}>Login</Text>
                                    <ArrowRight size={20} color="#fff" />
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={[styles.dividerLine, { backgroundColor: Colors.border }]} />
                            <Text style={[styles.dividerText, { color: Colors.textMuted }]}>OR</Text>
                            <View style={[styles.dividerLine, { backgroundColor: Colors.border }]} />
                        </View>

                        <TouchableOpacity
                            style={[styles.socialButton, { borderColor: Colors.border, backgroundColor: Colors.background }]}
                            onPress={loginWithGoogle}
                            disabled={loading}
                        >
                            <View style={styles.googleIconPlaceholder}>
                                <Text style={styles.googleIconText}>G</Text>
                            </View>
                            <Text style={[styles.socialButtonText, { color: Colors.text }]}>Sign in with Google</Text>
                        </TouchableOpacity>

                        <View style={styles.linksContainer}>
                            <Link href="/forgot-password" asChild>
                                <TouchableOpacity style={styles.linkButton}>
                                    <HelpCircle size={16} color={Colors.primary} />
                                    <Text style={[styles.linkText, { color: Colors.primary }]}>Forgot Password?</Text>
                                </TouchableOpacity>
                            </Link>

                            <Link href="/signup" asChild>
                                <TouchableOpacity style={styles.linkButton}>
                                    <UserPlus size={16} color={Colors.primary} />
                                    <Text style={[styles.linkText, { color: Colors.primary }]}>Create Account</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: Colors.textMuted }]}>
                        Financial Mindfulness
                    </Text>
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
    logoSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    card: {
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 32,
    },
    inputGroup: {
        gap: 16,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 54,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
    },
    button: {
        flexDirection: 'row',
        height: 54,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    linksContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    linkText: {
        fontSize: 14,
        fontWeight: '600',
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 12,
        fontWeight: 'bold',
    },
    socialButton: {
        flexDirection: 'row',
        height: 54,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        gap: 12,
        marginBottom: 8,
    },
    socialButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    googleIconPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#4285F4',
        justifyContent: 'center',
        alignItems: 'center',
    },
    googleIconText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    }
});
