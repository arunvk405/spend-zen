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
import { Logo } from '../src/components/Logo';
import { Mail, Lock, User, ArrowRight, ArrowLeft } from 'lucide-react-native';

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
            style={[styles.container, { backgroundColor: Colors.background }]}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={StyleSheet.flatten([styles.header, { backgroundColor: Colors.background }])}>
                    <Link href="/login" asChild>
                        <TouchableOpacity style={StyleSheet.flatten([styles.backButton, { backgroundColor: Colors.surface, borderColor: Colors.border }])}>
                            <ArrowLeft size={20} color={Colors.text} />
                        </TouchableOpacity>
                    </Link>
                </View>

                <View style={styles.logoSection}>
                    <Logo size={60} horizontal={false} />
                </View>

                <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <Text style={[styles.title, { color: Colors.text }]}>Create Account</Text>
                    <Text style={[styles.subtitle, { color: Colors.textMuted }]}>
                        Join Spend Zen and start tracking
                    </Text>

                    <View style={styles.inputGroup}>
                        <View style={[styles.inputWrapper, { borderColor: Colors.border, backgroundColor: Colors.background }]}>
                            <User size={20} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: Colors.text }]}
                                placeholder="Full Name"
                                placeholderTextColor={Colors.textMuted}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

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
                            onPress={handleSignup}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.buttonText}>Sign Up</Text>
                                    <ArrowRight size={20} color="#fff" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: Colors.textMuted }]}>
                        Already have an account?
                        <Link href="/login" asChild>
                            <Text style={{ color: Colors.primary, fontWeight: 'bold' }}> Login</Text>
                        </Link>
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
    header: {
        paddingTop: 10,
        marginBottom: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 20,
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
    footer: {
        marginTop: 30,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
    }
});
