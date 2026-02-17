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
import { useRouter } from 'expo-router';
import {
    RecaptchaVerifier,
    signInWithPhoneNumber,
    ConfirmationResult
} from 'firebase/auth';
import { auth } from '../src/database/firebaseConfig';
import { useThemeColors } from '../src/theme/colors';
import { Logo } from '../src/components/Logo';
import { Phone, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react-native';

export default function LoginScreen() {
    const Colors = useThemeColors();
    const router = useRouter();

    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'phone' | 'otp'>('phone');

    // Initialize Recaptcha
    useEffect(() => {
        if (Platform.OS === 'web') {
            // @ts-ignore
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
            });
        }
    }, []);

    const handleSendOtp = async () => {
        if (!phoneNumber || phoneNumber.length < 10) {
            Alert.alert("Error", "Please enter a valid phone number with country code (e.g., +919876543210)");
            return;
        }

        setLoading(true);
        try {
            // @ts-ignore
            const appVerifier = window.recaptchaVerifier;
            const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
            setConfirmationResult(confirmation);
            setStep('otp');
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", error.message || "Failed to send OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length < 6) {
            Alert.alert("Error", "Please enter the 6-digit OTP");
            return;
        }

        setLoading(true);
        try {
            if (confirmationResult) {
                await confirmationResult.confirm(otp);
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", "Invalid OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: Colors.background }]}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.logoSection}>
                    <Logo size={100} horizontal={false} />
                </View>

                <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <Text style={[styles.title, { color: Colors.text }]}>
                        {step === 'phone' ? 'Welcome Back' : 'Verify Identity'}
                    </Text>
                    <Text style={[styles.subtitle, { color: Colors.textMuted }]}>
                        {step === 'phone'
                            ? 'Enter your mobile number to get started'
                            : `We sent a code to ${phoneNumber}`}
                    </Text>

                    {step === 'phone' ? (
                        <View style={styles.inputGroup}>
                            <View style={[styles.inputWrapper, { borderColor: Colors.border, backgroundColor: Colors.background }]}>
                                <Phone size={20} color={Colors.textMuted} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: Colors.text }]}
                                    placeholder="+91 00000 00000"
                                    placeholderTextColor={Colors.textMuted}
                                    keyboardType="phone-pad"
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: Colors.primary }]}
                                onPress={handleSendOtp}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Text style={styles.buttonText}>Send OTP</Text>
                                        <ArrowRight size={20} color="#fff" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.inputGroup}>
                            <View style={[styles.inputWrapper, { borderColor: Colors.border, backgroundColor: Colors.background }]}>
                                <ShieldCheck size={20} color={Colors.textMuted} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: Colors.text }]}
                                    placeholder="Enter 6-digit OTP"
                                    placeholderTextColor={Colors.textMuted}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    value={otp}
                                    onChangeText={setOtp}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: Colors.primary }]}
                                onPress={handleVerifyOtp}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Text style={styles.buttonText}>Verify & Login</Text>
                                        <CheckCircle2 size={20} color="#fff" />
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.resendButton}
                                onPress={() => setStep('phone')}
                                disabled={loading}
                            >
                                <Text style={{ color: Colors.primary }}>Change Number</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Recaptcha Container for Web */}
                {Platform.OS === 'web' && <View id="recaptcha-container" />}

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: Colors.textMuted }]}>
                        Secure. Private. Mindful.
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
        marginBottom: 40,
    },
    card: {
        padding: 32,
        borderRadius: 32,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
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
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 60,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 18,
        fontWeight: '500',
    },
    button: {
        flexDirection: 'row',
        height: 60,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    resendButton: {
        alignItems: 'center',
        marginTop: 8,
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
    }
});
