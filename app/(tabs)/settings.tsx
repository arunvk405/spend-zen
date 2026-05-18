import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Share, Switch, TextInput, ActivityIndicator, Modal, FlatList, KeyboardAvoidingView, Pressable, Platform } from 'react-native';
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
    Calculator,
    Landmark,
    Calendar,
    CreditCard
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { BeautifulDatePicker } from '../../src/components/BeautifulDatePicker';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../../src/database/firebaseConfig';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { upsertUserProfile, getUserProfile } from '../../src/database/db';
import { Image } from 'react-native';
import { useFinance } from '../../src/context/FinanceContext';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
const SettingsItem = ({ icon: Icon, label, onPress, color, value = undefined, toggle = false }: any) => {
    const Colors = useThemeColors();
    const [isHovered, setIsHovered] = useState(false);
    return (
        <Pressable
            style={({ pressed }) => [
                styles.item,
                { borderBottomColor: Colors.border },
                isHovered ? {
                    backgroundColor: Colors.surface,
                    shadowColor: Colors.primary,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 3,
                    transform: [{ translateY: -1 }],
                    borderBottomColor: 'transparent',
                    zIndex: 10
                } : undefined,
                pressed ? { backgroundColor: Colors.primary + '15', transform: [{ scale: 0.99 }] } : undefined,
                Platform.OS === 'web' ? { transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' } : undefined
            ] as any}
            onPress={onPress}
            onHoverIn={() => setIsHovered(true)}
            onHoverOut={() => setIsHovered(false)}
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
        </Pressable>
    );
};

import { useTheme } from '../../src/context/ThemeContext';


export default function Settings() {
    const Colors = useThemeColors();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const {
        clearData,
        projectedExpenses,
        projectedNotes,
        totalProjectedAmount,
        addProjectedNote,
        deleteProjectedNote,
        clearAllProjectedNotes,
        historyRetention,
        updateHistoryRetention,
        clearTransactionsBefore
    } = useFinance();

    const { user, logout } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.displayName || '');
    const [updateLoading, setUpdateLoading] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

    React.useEffect(() => {
        const loadProfilePhoto = async () => {
            if (user) {
                const profile = await getUserProfile(user.uid);
                if (profile?.photoURL) {
                    setProfilePhoto(profile.photoURL);
                }
            }
        };
        loadProfilePhoto();
    }, [user]);

    // Projected Expenses Modal States
    const [showProjectedModal, setShowProjectedModal] = useState(false);
    const [projectedAmount, setProjectedAmount] = useState('');
    const [projectedDesc, setProjectedDesc] = useState('');
    const [isAddingProjected, setIsAddingProjected] = useState(false);
    const [showRetentionSelector, setShowRetentionSelector] = useState(false);
    const [showCleanupModal, setShowCleanupModal] = useState(false);
    const [clearDate, setClearDate] = useState(new Date());
    const [showWebPicker, setShowWebPicker] = useState(false);
    const clearDateInputRef = React.useRef<any>(null);

    // Credit Card Strategy Modal States
    const [showStrategyModal, setShowStrategyModal] = useState(false);
    const [isAddingStrategy, setIsAddingStrategy] = useState(false);
    const [selectedCardId, setSelectedCardId] = useState<string>('');
    const [strategyPeriod, setStrategyPeriod] = useState('');
    const { creditCards, updateCreditCard, totalCreditDue, userSalary, updateUserSalary } = useFinance();
    const [localSalary, setLocalSalary] = useState(userSalary ? userSalary.toString() : '');

    React.useEffect(() => {
        if (showStrategyModal) setLocalSalary(userSalary ? userSalary.toString() : '');
    }, [showStrategyModal, userSalary]);

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

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.3,
            base64: true,
        });

        if (!result.canceled) {
            setImageLoading(true);
            try {
                let base64Image = '';
                const uri = result.assets[0].uri;

                if (Platform.OS === 'web') {
                    // Force downscale and compress on web using a canvas to bypass size limits & CORS slowness
                    base64Image = await new Promise<string>((resolve, reject) => {
                        const img = new window.Image();
                        img.src = uri;
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const size = 128; // 128x128 is perfect for mobile/web profile thumbnails
                            canvas.width = size;
                            canvas.height = size;
                            const ctx = canvas.getContext('2d');
                            
                            // Square crop center math
                            const sourceSize = Math.min(img.width, img.height);
                            const sourceX = (img.width - sourceSize) / 2;
                            const sourceY = (img.height - sourceSize) / 2;

                            ctx?.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
                            resolve(canvas.toDataURL('image/jpeg', 0.5)); // High compression
                        };
                        img.onerror = (e) => reject(e);
                    });
                } else {
                    base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
                }

                if (user && base64Image) {
                    await upsertUserProfile(user.uid, { photoURL: base64Image });
                    setProfilePhoto(base64Image);
                }
            } catch (error) {
                console.error("Error saving image: ", error);
                Alert.alert("Upload Failed", "There was an error saving your profile picture.");
            } finally {
                setImageLoading(false);
            }
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

    const performManualClear = async (date: Date) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
        const count = await clearTransactionsBefore(date);
        const successMsg = `Success! Deleted ${count} transactions older than ${format(date, 'dd MMM yyyy')}.`;
        if (Platform.OS === 'web') {
            window.alert(successMsg);
        } else {
            Alert.alert("Cleanup Complete", successMsg);
        }
    };

    const handleUpdateRetention = () => {
        if (Platform.OS === 'web') {
            setShowRetentionSelector(true);
        } else {
            Alert.alert("History Retention", "Transactions older than this will be automatically deleted to keep the app fast.", [
                { text: "Keep All", onPress: () => updateHistoryRetention('all') },
                { text: "3 Months", onPress: () => updateHistoryRetention('3months') },
                { text: "6 Months", onPress: () => updateHistoryRetention('6months') },
                { text: "Cancel", style: "cancel" }
            ]);
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

    const handleClearAllProjected = () => {
        if (projectedNotes.length === 0) return;

        const performClear = () => {
            clearAllProjectedNotes();
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        };

        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to clear ALL planned items?")) {
                performClear();
            }
        } else {
            Alert.alert("Clear All", "Are you sure you want to clear ALL planned items?", [
                { text: "Cancel", style: "cancel" },
                { text: "Clear All", style: "destructive", onPress: performClear }
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
                        <TouchableOpacity onPress={handlePickImage} disabled={imageLoading}>
                            <View style={[styles.profileIcon, { backgroundColor: Colors.primary + '20' }]}>
                                {imageLoading ? (
                                    <ActivityIndicator color={Colors.primary} size="small" />
                                ) : (profilePhoto || user?.photoURL) ? (
                                    Platform.OS === 'web' ? (
                                        <img 
                                            src={profilePhoto || user?.photoURL} 
                                            style={{ width: 64, height: 64, borderRadius: 32, objectFit: 'cover' }} 
                                            referrerPolicy="no-referrer"
                                            alt="Profile"
                                        />
                                    ) : (
                                        <Image 
                                            source={{ uri: profilePhoto || user?.photoURL }} 
                                            style={{ width: 64, height: 64, borderRadius: 32 }} 
                                        />
                                    )
                                ) : (
                                    <User color={Colors.primary} size={32} />
                                )}
                                <View style={{ position: 'absolute', bottom: -4, right: -4, backgroundColor: Colors.primary, borderRadius: 12, padding: 4, borderWidth: 2, borderColor: Colors.surface }}>
                                    <Edit3 size={10} color="#fff" />
                                </View>
                            </View>
                        </TouchableOpacity>
                        <View style={styles.profileInfo}>
                            {isEditing ? (
                                <View style={{ gap: 10 }}>
                                    <TextInput
                                        style={[styles.nameInput, {
                                            color: Colors.text,
                                            backgroundColor: Colors.background,
                                            borderColor: Colors.border,
                                            outlineStyle: 'none'
                                        } as any]}
                                        value={name}
                                        onChangeText={setName}
                                        autoFocus
                                        placeholder="Your Name"
                                        placeholderTextColor={Colors.textMuted}
                                    />
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <TouchableOpacity
                                            onPress={handleUpdateProfile}
                                            style={{ backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, flex: 1, alignItems: 'center' }}
                                        >
                                            {updateLoading ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Save Changes</Text>
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setIsEditing(false)}
                                            style={{ backgroundColor: Colors.background, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, flex: 1, alignItems: 'center', borderWidth: 1, borderColor: Colors.border }}
                                        >
                                            <Text style={{ color: Colors.text, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <>
                                    <Text style={[styles.profileName, { color: Colors.text }]}>
                                        {user?.displayName || 'Zen User'}
                                    </Text>
                                    <Text style={[styles.profileEmail, { color: Colors.textMuted }]}>
                                        {user?.email}
                                    </Text>
                                </>
                            )}
                        </View>
                        {!isEditing && (
                            <TouchableOpacity
                                onPress={() => setIsEditing(true)}
                                style={[styles.editBtn, { backgroundColor: Colors.background }]}
                            >
                                <Edit3 size={18} color={Colors.primary} />
                            </TouchableOpacity>
                        )}
                    </View>
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
                        icon={Landmark}
                        label="Manage Accounts & Cards"
                        color={Colors.primary}
                        onPress={() => router.push('/manage-accounts')}
                    />
                    <SettingsItem
                        icon={TrendingUp}
                        label={`Next Month Planning: ₹${Math.round(totalProjectedAmount).toLocaleString()}`}
                        color={Colors.primary}
                        onPress={() => setShowProjectedModal(true)}
                    />
                    <SettingsItem
                        icon={CreditCard}
                        label="Card Usage Strategy"
                        color={Colors.primary}
                        onPress={() => setShowStrategyModal(true)}
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
                <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>Privacy & History</Text>
                <View style={[styles.card, { backgroundColor: Colors.surface }]}>
                    <View style={[styles.item, { borderBottomColor: Colors.border, paddingVertical: 12 }]}>
                        <View style={styles.itemLeft}>
                            <View style={[styles.iconBox, { backgroundColor: Colors.primary + '20' }]}>
                                <Shield size={20} color={Colors.primary} />
                            </View>
                            <View>
                                <Text style={[styles.itemLabel, { color: Colors.text }]}>Auto-Clear History</Text>
                                <Text style={{ fontSize: 12, color: Colors.textMuted }}>Currently: {historyRetention === 'all' ? 'Never delete' : `Delete after ${historyRetention === '3months' ? '3' : '6'} months`}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={handleUpdateRetention}
                            style={{ backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                        >
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Change</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.item, { borderBottomColor: Colors.border, paddingVertical: 12 }]}>
                        <View style={styles.itemLeft}>
                            <View style={[styles.iconBox, { backgroundColor: Colors.expense + '20' }]}>
                                <Trash2 size={20} color={Colors.expense} />
                            </View>
                            <View>
                                <Text style={[styles.itemLabel, { color: Colors.text }]}>Manual Cleanup</Text>
                                <Text style={{ fontSize: 12, color: Colors.textMuted }}>One-time removal of old data</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={() => setShowCleanupModal(true)}
                            style={{ backgroundColor: Colors.expense, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                        >
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Select Date</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>About</Text>
                <View style={[styles.card, { backgroundColor: Colors.surface }]}>
                    <SettingsItem
                        icon={Info}
                        label="Version 2.0.0 (Spend Zen)"
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
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <Text style={[styles.modalSubtitle, { color: Colors.textMuted }]}>Plan ahead for your financials</Text>
                                    {projectedNotes.length > 0 && (
                                        <TouchableOpacity onPress={handleClearAllProjected}>
                                            <Text style={{ color: Colors.expense, fontSize: 13, fontWeight: '700' }}>Clear All Items</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setShowProjectedModal(false)} style={styles.closeBtn}>
                                <X size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            <View style={[styles.summaryBox, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                                <View style={styles.summaryRow}>
                                    <Text style={[styles.totalLabel, { color: Colors.text }]}>Total Planned</Text>
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
                                        keyboardType="decimal-pad"
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
                                            <TouchableOpacity onPress={() => deleteProjectedNote(note.id)}>
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

            {/* Card Usage Strategy Modal */}
            <Modal
                visible={showStrategyModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowStrategyModal(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={[styles.modalContent, { backgroundColor: Colors.background }]}
                    >
                        <View style={[styles.modalHeader, { borderBottomColor: Colors.border }]}>
                            <View>
                                <Text style={[styles.modalTitle, { color: Colors.text }]}>Card Usage Strategy</Text>
                                <Text style={[styles.modalSubtitle, { color: Colors.textMuted }]}>Manage best periods to use your cards</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowStrategyModal(false)} style={styles.closeBtn}>
                                <X size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            {/* Salary & Safety Rule Section */}
                            <View style={{ backgroundColor: Colors.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 20 }}>
                                <Text style={{ color: Colors.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, fontWeight: '600' }}>Your Monthly Salary</Text>
                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12 }}>
                                        <Text style={{ color: Colors.textMuted, fontWeight: '600', marginRight: 4 }}>₹</Text>
                                        <TextInput
                                            style={{ flex: 1, color: Colors.text, paddingVertical: 10, fontSize: 15, outlineStyle: 'none' } as any}
                                            placeholder="Enter salary"
                                            placeholderTextColor={Colors.textMuted}
                                            keyboardType="decimal-pad"
                                            value={localSalary}
                                            onChangeText={t => setLocalSalary(t.replace(/[^0-9.]/g, ''))}
                                            onBlur={() => {
                                                const val = parseFloat(localSalary);
                                                if (!isNaN(val) && val !== userSalary) {
                                                    updateUserSalary(val);
                                                }
                                            }}
                                        />
                                    </View>
                                </View>

                                <View style={{ backgroundColor: Colors.primary + '10', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary + '30', marginBottom: 12 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 14 }}>Safe Credit Limit (40%)</Text>
                                        <Text style={{ color: Colors.primary, fontWeight: '800', fontSize: 16 }}>₹{Math.round((userSalary || 0) * 0.4).toLocaleString()}</Text>
                                    </View>
                                    <Text style={{ color: Colors.textMuted, fontSize: 12, lineHeight: 18 }}>
                                        Financial experts recommend using no more than 40% of your monthly income on credit cards to ensure you can pay them off comfortably.
                                    </Text>
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border }}>
                                    <Text style={{ color: Colors.text, fontWeight: '600', fontSize: 13 }}>Current Total Due</Text>
                                    <Text style={{ color: Colors.expense, fontWeight: '800', fontSize: 15 }}>
                                        ₹{totalCreditDue.toLocaleString()}
                                    </Text>
                                </View>

                                {totalCreditDue > (userSalary || 0) * 0.4 && (
                                    <View style={{ backgroundColor: Colors.expense + '10', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.expense + '30', marginTop: 12 }}>
                                        <Text style={{ color: Colors.expense, fontWeight: '700', fontSize: 13, marginBottom: 4 }}>⚠️ High Credit Utilization Alert</Text>
                                        <Text style={{ color: Colors.textMuted, fontSize: 11, lineHeight: 16 }}>
                                            Your credit card balance exceeds your 40% safe limit. Paying off even small balances mid-month before your statements close keeps your credit utilization low and secures a prime credit score!
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginLeft: 4 }}>
                                <Text style={[styles.formLabel, { color: Colors.text, marginBottom: 0, marginLeft: 0 }]}>Added Strategies</Text>
                                {!isAddingStrategy && (
                                    <TouchableOpacity onPress={() => setIsAddingStrategy(true)}>
                                        <Text style={{ color: Colors.primary, fontWeight: '700' }}>+ Add New</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {isAddingStrategy && (
                                <View style={{ marginBottom: 24 }}>
                                    <Text style={{ color: Colors.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 10, fontWeight: '600' }}>Select Card *</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                        {creditCards.filter(c => !c.usagePeriod || c.id === selectedCardId).map(c => (
                                            <Pressable 
                                                key={c.id} 
                                                onPress={() => setSelectedCardId(c.id)}
                                                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: selectedCardId === c.id ? Colors.primary : Colors.border, backgroundColor: selectedCardId === c.id ? Colors.primary + '20' : Colors.surface }}
                                            >
                                                <Text style={{ color: selectedCardId === c.id ? Colors.primary : Colors.textMuted, fontWeight: '600', fontSize: 13 }}>{c.cardName}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                    {creditCards.filter(c => !c.usagePeriod || c.id === selectedCardId).length === 0 && (
                                        <Text style={{ color: Colors.textMuted, fontSize: 13, marginBottom: 16, fontStyle: 'italic' }}>No available cards to add strategy.</Text>
                                    )}

                                    <Text style={{ color: Colors.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, fontWeight: '600' }}>Usage Period *</Text>
                                    <TextInput
                                        style={{ borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 4, backgroundColor: Colors.surface, color: Colors.text, borderColor: Colors.border, outlineStyle: 'none' } as any}
                                        placeholder="e.g. 6-15 or 6th to 15th"
                                        placeholderTextColor={Colors.textMuted}
                                        value={strategyPeriod}
                                        onChangeText={setStrategyPeriod}
                                    />

                                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                                        <TouchableOpacity
                                            style={{ flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border }}
                                            onPress={() => { setIsAddingStrategy(false); setSelectedCardId(''); setStrategyPeriod(''); }}
                                        >
                                            <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 15 }}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={{ flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary }}
                                            onPress={async () => {
                                                if (!selectedCardId || !strategyPeriod) {
                                                    Alert.alert("Error", "Please select a card and enter a period");
                                                    return;
                                                }
                                                await updateCreditCard(selectedCardId, { usagePeriod: strategyPeriod });
                                                setIsAddingStrategy(false);
                                                setSelectedCardId('');
                                                setStrategyPeriod('');
                                            }}
                                        >
                                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Save</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {creditCards.filter(c => c.usagePeriod).length === 0 ? (
                                <View style={[styles.emptyBox, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                                    <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: 'center' }}>No card strategies added yet.</Text>
                                </View>
                            ) : (
                                [...creditCards.filter(c => c.usagePeriod)]
                                    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
                                    .map((card) => (
                                    <View key={card.id} style={[styles.noteItem, { backgroundColor: Colors.surface, borderBottomColor: Colors.border }]}>
                                        <View style={styles.noteLeft}>
                                            <Text style={[styles.noteDesc, { color: Colors.text }]}>{card.cardName}</Text>
                                            <View style={{ backgroundColor: Colors.primary + '15', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 4 }}>
                                                <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 14 }}>Use: {card.usagePeriod}</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.noteRight, { flexDirection: 'row', gap: 16, alignItems: 'center' }]}>
                                            <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                                                <Text style={{ fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', fontWeight: '600', marginBottom: 2 }}>Due</Text>
                                                <Text style={{ color: Colors.expense, fontWeight: '700', fontSize: 14 }}>₹{card.dueAmount.toLocaleString()}</Text>
                                            </View>
                                            <TouchableOpacity onPress={() => {
                                                setSelectedCardId(card.id);
                                                setStrategyPeriod(card.usagePeriod || '');
                                                setIsAddingStrategy(true);
                                            }}>
                                                <Edit3 size={16} color={Colors.primary} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={async () => {
                                                await updateCreditCard(card.id, { usagePeriod: '' });
                                            }}>
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

            {/* Retention Selection Modal (mainly for Web) */}
            <Modal
                visible={showRetentionSelector}
                transparent
                animationType="fade"
                onRequestClose={() => setShowRetentionSelector(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowRetentionSelector(false)}>
                    <View style={[styles.modalContent, { backgroundColor: Colors.surface, height: 'auto', padding: 24, borderRadius: 24 }]}>
                        <Text style={[styles.modalTitle, { color: Colors.text, textAlign: 'center', marginBottom: 12 }]}>History Retention</Text>
                        <Text style={{ color: Colors.textMuted, textAlign: 'center', marginBottom: 24 }}>Transactions older than this will be automatically deleted.</Text>

                        <TouchableOpacity
                            style={[styles.webOption, { borderColor: Colors.border }]}
                            onPress={() => { updateHistoryRetention('3months'); setShowRetentionSelector(false); }}
                        >
                            <Text style={{ color: Colors.text, fontWeight: '600' }}>Last 3 Months (Default)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.webOption, { borderColor: Colors.border }]}
                            onPress={() => { updateHistoryRetention('6months'); setShowRetentionSelector(false); }}
                        >
                            <Text style={{ color: Colors.text, fontWeight: '600' }}>Last 6 Months</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setShowRetentionSelector(false)}>
                            <Text style={{ color: Colors.expense, textAlign: 'center', fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

            {/* Manual Cleanup Modal */}
            <Modal
                visible={showCleanupModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCleanupModal(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: Colors.background, height: 'auto', paddingBottom: 40 }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: Colors.border }]}>
                            <View>
                                <Text style={[styles.modalTitle, { color: Colors.text }]}>Data Cleanup</Text>
                                <Text style={[styles.modalSubtitle, { color: Colors.textMuted }]}>Choose a cutoff date for deletion</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowCleanupModal(false)} style={styles.closeBtn}>
                                <X size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ gap: 20 }}>
                            <View style={[styles.infoBox, { backgroundColor: Colors.expense + '10', borderColor: Colors.expense + '30' }]}>
                                <Text style={{ color: Colors.expense, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                                    ⚠️ All transactions <Text style={{ fontWeight: 'bold' }}>BEFORE</Text> the selected date will be permanently deleted. This cannot be undone.
                                </Text>
                            </View>

                            <View style={[styles.dateSelectionBox, { backgroundColor: Colors.surface, borderColor: Colors.border, zIndex: showWebPicker ? 10000 : 1 }]}>
                                <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 8, fontWeight: '600' }}>CUTOFF DATE</Text>
                                {Platform.OS === 'web' ? (
                                    <View style={{ width: '100%' }}>
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            onPress={() => setShowWebPicker(!showWebPicker)}
                                            style={[styles.datePickerButton, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                                        >
                                            <Calendar size={20} color={Colors.primary} />
                                            <Text style={[styles.datePickerText, { color: Colors.text }]}>
                                                {format(clearDate, 'dd MMMM yyyy')}
                                            </Text>
                                        </TouchableOpacity>

                                        {showWebPicker && (
                                            <>
                                                <Pressable
                                                    style={{ position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.02)', zIndex: 9000 }}
                                                    onPress={() => setShowWebPicker(false)}
                                                />
                                                <View style={{ position: 'absolute', bottom: 50, left: 0, zIndex: 10000 }}>
                                                    <BeautifulDatePicker
                                                        value={clearDate}
                                                        onChange={(d) => { setClearDate(d); setShowWebPicker(false); }}
                                                        onClose={() => setShowWebPicker(false)}
                                                    />
                                                </View>
                                            </>
                                        )}
                                    </View>
                                ) : (
                                    <DateTimePicker
                                        value={clearDate}
                                        mode="date"
                                        display="spinner"
                                        textColor={Colors.text}
                                        onChange={(e, date) => date && setClearDate(date)}
                                        style={{ height: 120 }}
                                    />
                                )}
                            </View>

                            <TouchableOpacity
                                style={[styles.addBtn, { backgroundColor: Colors.expense, marginTop: 10 }]}
                                onPress={() => {
                                    const performAction = () => performManualClear(clearDate);
                                    if (Platform.OS === 'web') {
                                        if (window.confirm(`Final Warning: Delete everything before ${format(clearDate, 'dd MMM yyyy')}?`)) {
                                            performAction();
                                        }
                                    } else {
                                        Alert.alert(
                                            "Final Confirmation",
                                            `Delete all data before ${format(clearDate, 'dd MMMM yyyy')}?`,
                                            [
                                                { text: "Cancel", style: "cancel" },
                                                { text: "Confirm Delete", style: "destructive", onPress: performAction }
                                            ]
                                        );
                                    }
                                }}
                            >
                                <Trash2 size={20} color="#fff" />
                                <Text style={styles.addBtnText}>Delete Older Data</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setShowCleanupModal(false)} style={{ alignItems: 'center' }}>
                                <Text style={{ color: Colors.textMuted, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
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
        marginTop: 20,
        marginBottom: 24,
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
        fontSize: 16,
        fontWeight: '600',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderRadius: 10,
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
    webOption: {
        width: '100%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
        alignItems: 'center',
    },
    infoBox: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    dateSelectionBox: {
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
        width: '100%',
    },
    datePickerText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
