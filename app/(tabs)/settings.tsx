import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Share, Switch, TextInput, ActivityIndicator, Modal, FlatList, KeyboardAvoidingView } from 'react-native';
import { useThemeColors, Typography } from '../../src/theme/colors';
import { Logo } from '../../src/components/Logo';
import {
    Moon,
    Sun,
    Trash2,
    Share2,
    Shield,
    Info,
    ChevronRight,
    Github,
    LogOut,
    ExternalLink,
    Edit3,
    User,
    TrendingUp,
    Plus,
    X,
    Save,
    Calculator
} from 'lucide-react-native';
import { updateProfile } from 'firebase/auth';
import { auth } from '../../src/database/firebaseConfig';
import { upsertUserProfile } from '../../src/database/db';
import { useFinance } from '../../src/context/FinanceContext';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
const SettingsItem = ({ icon: Icon, label, onPress, color, value = undefined, toggle = false }: any) => {
    const Colors = useThemeColors();
    return (
        <TouchableOpacity
            style={[styles.item, { borderBottomColor: Colors.border }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.itemLeft}>
                <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                    <Icon size={20} color={color} />
                </View>
                <Text style={[styles.itemLabel, { color: Colors.text }]}>{label}</Text>
            </View>
            {toggle ? (
                <Switch
                    value={value}
                    onValueChange={onPress}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    thumbColor={Colors.white}
                />
            ) : (
                <ChevronRight size={20} color={Colors.textMuted} />
            )}
        </TouchableOpacity>
    );
};

import { useTheme } from '../../src/context/ThemeContext';

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export default function Settings() {
    const Colors = useThemeColors();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const { clearData, projectedExpenses, projectedNotes, totalProjectedAmount, addProjectedNote, deleteProjectedNote } = useFinance();

    const { user, logout } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.displayName || '');
    const [updateLoading, setUpdateLoading] = useState(false);

    // Projected Expenses Modal States
    const [showProjectedModal, setShowProjectedModal] = useState(false);
    const [projectedAmount, setProjectedAmount] = useState('');
    const [projectedDesc, setProjectedDesc] = useState('');
    const [isAddingProjected, setIsAddingProjected] = useState(false);

    const handleUpdateProfile = async () => {
        if (!user) return;
        if (!name) {
            Alert.alert("Error", "Name cannot be empty");
            return;
        }

        setUpdateLoading(true);
        try {
            await updateProfile(user, { displayName: name });
            await upsertUserProfile(user.uid, { displayName: name });
            setIsEditing(false);
            Alert.alert("Success", "Profile updated successfully!");
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to update profile");
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleLogout = async () => {
        const performLogout = async () => {
            await logout();
            router.replace('/login');
        };

        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to logout?")) {
                performLogout();
            }
        } else {
            Alert.alert(
                "Logout",
                "Are you sure you want to logout?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Logout",
                        style: "destructive",
                        onPress: performLogout
                    }
                ]
            );
        }
    };

    const handleShare = async () => {
        // ... (share logic remains same)
        const message = `👋 Hey! Check out Spend Zen, a clean and simple expense tracker I'm using.

🚀 **How to Install (It's Free!):**

📱 **iOS (iPhone):**
1. Open this link in Safari.
2. Tap the 'Share' button (square with arrow).
3. Scroll down and tap 'Add to Home Screen'.

🤖 **Android:**
1. Open this link in Chrome.
2. Tap the three dots menu (⋮).
3. Tap 'Install App' or 'Add to Home Screen'.


🔗 Link: https://spend-zen.netlify.app/`;

        try {
            await Share.share({
                message: message,
                url: 'https://spend-zen.netlify.app/ ',
                title: 'Join me on Spend Zen!'
            });
        } catch (error) {
            console.error(error);
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setTheme(newTheme);
    };

    const handleClearData = (range: 'all' | 'month' | 'year') => {
        const rangeText = range === 'all' ? 'ALL your' : `this ${range}'s`;
        const title = "⚠️ Irreversible Action";
        const message = `Are you sure you want to delete ${rangeText} data? This action cannot be undone.`;

        if (Platform.OS === 'web') {
            const confirmed = window.confirm(`${title}\n\n${message}`);
            if (confirmed) {
                performClear(range);
            }
        } else {
            Alert.alert(
                title,
                message,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete Forever",
                        style: "destructive",
                        onPress: () => performClear(range)
                    }
                ]
            );
        }
    };

    const performClear = async (range: 'all' | 'month' | 'year') => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
        const count = await clearData(range);
        const successMsg = `Cleaned up! Removed ${count} transactions.`;
        if (Platform.OS === 'web') {
            window.alert(successMsg);
        } else {
            Alert.alert("Success", successMsg);
        }
    };

    const handleSaveProjected = async () => {
        if (!projectedAmount || !projectedDesc) {
            Alert.alert("Error", "Please fill in both amount and description");
            return;
        }

        setIsAddingProjected(true);
        try {
            await addProjectedNote(Number(projectedAmount), projectedDesc);
            setProjectedAmount('');
            setProjectedDesc('');
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to save projection");
        } finally {
            setIsAddingProjected(false);
        }
    };

    const handleDeleteProjected = (id: string) => {
        if (Platform.OS === 'web') {
            if (window.confirm("Delete this projected item?")) {
                deleteProjectedNote(id);
            }
        } else {
            Alert.alert("Delete", "Delete this projected item?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteProjectedNote(id) }
            ]);
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: Colors.background }]} showsVerticalScrollIndicator={false}>
            <View style={styles.logoSection}>
                <Logo size={60} horizontal={false} />
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>Profile</Text>
                <View style={[styles.card, { backgroundColor: Colors.surface, padding: 20 }]}>
                    <View style={styles.profileHeader}>
                        <View style={[styles.profileIcon, { backgroundColor: Colors.primary + '20' }]}>
                            <User color={Colors.primary} size={32} />
                        </View>
                        <View style={styles.profileInfo}>
                            {isEditing ? (
                                <TextInput
                                    style={[styles.nameInput, { color: Colors.text, borderBottomColor: Colors.primary }]}
                                    value={name}
                                    onChangeText={setName}
                                    autoFocus
                                    placeholder="Your Name"
                                    placeholderTextColor={Colors.textMuted}
                                />
                            ) : (
                                <Text style={[styles.profileName, { color: Colors.text }]}>
                                    {user?.displayName || 'Zen User'}
                                </Text>
                            )}
                            <Text style={[styles.profileEmail, { color: Colors.textMuted }]}>
                                {user?.email}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => isEditing ? handleUpdateProfile() : setIsEditing(true)}
                            style={[styles.editBtn, { backgroundColor: Colors.background }]}
                        >
                            {updateLoading ? (
                                <ActivityIndicator size="small" color={Colors.primary} />
                            ) : (
                                isEditing ? (
                                    <Text style={{ color: Colors.primary, fontWeight: '700' }}>Save</Text>
                                ) : (
                                    <Edit3 size={18} color={Colors.primary} />
                                )
                            )}
                        </TouchableOpacity>
                    </View>
                    {isEditing && (
                        <TouchableOpacity style={{ marginTop: 10 }} onPress={() => setIsEditing(false)}>
                            <Text style={{ color: Colors.expense, textAlign: 'center', fontSize: 12 }}>Cancel</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>General</Text>
                <View style={[styles.card, { backgroundColor: Colors.surface }]}>
                    <SettingsItem
                        icon={Share2}
                        label="Share App"
                        color={Colors.primary}
                        onPress={handleShare}
                    />
                    <SettingsItem
                        icon={theme === 'dark' ? Moon : Sun}
                        label="Dark Mode"
                        color="#fbbf24"
                        toggle={false}
                        value={theme === 'light'}
                        onPress={toggleTheme}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>Account</Text>
                <View style={[styles.card, { backgroundColor: Colors.surface }]}>
                    <SettingsItem
                        icon={TrendingUp}
                        label={`Next Month Prediction: ₹${Math.round(totalProjectedAmount).toLocaleString()}`}
                        color={Colors.primary}
                        onPress={() => setShowProjectedModal(true)}
                    />
                    <SettingsItem
                        icon={LogOut}
                        label="Logout"
                        color={Colors.expense}
                        onPress={handleLogout}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>Data Management</Text>
                <View style={[styles.card, { backgroundColor: Colors.surface }]}>
                    <SettingsItem
                        icon={Trash2}
                        label="Clear This Month"
                        color={Colors.expense}
                        onPress={() => handleClearData('month')}
                    />
                    <SettingsItem
                        icon={Trash2}
                        label="Clear This Year"
                        color={Colors.expense}
                        onPress={() => handleClearData('year')}
                    />
                    <SettingsItem
                        icon={Shield}
                        label="Clear All Data"
                        color={Colors.expense}
                        onPress={() => handleClearData('all')}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>About</Text>
                <View style={[styles.card, { backgroundColor: Colors.surface }]}>
                    <SettingsItem
                        icon={Info}
                        label="Version 1.0.0 (Spend Zen)"
                        color={Colors.textMuted}
                        onPress={() => { }}
                    />
                </View>
            </View>

            <View style={{ alignItems: 'center', marginTop: 20 }}>
                <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Made with ❤️ by Arun</Text>
            </View>

            {/* Projected Expenses Modal */}
            <Modal
                visible={showProjectedModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowProjectedModal(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={[styles.modalContent, { backgroundColor: Colors.background }]}
                    >
                        <View style={[styles.modalHeader, { borderBottomColor: Colors.border }]}>
                            <View>
                                <Text style={[styles.modalTitle, { color: Colors.text }]}>Next Month Planning</Text>
                                <Text style={[styles.modalSubtitle, { color: Colors.textMuted }]}>Projected & Planned Expenses</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowProjectedModal(false)} style={styles.closeBtn}>
                                <X size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            <View style={[styles.summaryBox, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                                <View style={styles.summaryRow}>
                                    <Text style={[styles.summaryLabel, { color: Colors.textMuted }]}>AI Trend Projection</Text>
                                    <Text style={[styles.summaryValue, { color: Colors.text }]}>₹{Math.round(projectedExpenses).toLocaleString()}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={[styles.summaryLabel, { color: Colors.textMuted }]}>User Planned Notes</Text>
                                    <Text style={[styles.summaryValue, { color: Colors.primary }]}>+ ₹{projectedNotes.reduce((s, n) => s + Number(n.amount), 0).toLocaleString()}</Text>
                                </View>
                                <View style={[styles.summaryDivider, { backgroundColor: Colors.border }]} />
                                <View style={styles.summaryRow}>
                                    <Text style={[styles.totalLabel, { color: Colors.text }]}>Total Prediction</Text>
                                    <Text style={[styles.totalValue, { color: Colors.primary }]}>₹{Math.round(totalProjectedAmount).toLocaleString()}</Text>
                                </View>
                            </View>

                            <Text style={[styles.formLabel, { color: Colors.text, marginTop: 20 }]}>Add Planned Expense</Text>
                            <View style={[styles.form, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                                <View style={styles.inputRow}>
                                    <Calculator size={18} color={Colors.textMuted} />
                                    <TextInput
                                        style={[styles.modalInput, { color: Colors.text }]}
                                        placeholder="Amount (₹)"
                                        placeholderTextColor={Colors.textMuted}
                                        keyboardType="numeric"
                                        value={projectedAmount}
                                        onChangeText={(text) => setProjectedAmount(text.replace(/[^0-9.]/g, ''))}
                                    />
                                </View>
                                <View style={[styles.modalInputDivider, { backgroundColor: Colors.border }]} />
                                <View style={styles.inputRow}>
                                    <Edit3 size={18} color={Colors.textMuted} />
                                    <TextInput
                                        style={[styles.modalInput, { color: Colors.text }]}
                                        placeholder="Description (e.g. Rent, Insurance)"
                                        placeholderTextColor={Colors.textMuted}
                                        value={projectedDesc}
                                        onChangeText={setProjectedDesc}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={[styles.addBtn, { backgroundColor: Colors.primary }]}
                                    onPress={handleSaveProjected}
                                    disabled={isAddingProjected}
                                >
                                    {isAddingProjected ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <Plus size={20} color="#fff" />
                                            <Text style={styles.addBtnText}>Include in Prediction</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.formLabel, { color: Colors.text, marginTop: 24 }]}>Planned Items</Text>
                            {projectedNotes.length === 0 ? (
                                <View style={[styles.emptyBox, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                                    <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: 'center' }}>No custom notes added yet.</Text>
                                </View>
                            ) : (
                                projectedNotes.map((note) => (
                                    <View key={note.id} style={[styles.noteItem, { backgroundColor: Colors.surface, borderBottomColor: Colors.border }]}>
                                        <View style={styles.noteLeft}>
                                            <Text style={[styles.noteDesc, { color: Colors.text }]}>{note.description}</Text>
                                            <Text style={[styles.noteDate, { color: Colors.textMuted }]}>{new Date(note.createdAt).toLocaleDateString()}</Text>
                                        </View>
                                        <View style={styles.noteRight}>
                                            <Text style={[styles.noteAmount, { color: Colors.primary }]}>₹{note.amount.toLocaleString()}</Text>
                                            <TouchableOpacity onPress={() => handleDeleteProjected(note.id)}>
                                                <Trash2 size={16} color={Colors.expense} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    logoSection: {
        alignItems: 'center',
        marginVertical: 40,
    },
    sectionTitle: {
        ...Typography.caption,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
        marginLeft: 4,
        fontWeight: '600',
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    // Profile Styles
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    profileEmail: {
        fontSize: 14,
    },
    editBtn: {
        padding: 8,
        borderRadius: 10,
    },
    nameInput: {
        fontSize: 18,
        fontWeight: 'bold',
        paddingVertical: 4,
        borderBottomWidth: 1,
        marginBottom: 4,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '85%',
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 20,
        borderBottomWidth: 1,
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    modalSubtitle: {
        fontSize: 13,
    },
    closeBtn: {
        padding: 8,
    },
    modalScroll: {
        flex: 1,
    },
    summaryBox: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        gap: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    summaryDivider: {
        height: 1,
        width: '100%',
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalValue: {
        fontSize: 22,
        fontWeight: '800',
    },
    formLabel: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 12,
        marginLeft: 4,
    },
    form: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 50,
        gap: 12,
    },
    modalInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    modalInputDivider: {
        height: 1,
        marginVertical: 4,
    },
    addBtn: {
        flexDirection: 'row',
        height: 54,
        borderRadius: 12,
        marginTop: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    addBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    emptyBox: {
        padding: 30,
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    noteItem: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    noteLeft: {
        flex: 1,
    },
    noteDesc: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    noteDate: {
        fontSize: 12,
    },
    noteRight: {
        alignItems: 'flex-end',
        gap: 8,
    },
    noteAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});
