import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useFinance } from '../src/context/FinanceContext';
import { useThemeColors, Typography } from '../src/theme/colors';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, ACCOUNTS, TransactionType } from '../src/models';
import { useRouter } from 'expo-router';
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
    Package
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
        default: return <Package color={color} size={size} />;
    }
};

import * as Haptics from 'expo-haptics';

export default function AddTransaction() {
    const Colors = useThemeColors();
    const { addTransaction } = useFinance();
    const router = useRouter();

    const [type, setType] = useState<TransactionType>('EXPENSE');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [accountId, setAccountId] = useState('cash');
    const [note, setNote] = useState('');
    const [date] = useState(new Date().toISOString());

    const categories = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    const handleSubmit = async () => {
        if (!amount || !category) return;

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        await addTransaction({
            amount: parseFloat(amount),
            type,
            category,
            date,
            accountId,
            note,
        });

        router.back();
    };

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/');
        }
    };

    return (
        <View style={[styles.mainContainer, { backgroundColor: Colors.background }]}>
            <View style={[styles.header, { backgroundColor: Colors.background, borderBottomColor: Colors.border }]}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <ArrowLeft color={Colors.text} size={24} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: Colors.text }]}>Add Transaction</Text>
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
                        <Text style={[styles.currency, { color: Colors.textMuted }]}>$</Text>
                        <TextInput
                            style={[styles.amountInput, { color: Colors.text }]}
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
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
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat.name}
                                style={[
                                    styles.categoryItem,
                                    { backgroundColor: Colors.surface, borderColor: Colors.border },
                                    category === cat.name && { borderColor: cat.color, backgroundColor: cat.color + '15' }
                                ]}
                                onPress={() => setCategory(cat.name)}
                            >
                                <View style={styles.iconContainer}>
                                    <IconRenderer name={cat.icon} color={category === cat.name ? cat.color : Colors.textMuted} size={28} />
                                </View>
                                <Text
                                    style={[
                                        styles.categoryName,
                                        { color: Colors.textMuted },
                                        category === cat.name && { color: cat.color, fontWeight: 'bold' }
                                    ]}
                                    numberOfLines={1}
                                >
                                    {cat.name}
                                </Text>
                                {category === cat.name && (
                                    <View style={[styles.checkBadge, { backgroundColor: cat.color }]}>
                                        <Check color={Colors.white} size={12} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
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
                        (!amount || !category) && styles.disabledButton
                    ]}
                    onPress={handleSubmit}
                    disabled={!amount || !category}
                >
                    <Text style={[styles.submitText, { color: Colors.white }]}>Save Transaction</Text>
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
    },
    categoryItem: {
        width: '31%',
        marginBottom: 12,
        aspectRatio: 1,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        padding: 4,
    },
    categoryName: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
    checkBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 20,
        height: 20,
        borderRadius: 10,
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
});
