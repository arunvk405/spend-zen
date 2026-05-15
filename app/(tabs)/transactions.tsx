import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useFinance } from '../../src/context/FinanceContext';
import { useThemeColors, Typography } from '../../src/theme/colors';
import { 
    Search, Trash2, Calendar, ChevronLeft, ChevronRight, Pencil, Info,
    Briefcase, PiggyBank, Gift, TrendingUp, Laptop, Package,
    Utensils, Activity, Home, Car, User, PawPrint, FileText, Film, CreditCard, Wallet, Landmark
} from 'lucide-react-native';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../../src/models';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, isSameMonth, isSameYear } from 'date-fns';

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const HoverCard = ({ children, style, onPress, disabled = false }: any) => {
    const [isHovered, setIsHovered] = useState(false);
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            onHoverIn={() => setIsHovered(true)}
            onHoverOut={() => setIsHovered(false)}
            style={({ pressed }) => [
                style,
                isHovered ? { shadowOpacity: 0.12, shadowRadius: 16, elevation: 8, transform: [{ translateY: -4 }] } : undefined,
                pressed ? { transform: [{ scale: 0.98 }] } : undefined,
                Platform.OS === 'web' ? { transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' } : undefined
            ] as any}
        >
            {children}
        </Pressable>
    );
};

const IconRenderer = ({ name, color, size = 20 }: { name: string, color: string, size?: number }) => {
    switch (name) {
        case 'briefcase': return <Briefcase color={color} size={size} />;
        case 'piggy-bank': return <PiggyBank color={color} size={size} />;
        case 'gift': return <Gift color={color} size={size} />;
        case 'trending-up': return <TrendingUp color={color} size={size} />;
        case 'laptop': return <Laptop color={color} size={size} />;
        case 'utensils': return <Utensils color={color} size={size} />;
        case 'car': return <Car color={color} size={size} />;
        case 'home': return <Home color={color} size={size} />;
        case 'user': return <User color={color} size={size} />;
        case 'paw-print': return <PawPrint color={color} size={size} />;
        case 'film': return <Film color={color} size={size} />;
        case 'file-text': return <FileText color={color} size={size} />;
        case 'wallet': return <Wallet color={color} size={size} />;
        case 'landmark': return <Landmark color={color} size={size} />;
        case 'credit-card': return <CreditCard color={color} size={size} />;
        case 'cross': return <Activity color={color} size={size} />;
        case 'package': return <Package color={color} size={size} />;
        default: return <Package color={color} size={size} />;
    }
};

export default function TransactionsHistory() {
    const Colors = useThemeColors();
    const router = useRouter();
    const { transactions, deleteTransaction, bankAccounts, creditCards, cashAccountName, historyRetention } = useFinance();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

    // Month/Year filter state
    const [selectedDate, setSelectedDate] = useState(new Date());

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const txDate = parseISO(tx.date);
            const matchesDate = isSameMonth(txDate, selectedDate) && isSameYear(txDate, selectedDate);

            const matchesSearch = tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (tx.note && tx.note.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesType = filterType === 'ALL' || tx.type === filterType;

            return matchesDate && matchesSearch && matchesType;
        });
    }, [transactions, searchQuery, filterType, selectedDate]);

    const changeYear = (delta: number) => {
        const newDate = new Date(selectedDate);
        newDate.setFullYear(selectedDate.getFullYear() + delta);
        setSelectedDate(newDate);
    };

    const selectMonth = (index: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(index);
        setSelectedDate(newDate);
    };

    const handleDelete = async (item: any) => {
        if (Platform.OS === 'web') {
            if (window.confirm(`Are you sure you want to delete this ${item.type.toLowerCase()} transaction of ₹${item.amount}?`)) {
                try {
                    await deleteTransaction(item.id);
                } catch (error) {
                    window.alert('Failed to delete transaction');
                }
            }
        } else {
            const { Alert } = require('react-native');
            Alert.alert(
                'Delete Transaction',
                `Are you sure you want to delete this ${item.type.toLowerCase()} transaction of ₹${item.amount}?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: async () => {
                        try {
                            await deleteTransaction(item.id);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete transaction');
                        }
                    }},
                ]
            );
        }
    };

    const getAccountName = (id: string) => {
        if (id === 'cash') return cashAccountName;
        const bank = bankAccounts.find(b => b.id === id);
        if (bank) return bank.bankName;
        const card = creditCards.find(c => c.id === id);
        if (card) return card.cardName;
        return id;
    };

    const allCategories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

    const renderItem = ({ item }: { item: any }) => {
        const categoryData = allCategories.find(c => c.name === item.category && c.type === item.type) || 
                           allCategories.find(c => c.name === item.category) ||
                           { icon: 'package', color: Colors.textMuted };

        return (
            <View style={[styles.transactionItem, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                {/* Header Row: Category and Note */}
                <View style={[styles.cardHeader, { 
                    borderBottomColor: Colors.border + '30',
                    backgroundColor: Colors.isDark ? '#ffffff05' : '#00000003' 
                }]}>
                    <Text style={[styles.txCategory, { color: Colors.text }]}>{item.category}</Text>
                    {item.note && (
                        <Text style={[styles.txNote, { color: Colors.textMuted }]} numberOfLines={1}>
                            • {item.note}
                        </Text>
                    )}
                </View>

                {/* Body Row: Details and Actions */}
                <View style={styles.cardBody}>
                    <View style={[styles.dateBlock, { borderRightColor: Colors.border }]}>
                        <Text style={[styles.dateDay, { color: Colors.text }]}>{format(new Date(item.date), 'dd')}</Text>
                        <Text style={[styles.dateMonth, { color: Colors.textMuted }]}>{format(new Date(item.date), 'MMM')}</Text>
                    </View>

                    <View style={styles.iconContainer}>
                        <View style={[styles.iconCircle, { backgroundColor: categoryData.color + '15' }]}>
                            <IconRenderer name={categoryData.icon} color={categoryData.color} size={22} />
                        </View>
                    </View>

                    <View style={styles.amountBlock}>
                        <Text style={[
                            styles.txAmount,
                            { color: item.type === 'INCOME' ? Colors.income : Colors.expense }
                        ]}>
                            {item.type === 'INCOME' ? '+' : '-'}₹{item.amount.toLocaleString()}
                        </Text>
                        <Text style={[styles.accountId, { color: Colors.textMuted }]}>{getAccountName(item.accountId)}</Text>
                    </View>

                    <View style={styles.actionBlock}>
                        <TouchableOpacity
                            style={[styles.editButton, { borderColor: Colors.border, backgroundColor: Colors.surface }]}
                            onPress={() => router.push({ pathname: '/add', params: { id: item.id } })}
                        >
                            <Pencil color={Colors.primary} size={16} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.deleteButton, { borderColor: Colors.border, backgroundColor: Colors.surface }]}
                            onPress={() => handleDelete(item)}
                        >
                            <Trash2 color={Colors.expense} size={16} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: Colors.background }]}>
            {/* Search and Date Filter */}
            <View style={[styles.header, { backgroundColor: Colors.background, borderBottomColor: Colors.border }]}>

                {/* Year Selector */}
                <View style={styles.yearRow}>
                    <TouchableOpacity onPress={() => changeYear(-1)} style={styles.arrowBtn}>
                        <ChevronLeft color={Colors.textMuted} size={20} />
                    </TouchableOpacity>
                    <Text style={[styles.yearText, { color: Colors.text }]}>{selectedDate.getFullYear()}</Text>
                    <TouchableOpacity onPress={() => changeYear(1)} style={styles.arrowBtn}>
                        <ChevronRight color={Colors.textMuted} size={20} />
                    </TouchableOpacity>
                </View>

                {/* Month Selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
                    {MONTHS.map((month, index) => {
                        const isSelected = selectedDate.getMonth() === index;
                        return (
                            <HoverCard
                                key={month}
                                style={[
                                    styles.monthChip,
                                    isSelected && { backgroundColor: Colors.primary, borderColor: Colors.primary }
                                ]}
                                onPress={() => selectMonth(index)}
                            >
                                <Text style={[
                                    styles.monthText,
                                    { color: isSelected ? Colors.white : Colors.textMuted }
                                ]}>{month}</Text>
                            </HoverCard>
                        );
                    })}
                </ScrollView>

                {/* Search Bar */}
                <View style={[styles.searchBar, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <Search color={Colors.textMuted} size={18} />
                    <TextInput
                        style={[styles.searchInput, { color: Colors.text }]}
                        placeholder="Search categories or notes..."
                        placeholderTextColor={Colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Type Filter */}
                <View style={styles.filterRow}>
                    {['ALL', 'INCOME', 'EXPENSE'].map((t) => (
                        <TouchableOpacity
                            key={t}
                            style={[
                                styles.filterChip,
                                { backgroundColor: Colors.surface, borderColor: Colors.border },
                                filterType === t && { backgroundColor: Colors.primary, borderColor: Colors.primary }
                            ]}
                            onPress={() => setFilterType(t as any)}
                        >
                            <Text style={[
                                styles.filterText,
                                { color: Colors.textMuted },
                                filterType === t && { color: Colors.white }
                            ]}>
                                {t.charAt(0) + t.slice(1).toLowerCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {historyRetention && (
                    <TouchableOpacity 
                        style={[styles.infoBanner, { backgroundColor: Colors.primary + '10', borderColor: Colors.primary + '20' }]}
                        onPress={() => router.push('/settings')}
                    >
                        <Info size={14} color={Colors.primary} />
                        <Text style={[styles.infoText, { color: Colors.primary }]}>
                            History Policy: Auto-clear older than {historyRetention === '3months' ? '3' : '6'} months. <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>Change in Settings</Text>
                        </Text>
                    </TouchableOpacity>
                )}

            </View>

            <FlatList
                data={filteredTransactions}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, { color: Colors.textMuted }]}>No matching transactions found.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
    },
    yearRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    yearText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginHorizontal: 20,
    },
    arrowBtn: {
        padding: 4,
    },
    monthScroll: {
        marginBottom: 16,
        marginHorizontal: -20,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 8,
    },
    monthChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    monthText: {
        fontSize: 14,
        fontWeight: '600',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 44,
        marginBottom: 16,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        gap: 8,
    },
    infoText: {
        fontSize: 12,
        fontWeight: '500',
        flex: 1,
    },

    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterText: {
        fontWeight: '600',
    },
    listContent: {
        padding: 20,
        paddingBottom: 100, // Space for tab bar
    },
    transactionItem: {
        padding: 0, // Reset padding as internal views handle it
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        overflow: 'hidden', // Ensure header background doesn't bleed
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        gap: 8,
    },
    cardBody: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    actionBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 'auto', // Push to the right
    },
    dateBlock: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingRight: 16,
        borderRightWidth: 1,
        width: 55,
    },
    iconContainer: {
        marginHorizontal: 16,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    txDetails: {
        flex: 1,
        paddingHorizontal: 12,
    },
    dateDay: {
        fontSize: 20,
        fontWeight: '600',
        lineHeight: 22,
    },
    dateMonth: {
        fontSize: 12,
        fontWeight: '400',
        textTransform: 'uppercase',
    },
    txCategory: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    txNote: {
        fontSize: 12,
        marginTop: 2,
    },
    amountBlock: {
        alignItems: 'flex-start',
        flex: 1,
    },
    txAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    accountId: {
        fontSize: 12,
        marginTop: 2,
        textTransform: 'capitalize',
    },
    deleteButton: {
        marginLeft: 8,
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    editButton: {
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
    },
});
