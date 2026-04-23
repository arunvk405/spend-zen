import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Pressable, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useThemeColors, Typography } from '../../src/theme/colors';
import { PieChart } from 'react-native-chart-kit';
import { useFinance } from '../../src/context/FinanceContext';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, isSameMonth, isSameYear } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

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

const screenWidth = Dimensions.get('window').width;

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Dynamic ACCOUNT_FILTERS are now generated inside the component

export default function Reports() {
    const Colors = useThemeColors();
    const { transactions, bankAccounts, creditCards, cashAccountName } = useFinance();
    
    const getAccountName = (id: string) => {
        if (id === 'cash') return cashAccountName;
        const bank = bankAccounts.find(b => b.id === id);
        if (bank) return bank.bankName;
        const card = creditCards.find(c => c.id === id);
        if (card) return card.cardName;
        return id;
    };
    const params = useLocalSearchParams();
    const [selectedAccount, setSelectedAccount] = useState((params.accountId as string) || 'all');
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Sync selectedAccount if params change
    React.useEffect(() => {
        if (params.accountId) {
            setSelectedAccount(params.accountId as string);
        }
    }, [params.accountId]);


    const accountFilters = useMemo(() => {
        const filters = [{ id: 'all', label: 'All' }, { id: 'cash', label: cashAccountName }];
        bankAccounts.forEach(b => filters.push({ id: b.id, label: b.bankName }));
        creditCards.forEach(c => filters.push({ id: c.id, label: c.cardName }));
        return filters;
    }, [bankAccounts, creditCards, cashAccountName]);

    const filteredTransactionsByDate = useMemo(() => {
        return transactions.filter(t => {
            const txDate = parseISO(t.date);
            return isSameMonth(txDate, selectedDate) && isSameYear(txDate, selectedDate);
        });
    }, [transactions, selectedDate]);

    const filteredTransactions = useMemo(() => {
        if (selectedAccount === 'all') return filteredTransactionsByDate;
        return filteredTransactionsByDate.filter(t => t.accountId === selectedAccount);
    }, [filteredTransactionsByDate, selectedAccount]);

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

    const chartConfig = {
        backgroundGradientFrom: Colors.surface,
        backgroundGradientTo: Colors.surface,
        color: (opacity = 1) => `rgba(${parseInt(Colors.primary.slice(1, 3), 16)}, ${parseInt(Colors.primary.slice(3, 5), 16)}, ${parseInt(Colors.primary.slice(5, 7), 16)}, ${opacity})`,
        labelColor: (opacity = 1) => Colors.textMuted,
        strokeWidth: 2,
        barPercentage: 0.7,
        useShadowColorFromDataset: false
    };

    // 1. Expense Breakdown by Category
    const categoryData = useMemo(() => {
        const expenses = filteredTransactions.filter(t => t.type === 'EXPENSE');

        const breakdown: Record<string, number> = {};
        expenses.forEach(t => {
            breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
        });

        return Object.keys(breakdown)
            .map((key, index) => ({
                name: key,
                population: breakdown[key],
                color: Colors.charts.pie[index % Colors.charts.pie.length],
                legendFontColor: Colors.textMuted,
                legendFontSize: 12
            }))
            .sort((a, b) => b.population - a.population)
            .slice(0, 5);
    }, [filteredTransactions]);

    // 2. Income by Account
    const incomeByAccountData = useMemo(() => {
        const incomes = filteredTransactions.filter(t => t.type === 'INCOME');
        const breakdown: Record<string, number> = {};
        incomes.forEach(t => {
            const label = getAccountName(t.accountId);
            breakdown[label] = (breakdown[label] || 0) + t.amount;
        });

        return Object.keys(breakdown).map((key, index) => ({
            name: key,
            population: breakdown[key],
            color: index === 0 ? Colors.primary : index === 1 ? Colors.income : Colors.secondary,
            legendFontColor: Colors.textMuted,
            legendFontSize: 12
        })).sort((a, b) => b.population - a.population);
    }, [filteredTransactions]);

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: Colors.background }]}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>

                {/* Date Filter */}
                <View style={styles.yearRow}>
                    <TouchableOpacity onPress={() => changeYear(-1)} style={styles.arrowBtn}>
                        <ChevronLeft color={Colors.textMuted} size={20} />
                    </TouchableOpacity>
                    <Text style={[styles.yearText, { color: Colors.text }]}>{selectedDate.getFullYear()}</Text>
                    <TouchableOpacity onPress={() => changeYear(1)} style={styles.arrowBtn}>
                        <ChevronRight color={Colors.textMuted} size={20} />
                    </TouchableOpacity>
                </View>

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

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterContainer}
                    contentContainerStyle={styles.filterContent}
                >
                    {accountFilters.map(filter => (
                        <HoverCard
                            key={filter.id}
                            style={[
                                styles.filterChip,
                                { backgroundColor: selectedAccount === filter.id ? Colors.primary : Colors.surface }
                            ]}
                            onPress={() => setSelectedAccount(filter.id)}
                        >
                            <Text style={[
                                styles.filterText,
                                { color: selectedAccount === filter.id ? Colors.white : Colors.textMuted }
                            ]}>
                                {filter.label}
                            </Text>
                        </HoverCard>
                    ))}
                </ScrollView>
            </View>

            {/* Income by Account */}
            <HoverCard disabled={true} style={[styles.card, { backgroundColor: Colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 }]}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: Colors.text }]}>Income by Type</Text>
                    <Text style={[styles.cardTag, { color: Colors.primary, backgroundColor: Colors.primary + '15' }]}>Source</Text>
                </View>
                {incomeByAccountData.length > 0 ? (
                    <PieChart
                        data={incomeByAccountData}
                        width={screenWidth - 32}
                        height={200}
                        chartConfig={chartConfig}
                        accessor={"population"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        center={[10, 0]}
                        absolute
                    />
                ) : (
                    <Text style={styles.emptyText}>No income data available.</Text>
                )}
            </HoverCard>

            {/* Expense Breakdown */}
            <HoverCard disabled={true} style={[styles.card, { backgroundColor: Colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 }]}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: Colors.text }]}>Monthly Expenses</Text>
                    <Text style={[styles.cardTag, { color: Colors.expense, backgroundColor: Colors.expense + '15' }]}>Categories</Text>
                </View>
                {categoryData.length > 0 ? (
                    <PieChart
                        data={categoryData}
                        width={screenWidth - 32}
                        height={200}
                        chartConfig={chartConfig}
                        accessor={"population"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        center={[10, 0]}
                        absolute
                    />
                ) : (
                    <Text style={styles.emptyText}>No expenses yet this month.</Text>
                )}
            </HoverCard>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        paddingBottom: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 16,
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
        marginTop: -8,
    },
    monthChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 12,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    monthText: {
        fontSize: 13,
        fontWeight: '600',
    },
    filterContainer: {
        marginBottom: 10,
        paddingTop: 8,
        paddingBottom: 8,
        marginTop: -8,
    },
    filterContent: {
        paddingRight: 20,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
    },
    card: {
        margin: 16,
        marginTop: 8,
        borderRadius: 24,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    cardTag: {
        fontSize: 10,
        fontWeight: '700',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        textTransform: 'uppercase',
    },
    emptyText: {
        textAlign: 'center',
        marginVertical: 30,
        color: '#6c757d',
        fontSize: 14,
    }
});
