import React, { useState } from 'react';
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
    sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../src/database/firebaseConfig';
import { useThemeColors } from '../src/theme/colors';
import { Logo } from '../src/components/Logo';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
    const Colors = useThemeColors();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleReset = async () => {
        if (!email) {
            Alert.alert("Error", "Please enter your email address");
            return;
        }

        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setSubmitted(true);
        } catch (error: any) {
            console.error(error);
            let message = "Failed to send reset email.";
            if (error.code === 'auth/user-not-found') {
                message = "No account found with this email.";
            }
            Alert.alert("Error", message);
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
                    {submitted ? (
                        <View style={styles.successState}>
                            <View style={[styles.iconCircle, { backgroundColor: Colors.primary + '20' }]}>
                                <Mail size={40} color={Colors.primary} />
                            </View>
                            <Text style={[styles.title, { color: Colors.text }]}>Check your email</Text>
                            <Text style={[styles.subtitle, { color: Colors.textMuted }]}>
                                We've sent a password reset link to {email}. Click the link in the email to reset your password.
                            </Text>
                            <Link href="/login" asChild>
                                <TouchableOpacity style={StyleSheet.flatten([styles.button, { backgroundColor: Colors.primary, width: '100%' }])}>
                                    <Text style={styles.buttonText}>Back to Login</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    ) : (
                        <>
                            <Text style={[styles.title, { color: Colors.text }]}>Forgot Password</Text>
                            <Text style={[styles.subtitle, { color: Colors.textMuted }]}>
                                Enter your email and we'll send you a link to reset your password.
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

                                <TouchableOpacity
                                    style={[styles.button, { backgroundColor: Colors.primary }]}
                                    onPress={handleReset}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Text style={styles.buttonText}>Send Reset Link</Text>
                                            <ArrowRight size={20} color="#fff" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
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
    successState: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    }
});
