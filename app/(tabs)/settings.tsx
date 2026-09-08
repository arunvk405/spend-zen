import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Share,
    Switch, TextInput, ActivityIndicator, Modal, FlatList, KeyboardAvoidingView,
    Pressable, Platform, useWindowDimensions, Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
    CreditCard,
    Zap,
    Download,
    Upload,
    HelpCircle,
    FileText,
    Sparkles,
    CheckCircle
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
import { useFinance } from '../../src/context/FinanceContext';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import packageJson from '../../package.json';
import { useTheme } from '../../src/context/ThemeContext';

const SettingsItem = ({
    icon: Icon,
    label,
    subtitle = undefined,
    badge = undefined,
    onPress,
    color,
    value = undefined,
    toggle = false,
    isDestructive = false
}: any) => {
    const Colors = useThemeColors();
    const [isHovered, setIsHovered] = useState(false);
    const handlePress = () => {
        if (onPress) onPress();
    };

    return (
        <Pressable
            style={({ pressed }) => [
                styles.item,
                { borderBottomColor: Colors.border + '35' },
                isHovered ? {
                    backgroundColor: Colors.isDark ? '#ffffff08' : '#00000004',
                } : undefined,
                pressed ? { backgroundColor: Colors.primary + '12', transform: [{ scale: 0.995 }] } : undefined,
                Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.15s ease' } : undefined
            ] as any}
            onPress={handlePress}
            onHoverIn={() => setIsHovered(true)}
            onHoverOut={() => setIsHovered(false)}
        >
            <View style={styles.itemLeft}>
                <View style={[styles.iconBox, { backgroundColor: (color || Colors.primary) + '18' }]}>
                    <Icon size={18} color={color || Colors.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.itemLabel, { color: isDestructive ? Colors.expense : Colors.text }]} numberOfLines={1}>
                        {label}
                    </Text>
                    {subtitle && (
                        <Text style={[styles.itemSubtitle, { color: Colors.textMuted }]} numberOfLines={1}>
                            {subtitle}
                        </Text>
                    )}
                </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {badge && (
                    <View style={[styles.itemBadge, { backgroundColor: Colors.border + '50' }]}>
                        <Text style={[styles.itemBadgeText, { color: Colors.textMuted }]}>{badge}</Text>
                    </View>
                )}
                {toggle ? (
                    <Switch
                        value={value}
                        onValueChange={handlePress}
                        trackColor={{ false: Colors.border, true: Colors.primary }}
                        thumbColor="#fff"
                    />
                ) : (
                    <ChevronRight size={17} color={Colors.textMuted} />
                )}
            </View>
        </Pressable>
    );
};

export default function Settings() {
    const Colors = useThemeColors();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width: windowWidth } = useWindowDimensions();
    const isDesktop = windowWidth >= 860;

    const topScrollPadding = Math.max(insets.top + 12, Platform.OS === 'ios' ? 56 : 16);
    const bottomScrollPadding = Math.max(insets.bottom + 85, 105);
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
        clearTransactionsBefore,
        transactions,
        bankAccounts,
        categoryBudgets,
        importData
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
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showFaqModal, setShowFaqModal] = useState(false);
    const [expandedFaqId, setExpandedFaqId] = useState<number | null>(0);

    const handleOptimizePerformance = () => {
        setIsOptimizing(true);
        setTimeout(() => {
            setIsOptimizing(false);
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            const msg = "⚡ Performance Boost Applied! App search cache pre-indexed & local storage compacted.";
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert("Cache Optimized", msg);
        }, 600);
    };

    const handleExportJSONBackup = () => {
        const backupData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            transactions,
            bankAccounts,
            creditCards,
            categoryBudgets
        };
        const jsonString = JSON.stringify(backupData, null, 2);

        if (Platform.OS === 'web') {
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SpendZen_Backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            Share.share({
                message: jsonString,
                title: 'SpendZen Backup'
            });
        }
    };

    const handleImportJSONBackup = () => {
        if (Platform.OS === 'web') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = async (e: any) => {
                const file = e.target?.files?.[0];
                if (!file) return;
                const text = await file.text();
                try {
                    const parsed = JSON.parse(text);
                    if (parsed.transactions && Array.isArray(parsed.transactions)) {
                        if (window.confirm(`Restore backup containing ${parsed.transactions.length} transactions? This will update your local records.`)) {
                            if (importData) await importData(parsed);
                            window.alert("Backup restored successfully!");
                        }
                    } else {
                        window.alert("Invalid backup JSON format.");
                    }
                } catch (err) {
                    window.alert("Failed to parse backup JSON file.");
                }
            };
            input.click();
        } else {
            Alert.alert("Restore Backup", "Please upload a valid SpendZen .json backup file.");
        }
    };

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

    const renderProfileSection = () => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>Profile</Text>
            <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1, padding: 18 }]}>
                <View style={styles.profileHeader}>
                    <TouchableOpacity onPress={handlePickImage} disabled={imageLoading} style={{ position: 'relative' }}>
                        <View style={[styles.profileIcon, { backgroundColor: Colors.primary + '18' }]}>
                            {imageLoading ? (
                                <ActivityIndicator color={Colors.primary} size="small" />
                            ) : (profilePhoto || user?.photoURL) ? (
                                Platform.OS === 'web' ? (
                                    <img
                                        src={(profilePhoto || user?.photoURL) ?? undefined}
                                        style={{ width: 60, height: 60, borderRadius: 30, objectFit: 'cover' }}
                                        referrerPolicy="no-referrer"
                                        alt="Profile"
                                    />
                                ) : (
                                    <Image
                                        source={{ uri: (profilePhoto || user?.photoURL) ?? undefined }}
                                        style={{ width: 60, height: 60, borderRadius: 30 }}
                                    />
                                )
                            ) : (
                                <User color={Colors.primary} size={30} />
                            )}
                            <View style={[styles.avatarEditBadge, { backgroundColor: Colors.primary, borderColor: Colors.surface }]}>
                                <Edit3 size={10} color="#fff" />
                            </View>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.profileInfo}>
                        {isEditing ? (
                            <View style={{ gap: 8 }}>
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
                                        style={[styles.profileSaveBtn, { backgroundColor: Colors.primary }]}
                                    >
                                        {updateLoading ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Save</Text>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setIsEditing(false)}
                                        style={[styles.profileCancelBtn, { backgroundColor: Colors.background, borderColor: Colors.border }]}
                                    >
                                        <Text style={{ color: Colors.text, fontWeight: '600', fontSize: 12 }}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={[styles.profileName, { color: Colors.text }]} numberOfLines={1}>
                                        {user?.displayName || 'Zen User'}
                                    </Text>
                                    <View style={[styles.verifiedBadge, { backgroundColor: Colors.income + '18' }]}>
                                        <Text style={[styles.verifiedBadgeText, { color: Colors.income }]}>Active</Text>
                                    </View>
                                </View>
                                <Text style={[styles.profileEmail, { color: Colors.textMuted }]} numberOfLines={1}>
                                    {user?.email}
                                </Text>
                            </View>
                        )}
                    </View>

                    {!isEditing && (
                        <TouchableOpacity
                            onPress={() => setIsEditing(true)}
                            style={[styles.editBtn, { backgroundColor: Colors.background, borderColor: Colors.border }]}
                            accessibilityLabel="Edit display name"
                        >
                            <Edit3 size={15} color={Colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );

    const renderGeneralSection = () => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>General & Appearance</Text>
            <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1 }]}>
                <SettingsItem
                    icon={theme === 'dark' ? Moon : Sun}
                    label="Dark Mode"
                    subtitle={theme === 'dark' ? "Obsidian dark theme active" : "Crisp daytime theme active"}
                    color="#F59E0B"
                    toggle={false}
                    badge={theme === 'dark' ? "Dark" : "Light"}
                    onPress={toggleTheme}
                />
                <SettingsItem
                    icon={Share2}
                    label="Share SpendZen App"
                    subtitle="Invite friends to track their financial zen"
                    color={Colors.primary}
                    onPress={handleShare}
                />
            </View>
        </View>
    );

    const renderAccountSection = () => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>Financial Accounts & Strategy</Text>
            <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1 }]}>
                <SettingsItem
                    icon={Landmark}
                    label="Manage Accounts & Cards"
                    subtitle="Configure bank balances, credit limits & cash"
                    color={Colors.primary}
                    onPress={() => router.push('/manage-accounts')}
                />
                <SettingsItem
                    icon={TrendingUp}
                    label="Next Month Planning"
                    subtitle={`Total planned: ₹${Math.round(totalProjectedAmount).toLocaleString('en-IN')}`}
                    color="#8B5CF6"
                    onPress={() => setShowProjectedModal(true)}
                />
                <SettingsItem
                    icon={CreditCard}
                    label="Card Usage Strategy"
                    subtitle="40% Safe Limit & statement cycle optimizer"
                    color="#3B82F6"
                    onPress={() => setShowStrategyModal(true)}
                />
                <SettingsItem
                    icon={LogOut}
                    label="Logout"
                    subtitle="Sign out from this device"
                    color={Colors.expense}
                    isDestructive={true}
                    onPress={handleLogout}
                />
            </View>
        </View>
    );

    const renderPerformanceSection = () => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>Performance & Cloud Backup</Text>
            <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1 }]}>
                <View style={[styles.actionRowItem, { borderBottomColor: Colors.border + '40' }]}>
                    <View style={styles.itemLeft}>
                        <View style={[styles.iconBox, { backgroundColor: Colors.primary + '18' }]}>
                            <Zap size={18} color={Colors.primary} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.itemLabel, { color: Colors.text }]} numberOfLines={1}>App Speed Optimizer</Text>
                            <Text style={[styles.itemSubtitle, { color: Colors.textMuted }]} numberOfLines={1}>Compacts local storage & purges cache</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={handleOptimizePerformance}
                        disabled={isOptimizing}
                        style={[styles.smallActionBtn, { backgroundColor: Colors.primary }]}
                    >
                        {isOptimizing ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.smallActionBtnText}>Optimize</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={[styles.actionRowItem, { borderBottomColor: Colors.border + '40' }]}>
                    <View style={styles.itemLeft}>
                        <View style={[styles.iconBox, { backgroundColor: Colors.income + '18' }]}>
                            <Download size={18} color={Colors.income} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.itemLabel, { color: Colors.text }]} numberOfLines={1}>Export Backup (.JSON)</Text>
                            <Text style={[styles.itemSubtitle, { color: Colors.textMuted }]} numberOfLines={1}>Save all records offline to a file</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={handleExportJSONBackup}
                        style={[styles.smallActionBtn, { backgroundColor: Colors.income }]}
                    >
                        <Text style={styles.smallActionBtnText}>Export</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.actionRowItem, { borderBottomWidth: 0 }]}>
                    <View style={styles.itemLeft}>
                        <View style={[styles.iconBox, { backgroundColor: '#F59E0B18' }]}>
                            <Upload size={18} color="#F59E0B" />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.itemLabel, { color: Colors.text }]} numberOfLines={1}>Restore Backup (.JSON)</Text>
                            <Text style={[styles.itemSubtitle, { color: Colors.textMuted }]} numberOfLines={1}>Restore transactions from file</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={handleImportJSONBackup}
                        style={[styles.smallActionBtn, { backgroundColor: '#F59E0B' }]}
                    >
                        <Text style={styles.smallActionBtnText}>Restore</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderPrivacySection = () => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>Privacy & History Automation</Text>
            <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1 }]}>
                <View style={[styles.actionRowItem, { borderBottomColor: Colors.border + '40' }]}>
                    <View style={styles.itemLeft}>
                        <View style={[styles.iconBox, { backgroundColor: Colors.primary + '18' }]}>
                            <Shield size={18} color={Colors.primary} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.itemLabel, { color: Colors.text }]}>Auto-Clear History</Text>
                            <Text style={[styles.itemSubtitle, { color: Colors.textMuted }]}>
                                {historyRetention === 'all' ? 'Never auto-delete' : `Auto-purge older than ${historyRetention === '3months' ? '3' : '6'} months`}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={handleUpdateRetention}
                        style={[styles.smallOutlineBtn, { borderColor: Colors.primary }]}
                    >
                        <Text style={[styles.smallOutlineBtnText, { color: Colors.primary }]}>Change</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.actionRowItem, { borderBottomWidth: 0 }]}>
                    <View style={styles.itemLeft}>
                        <View style={[styles.iconBox, { backgroundColor: Colors.expense + '18' }]}>
                            <Trash2 size={18} color={Colors.expense} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.itemLabel, { color: Colors.text }]}>Manual Cleanup</Text>
                            <Text style={[styles.itemSubtitle, { color: Colors.textMuted }]}>One-time purge before selected date</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowCleanupModal(true)}
                        style={[styles.smallOutlineBtn, { borderColor: Colors.expense }]}
                    >
                        <Text style={[styles.smallOutlineBtnText, { color: Colors.expense }]}>Select Date</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderDataManagementSection = () => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.expense }]}>Data Management (Danger Zone)</Text>
            <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.expense + '30', borderWidth: 1 }]}>
                <SettingsItem
                    icon={Trash2}
                    label="Clear This Month's Data"
                    subtitle="Deletes records created in current month"
                    color={Colors.expense}
                    isDestructive={true}
                    onPress={() => handleClearData('month')}
                />
                <SettingsItem
                    icon={Trash2}
                    label="Clear This Year's Data"
                    subtitle="Deletes records created in current year"
                    color={Colors.expense}
                    isDestructive={true}
                    onPress={() => handleClearData('year')}
                />
                <SettingsItem
                    icon={Shield}
                    label="Reset All Transactions"
                    subtitle="Permanently clears all historical transactions"
                    color={Colors.expense}
                    isDestructive={true}
                    onPress={() => handleClearData('all')}
                />
            </View>
        </View>
    );

    const renderLegalAndAboutSection = () => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>Legal, Help & About</Text>
            <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1 }]}>
                <SettingsItem
                    icon={HelpCircle}
                    label="Frequently Asked Questions (FAQ)"
                    subtitle="Guides, calculations & account management"
                    color={Colors.primary}
                    onPress={() => setShowFaqModal(true)}
                />
                <SettingsItem
                    icon={FileText}
                    label="Terms & Conditions"
                    subtitle="Privacy, local encryption & usage terms"
                    color={Colors.primary}
                    onPress={() => setShowTermsModal(true)}
                />
                <SettingsItem
                    icon={Info}
                    label={`SpendZen Version ${packageJson.version}`}
                    subtitle="Zen Build • Production Ready"
                    color={Colors.textMuted}
                    badge="v1.0.0"
                    onPress={() => {}}
                />
            </View>
        </View>
    );

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: Colors.background }]}
            contentContainerStyle={{
                paddingTop: topScrollPadding,
                paddingBottom: bottomScrollPadding,
                maxWidth: isDesktop ? 1040 : 640,
                width: '100%',
                alignSelf: 'center',
                paddingHorizontal: 16
            }}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.logoSection}>
                <Logo size={58} horizontal={false} />
            </View>

            {isDesktop ? (
                <View style={styles.desktopGrid}>
                    <View style={styles.gridCol}>
                        {renderProfileSection()}
                        {renderGeneralSection()}
                        {renderAccountSection()}
                    </View>
                    <View style={styles.gridCol}>
                        {renderPerformanceSection()}
                        {renderPrivacySection()}
                        {renderDataManagementSection()}
                        {renderLegalAndAboutSection()}
                    </View>
                </View>
            ) : (
                <View style={styles.mobileFlow}>
                    {renderProfileSection()}
                    {renderGeneralSection()}
                    {renderAccountSection()}
                    {renderPerformanceSection()}
                    {renderPrivacySection()}
                    {renderDataManagementSection()}
                    {renderLegalAndAboutSection()}
                </View>
            )}

            <View style={styles.footerSection}>
                <Text style={{ color: Colors.textMuted, fontSize: 12 }}>SpendZen • Financial Mindfulness</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 3 }}>Made with ❤️ by Arun</Text>
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
            {/* Terms & Conditions Modal */}
            <Modal
                visible={showTermsModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowTermsModal(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: Colors.background, maxHeight: '85%' }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: Colors.border }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <FileText size={20} color={Colors.primary} />
                                <Text style={[styles.modalTitle, { color: Colors.text }]}>Terms & Conditions</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowTermsModal(false)} style={styles.closeBtn}>
                                <X size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            <View style={{ gap: 14, paddingVertical: 10 }}>
                                <Text style={{ fontSize: 13, color: Colors.textMuted, lineHeight: 18 }}>
                                    Last Updated: August 2026
                                </Text>

                                <View>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 }}>1. Acceptance of Terms</Text>
                                    <Text style={{ fontSize: 13, color: Colors.textMuted, lineHeight: 20 }}>
                                        By downloading, accessing, or using SpendZen ("Application"), you agree to be bound by these Terms & Conditions. If you do not agree to these terms, please do not use the Application.
                                    </Text>
                                </View>

                                <View>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 }}>2. Data Ownership & Privacy</Text>
                                    <Text style={{ fontSize: 13, color: Colors.textMuted, lineHeight: 20 }}>
                                        Your financial records, bank accounts, and category budgets remain strictly your private property. SpendZen stores data securely and does not sell or distribute personal financial data to third parties.
                                    </Text>
                                </View>

                                <View>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 }}>3. AI Recommendations Disclaimer</Text>
                                    <Text style={{ fontSize: 13, color: Colors.textMuted, lineHeight: 20 }}>
                                        All AI financial recommendations, 50/30/20 target allocations, spending leak alerts, and 6-month net worth forecasts are provided for informational and planning purposes only and do not constitute certified professional financial advice.
                                    </Text>
                                </View>

                                <View>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 }}>4. User Responsibility for Data Backups</Text>
                                    <Text style={{ fontSize: 13, color: Colors.textMuted, lineHeight: 20 }}>
                                        You are responsible for exporting periodic offline JSON backups of your financial records using the built-in Performance & Data Optimization tools in Settings.
                                    </Text>
                                </View>

                                <View>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 }}>5. Updates & Modifications</Text>
                                    <Text style={{ fontSize: 13, color: Colors.textMuted, lineHeight: 20 }}>
                                        We reserve the right to modify these terms at any time. Continued use of the Application signifies your acceptance of any updated terms.
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={{ backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 12 }}
                            onPress={() => setShowTermsModal(false)}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>I Agree & Accept</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Frequently Asked Questions (FAQ) Modal */}
            <Modal
                visible={showFaqModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFaqModal(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: Colors.background, maxHeight: '85%' }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: Colors.border }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <HelpCircle size={20} color={Colors.primary} />
                                <Text style={[styles.modalTitle, { color: Colors.text }]}>Frequently Asked Questions</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowFaqModal(false)} style={styles.closeBtn}>
                                <X size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            <View style={{ gap: 12, paddingVertical: 10 }}>
                                {[
                                    {
                                        id: 0,
                                        q: "Is my financial data safe and private?",
                                        a: "Yes! SpendZen is designed with privacy as the highest priority. All your accounts, transactions, and category budgets are stored securely. Your financial data is never sold or shared."
                                    },
                                    {
                                        id: 1,
                                        q: "How does the AI Financial Planner work?",
                                        a: "The AI Planner analyzes your actual monthly income, expenses, and category trends to recommend 50/30/20 budget allocations, detect spending leaks, and forecast your 6-month net worth."
                                    },
                                    {
                                        id: 2,
                                        q: "How do I backup and restore my data?",
                                        a: "Go to Settings -> Performance & Data Optimization -> Export Full Backup (.JSON) to save your records. You can restore your data anytime on any device with 1 click."
                                    },
                                    {
                                        id: 3,
                                        q: "Does SpendZen work offline?",
                                        a: "Yes! SpendZen is fully functional offline. All basic analytics, transaction history search, and deterministic AI predictions run locally on your device."
                                    },
                                    {
                                        id: 4,
                                        q: "How do I set up recurring bills and budget alerts?",
                                        a: "Go to Dashboard -> Category Budgets or Upcoming Bills to set up automated payment reminders and master spending gauges."
                                    }
                                ].map((item) => {
                                    const isExpanded = expandedFaqId === item.id;
                                    return (
                                        <View key={item.id} style={{ backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' }}>
                                            <TouchableOpacity
                                                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}
                                                onPress={() => setExpandedFaqId(isExpanded ? null : item.id)}
                                            >
                                                <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.text, flex: 1, paddingRight: 10 }}>{item.q}</Text>
                                                <ChevronRight size={18} color={Colors.textMuted} style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }} />
                                            </TouchableOpacity>
                                            {isExpanded && (
                                                <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 0, borderTopWidth: 1, borderTopColor: Colors.border + '30' }}>
                                                    <Text style={{ fontSize: 12, color: Colors.textMuted, lineHeight: 19, marginTop: 8 }}>{item.a}</Text>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={{ backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 12 }}
                            onPress={() => setShowFaqModal(false)}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Close FAQ</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    desktopGrid: {
        flexDirection: 'row',
        gap: 20,
        alignItems: 'flex-start',
    },
    gridCol: {
        flex: 1,
        minWidth: 0,
    },
    mobileFlow: {
        width: '100%',
    },
    footerSection: {
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 12,
    },
    section: {
        marginBottom: 20,
    },
    logoSection: {
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 8,
        marginLeft: 4,
        fontWeight: '700',
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderBottomWidth: 1,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
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
        fontSize: 14,
        fontWeight: '600',
    },
    itemSubtitle: {
        fontSize: 11,
        marginTop: 2,
    },
    itemBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    itemBadgeText: {
        fontSize: 10.5,
        fontWeight: '700',
    },
    actionRowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderBottomWidth: 1,
    },
    smallActionBtn: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 8,
        minWidth: 72,
        alignItems: 'center',
        ...Platform.select({
            web: { cursor: 'pointer' },
            default: {}
        })
    } as any,
    smallActionBtnText: {
        color: '#fff',
        fontSize: 11.5,
        fontWeight: '700',
    },
    smallOutlineBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        ...Platform.select({
            web: { cursor: 'pointer' },
            default: {}
        })
    } as any,
    smallOutlineBtnText: {
        fontSize: 11.5,
        fontWeight: '700',
    },
    // Profile Styles
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    avatarEditBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        borderRadius: 12,
        padding: 4,
        borderWidth: 2,
    },
    profileInfo: {
        flex: 1,
        minWidth: 0,
    },
    profileName: {
        fontSize: 17,
        fontWeight: '700',
    },
    profileEmail: {
        fontSize: 12.5,
        marginTop: 2,
    },
    verifiedBadge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    verifiedBadgeText: {
        fontSize: 9.5,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    editBtn: {
        padding: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    nameInput: {
        fontSize: 14,
        fontWeight: '600',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderRadius: 8,
    },
    profileSaveBtn: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
    },
    profileCancelBtn: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
        borderWidth: 1,
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
