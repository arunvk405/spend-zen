import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useFinance } from '../src/context/FinanceContext';
import { Colors, Typography } from '../src/theme/colors';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, ACCOUNTS, TransactionType } from '../src/models';
import { useRouter } from 'expo-router';
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

export default function AddTransaction() {
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
        <View style={styles.mainContainer}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <ArrowLeft color={Colors.text} size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Transaction</Text>
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
                    <View style={styles.typeSelector}>
                        {/* ... rest of type selector ... */}
                        <TouchableOpacity
                            style={[styles.typeButton, type === 'EXPENSE' && styles.activeExpense]}
                            onPress={() => { setType('EXPENSE'); setCategory(''); }}
                        >
                            <Text style={[styles.typeText, type === 'EXPENSE' && styles.activeText]}>Expense</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeButton, type === 'INCOME' && styles.activeIncome]}
                            onPress={() => { setType('INCOME'); setCategory(''); }}
                        >
                            <Text style={[styles.typeText, type === 'INCOME' && styles.activeText]}>Income</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Amount Input */}
                <View style={styles.card}>
                    <Text style={styles.label}>Amount</Text>
                    <View style={styles.amountInputContainer}>
                        <Text style={styles.currency}>$</Text>
                        <TextInput
                            style={styles.amountInput}
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
                    <Text style={styles.label}>Account</Text>
                    <View style={styles.chipScroll}>
                        {ACCOUNTS.map((acc) => (
                            <TouchableOpacity
                                key={acc.id}
                                style={[styles.chip, accountId === acc.id && { backgroundColor: acc.color, borderColor: acc.color }]}
                                onPress={() => setAccountId(acc.id)}
                            >
                                <Text style={[styles.chipText, accountId === acc.id && styles.activeChipText]}>{acc.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Category Grid */}
                <View style={styles.card}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.categoryGrid}>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat.name}
                                style={[
                                    styles.categoryItem,
                                    category === cat.name && { borderColor: cat.color, backgroundColor: cat.color + '15' }
                                ]}
                                onPress={() => setCategory(cat.name)}
                            >
                                <View style={styles.iconContainer}>
                                    <IconRenderer name={cat.icon} color={category === cat.name ? cat.color : Colors.textMuted} size={28} />
                                </View>
                                <Text
                                    style={[styles.categoryName, category === cat.name && { color: cat.color, fontWeight: 'bold' }]}
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
                    <Text style={styles.label}>Note</Text>
                    <TextInput
                        style={styles.noteInput}
                        value={note}
                        onChangeText={setNote}
                        placeholder="What was this for?"
                        placeholderTextColor={Colors.textMuted}
                        multiline
                    />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitButton, (!amount || !category) && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={!amount || !category}
                >
                    <Text style={styles.submitText}>Save Transaction</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        // On web, ensuring this container takes height is crucial
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
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    activeExpense: { backgroundColor: Colors.expense },
    activeIncome: { backgroundColor: Colors.income },
    typeText: {
        color: Colors.textMuted,
        fontWeight: '600',
        fontSize: 15,
    },
    activeText: { color: Colors.white, fontWeight: 'bold' },

    card: {
        marginBottom: 20,
    },
    label: {
        ...Typography.caption,
        color: Colors.textMuted,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '600',
        fontSize: 12,
    },

    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    currency: {
        fontSize: 28,
        color: Colors.textMuted,
        marginRight: 8,
        fontWeight: '500',
    },
    amountInput: {
        fontSize: 32,
        color: Colors.text,
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
        backgroundColor: Colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: Colors.border,
        minWidth: '45%', // Ensure 2 per row on small screens
        alignItems: 'center',
        margin: 4,
        flexGrow: 1,
    },
    chipText: {
        color: Colors.text,
        fontWeight: '500',
        fontSize: 14,
    },
    activeChipText: {
        color: Colors.white,
        fontWeight: 'bold',
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
        backgroundColor: Colors.surface,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 4, // Reduce padding slightly
    },
    categoryIcon: {
        fontSize: 28,
        marginBottom: 8,
    },
    categoryName: {
        fontSize: 12,
        color: Colors.textMuted,
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
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        color: Colors.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        minHeight: 100,
        textAlignVertical: 'top',
    },

    submitButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: Colors.primary,
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
        color: Colors.white,
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
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    section: {
        marginBottom: 20,
    },
});
