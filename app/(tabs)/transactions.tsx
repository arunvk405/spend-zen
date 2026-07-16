import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView, Pressable, Platform, Modal } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useFinance } from '../../src/context/FinanceContext';
import { useThemeColors, Typography } from '../../src/theme/colors';
import { 
    Search, Trash2, Calendar, ChevronLeft, ChevronRight, Pencil, Info,
    Briefcase, PiggyBank, Gift, TrendingUp, Laptop, Package,
    Utensils, Activity, Home, Car, User, PawPrint, FileText, Film, CreditCard, Wallet, Landmark,
    SlidersHorizontal, X
} from 'lucide-react-native';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../../src/models';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, isSameMonth, isSameYear } from 'date-fns';

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const ITEM_WIDTH = 72; // 64 width + 8 marginRight
const getItemLayout = (data: any, index: number) => ({
    length: ITEM_WIDTH,
    offset: ITEM_WIDTH * index,
    index,
});

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
    const params = useLocalSearchParams<{ category?: string; date?: string; type?: string }>();
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    // Modal temp states
    const [tempCategories, setTempCategories] = useState<string[]>([]);
    const [tempAccounts, setTempAccounts] = useState<string[]>([]);

    const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

    // Month/Year filter state
    const [selectedDate, setSelectedDate] = useState(new Date());
    const monthListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (params.category || params.date || params.type) {
            const hasCategory = typeof params.category === 'string' && params.category.length > 0;
            const hasDate = typeof params.date === 'string' && params.date.length > 0;
            const hasType = typeof params.type === 'string' && params.type.length > 0;

            if (hasCategory || hasDate || hasType) {
                if (hasCategory) {
                    setSelectedCategories([params.category as string]);
                }
                if (hasType) {
                    setFilterType(params.type as 'ALL' | 'INCOME' | 'EXPENSE');
                }
                if (hasDate) {
                    setSelectedDate(new Date(params.date as string));
                }
                // Clear the params from the router so they don't lock the state when tab changes
                router.setParams({ category: '', date: '', type: '' });
            }
        }
    }, [params.category, params.date, params.type]);

    useFocusEffect(
        React.useCallback(() => {
            const timer = setTimeout(() => {
                monthListRef.current?.scrollToIndex({
                    index: selectedDate.getMonth(),
                    animated: true,
                    viewPosition: 0.5,
                });
            }, 150);
            return () => clearTimeout(timer);
        }, [selectedDate])
    );

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const txDate = parseISO(tx.date);
            const matchesDate = isSameMonth(txDate, selectedDate) && isSameYear(txDate, selectedDate);
            const matchesType = filterType === 'ALL' || tx.type === filterType;
            const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(tx.category);
            const matchesAccount = selectedAccounts.length === 0 || selectedAccounts.includes(tx.accountId);

            return matchesDate && matchesType && matchesCategory && matchesAccount;
        });
    }, [transactions, filterType, selectedDate, selectedCategories, selectedAccounts]);

    const categoriesToSelect = useMemo(() => {
        if (filterType === 'INCOME') return INCOME_CATEGORIES;
        if (filterType === 'EXPENSE') return EXPENSE_CATEGORIES;
        
        const combined = [...INCOME_CATEGORIES];
        EXPENSE_CATEGORIES.forEach(exp => {
            if (!combined.some(inc => inc.name === exp.name)) {
                combined.push(exp);
            }
        });
        return combined;
    }, [filterType]);

    const accountsToSelect = useMemo(() => {
        const list = [{ id: 'cash', name: cashAccountName }];
        bankAccounts.forEach(b => list.push({ id: b.id, name: b.bankName }));
        creditCards.forEach(c => list.push({ id: c.id, name: c.cardName }));
        return list;
    }, [bankAccounts, creditCards, cashAccountName]);

    const openModal = () => {
        setTempCategories([...selectedCategories]);
        setTempAccounts([...selectedAccounts]);
        setIsFilterModalOpen(true);
    };

    const handleApply = () => {
        setSelectedCategories([...tempCategories]);
        setSelectedAccounts([...tempAccounts]);
        setIsFilterModalOpen(false);
    };

    const handleReset = () => {
        setTempCategories([]);
        setTempAccounts([]);
    };

    const handleCancel = () => {
        setIsFilterModalOpen(false);
    };

    const toggleTempCategory = (categoryName: string) => {
        if (tempCategories.includes(categoryName)) {
            setTempCategories(tempCategories.filter(c => c !== categoryName));
        } else {
            setTempCategories([...tempCategories, categoryName]);
        }
    };

    const toggleTempAccount = (accountId: string) => {
        if (tempAccounts.includes(accountId)) {
            setTempAccounts(tempAccounts.filter(a => a !== accountId));
        } else {
            setTempAccounts([...tempAccounts, accountId]);
        }
    };

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
                <View style={[styles.cardHeader, { 
                    borderBottomColor: Colors.border + '30',
                    backgroundColor: Colors.isDark ? '#ffffff05' : '#00000003' 
                }]}>
                    <Text style={[styles.txCategory, { color: Colors.text }]}>{item.category}</Text>
                    {item.note ? (
                        <Text style={[styles.txNote, { color: Colors.textMuted }]} numberOfLines={1}>
                            • {item.note}
                        </Text>
                    ) : null}
                </View>
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
            <View style={[styles.header, { backgroundColor: Colors.background, borderBottomColor: Colors.border }]}>
                <View style={styles.yearRow}>
                    <TouchableOpacity onPress={() => changeYear(-1)} style={styles.arrowBtn}>
                        <ChevronLeft color={Colors.textMuted} size={20} />
                    </TouchableOpacity>
                    <Text style={[styles.yearText, { color: Colors.text }]}>{selectedDate.getFullYear()}</Text>
                    <TouchableOpacity onPress={() => changeYear(1)} style={styles.arrowBtn}>
                        <ChevronRight color={Colors.textMuted} size={20} />
                    </TouchableOpacity>
                </View>
                <FlatList
                    ref={monthListRef}
                    data={MONTHS}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.monthScroll}
                    contentContainerStyle={styles.monthContent}
                    keyExtractor={(item) => item}
                    getItemLayout={getItemLayout}
                    onScrollToIndexFailed={(info) => {
                        const promise = new Promise((resolve) => setTimeout(resolve, 50));
                        promise.then(() => {
                            monthListRef.current?.scrollToIndex({
                                index: info.index,
                                animated: true,
                                viewPosition: 0.5,
                            });
                        });
                    }}
                    renderItem={({ item, index }) => {
                        const isSelected = selectedDate.getMonth() === index;
                        return (
                            <HoverCard
                                key={item}
                                style={[
                                    styles.monthChip,
                                    isSelected && { backgroundColor: Colors.primary, borderColor: Colors.primary }
                                ]}
                                onPress={() => selectMonth(index)}
                            >
                                <Text style={[
                                    styles.monthText,
                                    { color: isSelected ? Colors.white : Colors.textMuted }
                                ]}>{item}</Text>
                            </HoverCard>
                        );
                    }}
                />
                <View style={styles.filterHeaderRow}>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        style={styles.activeChipsScroll}
                        contentContainerStyle={styles.activeChipsContent}
                    >
                        {selectedCategories.length === 0 && selectedAccounts.length === 0 ? (
                            <Text style={[styles.noActiveFiltersText, { color: Colors.textMuted }]}>
                                All categories & accounts
                            </Text>
                        ) : (
                            <>
                                {selectedCategories.map(cat => (
                                    <TouchableOpacity 
                                        key={`cat-${cat}`}
                                        style={[styles.activeFilterChip, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '30' }]}
                                        onPress={() => setSelectedCategories(selectedCategories.filter(c => c !== cat))}
                                    >
                                        <Text style={[styles.activeFilterChipText, { color: Colors.primary }]}>{cat}</Text>
                                        <X color={Colors.primary} size={12} style={styles.activeFilterChipIcon} />
                                    </TouchableOpacity>
                                ))}
                                {selectedAccounts.map(accId => {
                                    const accName = getAccountName(accId);
                                    return (
                                        <TouchableOpacity 
                                            key={`acc-${accId}`}
                                            style={[styles.activeFilterChip, { backgroundColor: Colors.income + '15', borderColor: Colors.income + '30' }]}
                                            onPress={() => setSelectedAccounts(selectedAccounts.filter(a => a !== accId))}
                                        >
                                            <Text style={[styles.activeFilterChipText, { color: Colors.income }]}>{accName}</Text>
                                            <X color={Colors.income} size={12} style={styles.activeFilterChipIcon} />
                                        </TouchableOpacity>
                                    );
                                })}
                            </>
                        )}
                    </ScrollView>
                    <TouchableOpacity 
                        style={[styles.filterIconButton, { backgroundColor: Colors.surface, borderColor: Colors.border }]} 
                        onPress={openModal}
                    >
                        <SlidersHorizontal color={Colors.primary} size={20} />
                    </TouchableOpacity>
                </View>
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
                {historyRetention ? (
                    <TouchableOpacity 
                        style={[styles.infoBanner, { backgroundColor: Colors.primary + '10', borderColor: Colors.primary + '20' }]}
                        onPress={() => router.push('/settings')}
                    >
                        <Info size={14} color={Colors.primary} />
                        <Text style={[styles.infoText, { color: Colors.primary }]}>
                            History Policy: Auto-clear older than {historyRetention === '3months' ? '3' : '6'} months. <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>Change in Settings</Text>
                        </Text>
                    </TouchableOpacity>
                ) : null}
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
            
            {/* Modal filter overlay */}
            <Modal
                visible={isFilterModalOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={handleCancel}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                        {/* Modal Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: Colors.border }]}>
                            <Text style={[styles.modalTitle, { color: Colors.text }]}>Filter Transactions</Text>
                            <TouchableOpacity onPress={handleCancel} style={styles.modalCloseButton}>
                                <X color={Colors.textMuted} size={22} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            {/* Categories Section */}
                            <View style={styles.modalSection}>
                                <Text style={[styles.sectionTitle, { color: Colors.text }]}>Categories</Text>
                                <View style={styles.chipsGrid}>
                                    {categoriesToSelect.map(cat => {
                                        const isSelected = tempCategories.includes(cat.name);
                                        return (
                                            <TouchableOpacity
                                                key={`temp-cat-${cat.name}`}
                                                style={[
                                                    styles.modalChip,
                                                    { borderColor: Colors.border, backgroundColor: Colors.background },
                                                    isSelected && { backgroundColor: Colors.primary + '15', borderColor: Colors.primary }
                                                ]}
                                                onPress={() => toggleTempCategory(cat.name)}
                                            >
                                                <Text style={[
                                                    styles.modalChipText,
                                                    { color: Colors.text },
                                                    isSelected && { color: Colors.primary, fontWeight: '700' }
                                                ]}>
                                                    {cat.name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Accounts Section */}
                            <View style={styles.modalSection}>
                                <Text style={[styles.sectionTitle, { color: Colors.text }]}>Accounts / Banks</Text>
                                <View style={styles.chipsGrid}>
                                    {accountsToSelect.map(acc => {
                                        const isSelected = tempAccounts.includes(acc.id);
                                        return (
                                            <TouchableOpacity
                                                key={`temp-acc-${acc.id}`}
                                                style={[
                                                    styles.modalChip,
                                                    { borderColor: Colors.border, backgroundColor: Colors.background },
                                                    isSelected && { backgroundColor: Colors.income + '15', borderColor: Colors.income }
                                                ]}
                                                onPress={() => toggleTempAccount(acc.id)}
                                            >
                                                <Text style={[
                                                    styles.modalChipText,
                                                    { color: Colors.text },
                                                    isSelected && { color: Colors.income, fontWeight: '700' }
                                                ]}>
                                                    {acc.name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        </ScrollView>

                        {/* Modal Footer */}
                        <View style={[styles.modalFooter, { borderTopColor: Colors.border }]}>
                            <TouchableOpacity 
                                style={[styles.modalResetButton, { borderColor: Colors.border }]} 
                                onPress={handleReset}
                            >
                                <Text style={[styles.modalResetButtonText, { color: Colors.textMuted }]}>Reset All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalApplyButton, { backgroundColor: Colors.primary }]} 
                                onPress={handleApply}
                            >
                                <Text style={styles.modalApplyButtonText}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        marginBottom: 10,
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
    },
    monthContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 8,
    },
    monthChip: {
        width: 64,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
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
    // New Filter Styles
    filterHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        marginBottom: 16,
        gap: 8,
    },
    activeChipsScroll: {
        flex: 1,
    },
    activeChipsContent: {
        alignItems: 'center',
        gap: 8,
    },
    noActiveFiltersText: {
        fontSize: 14,
        fontStyle: 'italic',
    },
    activeFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        gap: 4,
    },
    activeFilterChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    activeFilterChipIcon: {
        marginLeft: 2,
    },
    filterIconButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 16,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: '80%',
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalBody: {
        marginVertical: 16,
    },
    modalSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    chipsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    modalChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
    },
    modalChipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    modalResetButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalResetButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    modalApplyButton: {
        flex: 2,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalApplyButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
