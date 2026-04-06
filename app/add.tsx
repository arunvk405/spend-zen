import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useFinance } from '../src/context/FinanceContext';
import { useThemeColors, Typography } from '../src/theme/colors';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, ACCOUNTS, TransactionType } from '../src/models';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getTransaction } from '../src/database/db';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import {
    Check,
    ArrowLeft,
    Briefcase,
    PiggyBank,
    Gift,
    TrendingUp,
    Laptop,
    Utensils,
    Car,
    Home,
    ShoppingCart,
    Film,
    FileText,
    Wallet,
    Landmark,
    CreditCard,
    Package,
    Activity,
    User,
    PawPrint,
    TrendingUp as TrendingUpIcon,
    HelpCircle,
    Plus as PlusIcon,
    Pencil,
    Trash2,
    Calendar as CalendarIcon
} from 'lucide-react-native';

const IconRenderer = ({ name, color, size = 24 }: { name: string, color: string, size?: number }) => {
    switch (name) {
        case 'briefcase': return <Briefcase color={color} size={size} />;
        case 'piggy-bank': return <PiggyBank color={color} size={size} />;
        case 'gift': return <Gift color={color} size={size} />;
        case 'trending-up': return <TrendingUp color={color} size={size} />;
        case 'laptop': return <Laptop color={color} size={size} />;
        case 'utensils': return <Utensils color={color} size={size} />;
        case 'car': return <Car color={color} size={size} />;
        case 'home': return <Home color={color} size={size} />;
        case 'shopping-cart': return <ShoppingCart color={color} size={size} />;
        case 'film': return <Film color={color} size={size} />;
        case 'file-text': return <FileText color={color} size={size} />;
        case 'wallet': return <Wallet color={color} size={size} />;
        case 'landmark': return <Landmark color={color} size={size} />;
        case 'credit-card': return <CreditCard color={color} size={size} />;
        case 'cross': return <Activity color={color} size={size} />;
        case 'user': return <User color={color} size={size} />;
        case 'paw-print': return <PawPrint color={color} size={size} />;
        case 'package': return <Package color={color} size={size} />;
        case 'trending-up-icon': return <TrendingUpIcon color={color} size={size} />;
        default: return <HelpCircle color={color} size={size} />;
    }
};

import * as Haptics from 'expo-haptics';

export default function AddTransaction() {
    const Colors = useThemeColors();
    const { addTransaction, updateTransaction, transactions, customCategories, addCustomCategory, deleteCustomCategory, updateCustomCategory } = useFinance();
    const router = useRouter();
    const params = useLocalSearchParams();
    const editId = params.id as string;

    const [type, setType] = useState<TransactionType>('EXPENSE');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [accountId, setAccountId] = useState('cash');
    const [note, setNote] = useState('');
    const [date, setDate] = useState(new Date().toISOString());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(!!editId);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || new Date(date);
        setShowDatePicker(Platform.OS === 'ios');
        setDate(currentDate.toISOString());
    };

    useEffect(() => {
        if (editId) {
            const loadTransaction = async () => {
                try {
                    // Try finding in filtered transactions first
                    const existing = transactions.find(t => t.id === editId);
                    if (existing) {
                        setType(existing.type);
                        setAmount(existing.amount.toString());
                        setCategory(existing.category);
                        setAccountId(existing.accountId);
                        setNote(existing.note || '');
                        setDate(existing.date);
                    } else {
                        // Fallback to direct DB fetch
                        const tx = await getTransaction(editId);
                        if (tx) {
                            setType(tx.type);
                            setAmount(tx.amount.toString());
                            setCategory(tx.category);
                            setAccountId(tx.accountId);
                            setNote(tx.note || '');
                            setDate(tx.date);
                        }
                    }
                } catch (error) {
                    console.error("Error loading transaction for edit:", error);
                } finally {
                    setIsInitialLoading(false);
                }
            };
            loadTransaction();
        }
    }, [editId, transactions]);

    const categories = [
        ...(type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES),
        ...customCategories.filter(c => c.type === type)
    ];

    const handleAddCategory = () => {
        if (Platform.OS === 'web') {
            const name = window.prompt("Enter category name:");
            if (name && name.trim()) {
                addCustomCategory(name.trim(), type);
            }
        } else {
            // Mobile implementation would use a Modal or similar, but prompt is fine for web context
            // Since we are running in 'npx expo export:web', we'll stick to web compatible flows where possible
            const name = window.prompt("Enter category name:");
            if (name && name.trim()) {
                addCustomCategory(name.trim(), type);
            }
        }
    };

    const handleEditCategory = (cat: any) => {
        const newName = window.prompt("Enter new category name:", cat.name);
        if (newName && newName.trim() && newName !== cat.name) {
            updateCustomCategory(cat.name, newName.trim(), type);
            if (category === cat.name) setCategory(newName.trim());
        }
    };

    const handleDeleteCategory = (cat: any) => {
        if (window.confirm(`Are you sure you want to delete '${cat.name}'?`)) {
            deleteCustomCategory(cat.name, type);
            if (category === cat.name) setCategory('');
        }
    };

    const handleSubmit = async () => {
        if (!amount || !category || isSubmitting) return;

        setIsSubmitting(true);

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        try {
            const txData = {
                amount: parseFloat(amount),
                type,
                category,
                date,
                accountId,
                note,
            };

            if (editId) {
                await updateTransaction(editId, txData);
            } else {
                await addTransaction(txData);
            }

            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace('/(tabs)');
            }
        } catch (error) {
            console.error("Save error:", error);
            setIsSubmitting(false);
            if (Platform.OS === 'web') {
                window.alert("Failed to save transaction. Please try again.");
            }
        }
    };

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)');
        }
    };

    if (isInitialLoading) {
        return (
            <View style={[styles.mainContainer, { backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.mainContainer, { backgroundColor: Colors.background }]}>
            <View style={[styles.header, { backgroundColor: Colors.background, borderBottomColor: Colors.border }]}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <ArrowLeft color={Colors.text} size={24} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: Colors.text }]}>
                    {editId ? 'Edit Transaction' : 'Add Transaction'}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Type Selector */}
                <View style={styles.section}>
                    <View style={[styles.typeSelector, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                        <TouchableOpacity
                            style={[
                                styles.typeButton,
                                type === 'EXPENSE' && { backgroundColor: Colors.expense }
                            ]}
                            onPress={() => { setType('EXPENSE'); setCategory(''); }}
                        >
                            <Text style={[
                                styles.typeText,
                                { color: Colors.textMuted },
                                type === 'EXPENSE' && { color: Colors.white, fontWeight: 'bold' }
                            ]}>Expense</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.typeButton,
                                type === 'INCOME' && { backgroundColor: Colors.income }
                            ]}
                            onPress={() => { setType('INCOME'); setCategory(''); }}
                        >
                            <Text style={[
                                styles.typeText,
                                { color: Colors.textMuted },
                                type === 'INCOME' && { color: Colors.white, fontWeight: 'bold' }
                            ]}>Income</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Amount Input */}
                <View style={styles.card}>
                    <Text style={[styles.label, { color: Colors.textMuted }]}>Amount</Text>
                    <View style={[styles.amountInputContainer, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                        <Text style={[styles.currency, { color: Colors.textMuted }]}>₹</Text>
                        <TextInput
                            style={[styles.amountInput, { color: Colors.text }]}
                            keyboardType="decimal-pad"
                            value={amount}
                            onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
                            placeholder="0.00"
                            placeholderTextColor={Colors.textMuted}
                            autoFocus
                        />
                    </View>
                </View>

                {/* Account Selector */}
                <View style={styles.card}>
                    <Text style={[styles.label, { color: Colors.textMuted }]}>Account</Text>
                    <View style={styles.chipScroll}>
                        {ACCOUNTS.map((acc) => (
                            <TouchableOpacity
                                key={acc.id}
                                style={[
                                    styles.chip,
                                    { backgroundColor: Colors.surface, borderColor: Colors.border },
                                    accountId === acc.id && { backgroundColor: acc.color, borderColor: acc.color }
                                ]}
                                onPress={() => setAccountId(acc.id)}
                            >
                                <Text style={[
                                    styles.chipText,
                                    { color: Colors.text },
                                    accountId === acc.id && { color: Colors.white, fontWeight: 'bold' }
                                ]}>{acc.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Category Grid */}
                <View style={styles.card}>
                    <Text style={[styles.label, { color: Colors.textMuted }]}>Category</Text>
                    <View style={styles.categoryGrid}>
                        {categories.map((cat) => {
                            const isSelected = category === cat.name;
                            const itemContent = (
                                <>
                                    {cat.isCustom && (
                                        <View style={styles.customActionRow}>
                                            <TouchableOpacity
                                                style={[styles.smallActionBtn, { borderColor: Colors.primary }]}
                                                onPress={(e) => {
                                                    if (e && e.stopPropagation) e.stopPropagation();
                                                    handleEditCategory(cat);
                                                }}
                                            >
                                                <Pencil size={12} color={Colors.primary} strokeWidth={2.5} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.smallActionBtn, { borderColor: Colors.expense }]}
                                                onPress={(e) => {
                                                    if (e && e.stopPropagation) e.stopPropagation();
                                                    handleDeleteCategory(cat);
                                                }}
                                            >
                                                <Trash2 size={12} color={Colors.expense} strokeWidth={2.5} />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    <View style={styles.iconContainer}>
                                        <IconRenderer name={cat.icon} color={isSelected ? cat.color : Colors.textMuted} size={22} />
                                    </View>
                                    <Text
                                        style={[
                                            styles.categoryName,
                                            { color: Colors.textMuted },
                                            isSelected && { color: cat.color, fontWeight: 'bold' }
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {cat.name}
                                    </Text>
                                    {isSelected && (
                                        <View style={[styles.checkBadge, { backgroundColor: cat.color }]}>
                                            <Check color={Colors.white} size={10} />
                                        </View>
                                    )}
                                </>
                            );

                            return (
                                <TouchableOpacity
                                    key={`${cat.name}-${cat.type}`}
                                    style={[
                                        styles.categoryItem,
                                        { backgroundColor: Colors.surface, borderColor: Colors.border },
                                        isSelected && { borderColor: cat.color, backgroundColor: cat.color + '15' }
                                    ]}
                                    onPress={() => setCategory(cat.name)}
                                >
                                    {itemContent}
                                </TouchableOpacity>
                            );
                        })}
                        <TouchableOpacity
                            style={[
                                styles.categoryItem,
                                {
                                    backgroundColor: Colors.surface,
                                    borderColor: Colors.border,
                                    borderStyle: 'dashed'
                                }
                            ]}
                            onPress={handleAddCategory}
                        >
                            <View style={styles.iconContainer}>
                                <PlusIcon color={Colors.textMuted} size={22} />
                            </View>
                            <Text style={[styles.categoryName, { color: Colors.textMuted }]}>New</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Date Selection */}
                <View style={styles.card}>
                    <Text style={[styles.label, { color: Colors.textMuted }]}>Date</Text>
                    {Platform.OS === 'web' ? (
                        <View style={[styles.dateInputContainer, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                            <CalendarIcon color={Colors.textMuted} size={20} />
                            <input
                                type="date"
                                value={new Date(date).toISOString().split('T')[0]}
                                onChange={(e) => setDate(new Date(e.target.value).toISOString())}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: Colors.text,
                                    fontSize: 16,
                                    flex: 1,
                                    marginLeft: 10,
                                    padding: '12px 0',
                                    outline: 'none',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </View>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={[styles.datePickerButton, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <CalendarIcon color={Colors.textMuted} size={20} />
                                <Text style={[styles.datePickerText, { color: Colors.text }]}>
                                    {format(new Date(date), 'dd MMMM yyyy')}
                                </Text>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <DateTimePicker
                                    value={new Date(date)}
                                    mode="date"
                                    display="default"
                                    onChange={onDateChange}
                                />
                            )}
                        </>
                    )}
                </View>

                {/* Note Input */}
                <View style={styles.card}>
                    <Text style={[styles.label, { color: Colors.textMuted }]}>Note</Text>
                    <TextInput
                        style={[styles.noteInput, { backgroundColor: Colors.surface, borderColor: Colors.border, color: Colors.text }]}
                        value={note}
                        onChangeText={setNote}
                        placeholder="What was this for?"
                        placeholderTextColor={Colors.textMuted}
                        multiline
                    />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        { backgroundColor: Colors.primary, shadowColor: Colors.primary },
                        (!amount || !category || isSubmitting) && styles.disabledButton
                    ]}
                    onPress={handleSubmit}
                    disabled={!amount || !category || isSubmitting}
                >
                    <Text style={[styles.submitText, { color: Colors.white }]}>
                        {isSubmitting ? 'Saving...' : 'Save Transaction'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        height: '100%',
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    headerSection: {
        marginBottom: 20,
    },
    typeSelector: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    typeText: {
        fontWeight: '600',
        fontSize: 15,
    },
    card: {
        marginBottom: 20,
    },
    label: {
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '600',
        fontSize: 12,
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderWidth: 1,
    },
    currency: {
        fontSize: 28,
        marginRight: 8,
        fontWeight: '500',
    },
    amountInput: {
        fontSize: 32,
        width: '100%',
        fontWeight: 'bold',
        padding: 0,
        height: 50,
        textAlignVertical: 'center',
    },
    chipScroll: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        minWidth: '45%', // Ensure 2 per row on small screens
        alignItems: 'center',
        margin: 4,
        flexGrow: 1,
    },
    chipText: {
        fontWeight: '500',
        fontSize: 14,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingTop: 8,
    },
    categoryItem: {
        width: '22%',
        marginBottom: 12,
        aspectRatio: 1,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        padding: 4,
        position: 'relative',
        overflow: 'visible', // Ensure buttons don't clip
    },
    categoryName: {
        fontSize: 10,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 4,
    },
    checkBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noteInput: {
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    submitButton: {
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledButton: {
        opacity: 0.5,
        elevation: 0,
        shadowOpacity: 0,
    },
    submitText: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    iconContainer: {
        marginBottom: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 20,
    },
    customActionRow: {
        position: 'absolute',
        top: 4,
        left: 4,
        flexDirection: 'row',
        gap: 4,
        zIndex: 100,
    },
    smallActionBtn: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 4,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
    },
    datePickerText: {
        fontSize: 16,
        fontWeight: '600',
    },
    dateInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
    }
});
