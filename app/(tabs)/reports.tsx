import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Pressable, Platform, Animated } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useThemeColors, Typography } from '../../src/theme/colors';
import { PieChart } from 'react-native-chart-kit';
import InteractiveDonut from '../../src/components/InteractiveDonut';
import { useFinance } from '../../src/context/FinanceContext';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, isSameMonth, isSameYear, format } from 'date-fns';
import { ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle, Wallet, Info, Tag } from 'lucide-react-native';

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
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function Reports() {
    const Colors = useThemeColors();
    const { transactions, bankAccounts, creditCards, cashAccountName } = useFinance();
    
    const [selectedExpenseCat, setSelectedExpenseCat] = useState<string | null>(null);
    const [selectedIncomeCat, setSelectedIncomeCat] = useState<string | null>(null);

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

    const stats = useMemo(() => {
        let income = 0;
        let expense = 0;
        filteredTransactions.forEach(t => {
            if (t.type === 'INCOME') income += t.amount;
            else expense += t.amount;
        });
        return { income, expense, net: income - expense };
    }, [filteredTransactions]);

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

    const expenseBreakdown = useMemo(() => {
        const expenses = filteredTransactions.filter(t => t.type === 'EXPENSE');
        const breakdown: Record<string, { amount: number, color: string }> = {};
        
        expenses.forEach(t => {
            if (!breakdown[t.category]) {
                breakdown[t.category] = { amount: 0, color: Colors.charts.pie[Object.keys(breakdown).length % Colors.charts.pie.length] };
            }
            breakdown[t.category].amount += t.amount;
        });

        const total = Object.values(breakdown).reduce((sum, item) => sum + item.amount, 0);

        return Object.keys(breakdown)
            .map((key) => ({
                name: key,
                amount: breakdown[key].amount,
                color: breakdown[key].color,
                percent: total > 0 ? (breakdown[key].amount / total) * 100 : 0
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [filteredTransactions, Colors]);

    const incomeBreakdown = useMemo(() => {
        const incomes = filteredTransactions.filter(t => t.type === 'INCOME');
        const breakdown: Record<string, { amount: number, color: string }> = {};
        
        incomes.forEach(t => {
            const label = getAccountName(t.accountId);
            if (!breakdown[label]) {
                breakdown[label] = { amount: 0, color: Object.keys(breakdown).length === 0 ? Colors.primary : Colors.income };
            }
            breakdown[label].amount += t.amount;
        });

        const total = Object.values(breakdown).reduce((sum, item) => sum + item.amount, 0);

        return Object.keys(breakdown)
            .map((key) => ({
                name: key,
                amount: breakdown[key].amount,
                color: breakdown[key].color,
                percent: total > 0 ? (breakdown[key].amount / total) * 100 : 0
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [filteredTransactions, Colors]);

    const activeExpenseData = expenseBreakdown.find(b => b.name === selectedExpenseCat) || expenseBreakdown[0];
    const activeIncomeData = incomeBreakdown.find(b => b.name === selectedIncomeCat) || incomeBreakdown[0];

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: Colors.background }]}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
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

            {/* Summary Grid */}
            <View style={styles.summaryGrid}>
                <View style={[styles.summaryItem, { backgroundColor: Colors.surface }]}>
                    <ArrowUpCircle color={Colors.income} size={20} />
                    <Text style={[styles.summaryLabel, { color: Colors.textMuted }]}>Income</Text>
                    <Text style={[styles.summaryValue, { color: Colors.income }]}>₹{stats.income.toLocaleString()}</Text>
                </View>
                <View style={[styles.summaryItem, { backgroundColor: Colors.surface }]}>
                    <ArrowDownCircle color={Colors.expense} size={20} />
                    <Text style={[styles.summaryLabel, { color: Colors.textMuted }]}>Expense</Text>
                    <Text style={[styles.summaryValue, { color: Colors.expense }]}>₹{stats.expense.toLocaleString()}</Text>
                </View>
                <View style={[styles.summaryItem, { backgroundColor: Colors.surface }]}>
                    <Wallet color={Colors.primary} size={20} />
                    <Text style={[styles.summaryLabel, { color: Colors.textMuted }]}>Savings</Text>
                    <Text style={[styles.summaryValue, { color: stats.net >= 0 ? Colors.primary : Colors.expense }]}>₹{stats.net.toLocaleString()}</Text>
                </View>
            </View>

            {/* Context-Aware Financial Mindset Recommendation */}
            <View style={{
                backgroundColor: Colors.surface,
                borderRadius: 20,
                padding: 16,
                marginHorizontal: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: Colors.border,
                borderLeftWidth: 4,
                borderLeftColor: stats.net >= 0 ? Colors.income : Colors.expense,
                flexDirection: 'row',
                gap: 12,
                alignItems: 'center'
            }}>
                <View style={{
                    backgroundColor: (stats.net >= 0 ? Colors.income : Colors.expense) + '15',
                    padding: 10,
                    borderRadius: 12,
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    {stats.net >= 0 ? (
                        <ArrowUpCircle color={Colors.income} size={22} />
                    ) : (
                        <ArrowDownCircle color={Colors.expense} size={22} />
                    )}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{
                        color: Colors.text,
                        fontSize: 13,
                        fontWeight: '600',
                        lineHeight: 18
                    }}>
                        {stats.net >= 0 ? (
                            `Great job! You saved ₹${stats.net.toLocaleString()} this month. Consider transferring this to an investment or emergency fund to build long-term security!`
                        ) : (
                            `You're in the red by ₹${Math.abs(stats.net).toLocaleString()} this month. Reviewing your subscriptions or scaling back on dining out could bring you right back on track!`
                        )}
                    </Text>
                    <Text style={{
                        color: Colors.textMuted,
                        fontSize: 10,
                        fontWeight: '700',
                        marginTop: 4,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5
                    }}>
                        {stats.net >= 0 ? "Savings Motivation" : "Optimization Advice"}
                    </Text>
                </View>
            </View>

            {/* Expense Breakdown */}
            <HoverCard disabled={true} style={[styles.card, { backgroundColor: Colors.surface }]}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={[styles.cardTitle, { color: Colors.text }]}>Expense Breakdown</Text>
                        <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2 }}>{MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}</Text>
                    </View>
                    <Tag size={16} color={Colors.expense} />
                </View>
                
                {expenseBreakdown.length > 0 ? (
                    <>
                        <View style={styles.chartWrapper}>
                            <InteractiveDonut 
                                data={expenseBreakdown}
                                size={screenWidth - 64}
                                innerRadius={70}
                                onSelect={setSelectedExpenseCat as any}
                                selectedItem={expenseBreakdown.find(b => b.name === selectedExpenseCat) || null}
                                colors={Colors}
                            />
                        </View>

                        <View style={styles.breakdownList}>
                            {expenseBreakdown.map((item) => (
                                <TouchableOpacity 
                                    key={item.name} 
                                    style={[
                                        styles.breakdownItem, 
                                        selectedExpenseCat === item.name && { backgroundColor: item.color + '10', borderRadius: 12, padding: 8, marginHorizontal: -8 }
                                    ]}
                                    onPress={() => setSelectedExpenseCat(item.name === selectedExpenseCat ? null : item.name)}
                                >
                                    <View style={styles.itemHeader}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                                            <Text style={[styles.itemName, { color: Colors.text }]}>{item.name}</Text>
                                        </View>
                                        <Text style={[styles.itemAmount, { color: Colors.text }]}>₹{item.amount.toLocaleString()}</Text>
                                    </View>
                                    <View style={[styles.progressBg, { backgroundColor: Colors.border + '30' }]}>
                                        <View style={[styles.progressFill, { width: `${item.percent}%`, backgroundColor: item.color }]} />
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 }}>
                                        <Text style={styles.itemPercent}>{item.percent.toFixed(1)}%</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Info size={40} color={Colors.textMuted} />
                        <Text style={styles.emptyText}>No expenses recorded for this period.</Text>
                    </View>
                )}
            </HoverCard>

            {/* Income Sources */}
            <HoverCard disabled={true} style={[styles.card, { backgroundColor: Colors.surface }]}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={[styles.cardTitle, { color: Colors.text }]}>Income Sources</Text>
                        <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2 }}>{MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}</Text>
                    </View>
                    <ArrowUpCircle size={16} color={Colors.income} />
                </View>
                
                {incomeBreakdown.length > 0 ? (
                    <>
                        <View style={styles.chartWrapper}>
                            <InteractiveDonut 
                                data={incomeBreakdown}
                                size={screenWidth - 64}
                                innerRadius={70}
                                onSelect={setSelectedIncomeCat as any}
                                selectedItem={incomeBreakdown.find(b => b.name === selectedIncomeCat) || null}
                                colors={Colors}
                            />
                        </View>

                        <View style={styles.breakdownList}>
                            {incomeBreakdown.map((item) => (
                                <TouchableOpacity 
                                    key={item.name} 
                                    style={[
                                        styles.breakdownItem,
                                        selectedIncomeCat === item.name && { backgroundColor: item.color + '10', borderRadius: 12, padding: 8, marginHorizontal: -8 }
                                    ]}
                                    onPress={() => setSelectedIncomeCat(item.name === selectedIncomeCat ? null : item.name)}
                                >
                                    <View style={styles.itemHeader}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                                            <Text style={[styles.itemName, { color: Colors.text }]}>{item.name}</Text>
                                        </View>
                                        <Text style={[styles.itemAmount, { color: Colors.text }]}>₹{item.amount.toLocaleString()}</Text>
                                    </View>
                                    <View style={[styles.progressBg, { backgroundColor: Colors.border + '30' }]}>
                                        <View style={[styles.progressFill, { width: `${item.percent}%`, backgroundColor: item.color }]} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Info size={40} color={Colors.textMuted} />
                        <Text style={styles.emptyText}>No income recorded for this period.</Text>
                    </View>
                )}
            </HoverCard>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 20, paddingBottom: 10 },
    yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    yearText: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 20 },
    arrowBtn: { padding: 4 },
    monthScroll: { marginBottom: 16, marginHorizontal: -20, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
    monthChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
    monthText: { fontSize: 14, fontWeight: '600' },
    filterContainer: { marginBottom: 10, paddingTop: 8, paddingBottom: 8 },
    filterContent: { paddingRight: 20 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    filterText: { fontSize: 14, fontWeight: '600' },
    summaryGrid: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 16 },
    summaryItem: { flex: 1, padding: 12, borderRadius: 20, alignItems: 'center', gap: 4, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
    summaryLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
    summaryValue: { fontSize: 14, fontWeight: 'bold' },
    card: { margin: 16, marginTop: 8, borderRadius: 24, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 5 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    cardTitle: { fontSize: 18, fontWeight: 'bold' },
    chartWrapper: { alignItems: 'center', justifyContent: 'center', marginVertical: 20, minHeight: 260 },
    breakdownList: { marginTop: 10, gap: 12 },
    breakdownItem: { paddingVertical: 4 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    colorIndicator: { width: 10, height: 10, borderRadius: 5 },
    itemName: { fontSize: 14, fontWeight: '600' },
    itemAmount: { fontSize: 14, fontWeight: '700' },
    itemPercent: { fontSize: 11, color: '#6c757d' },
    progressBg: { height: 6, borderRadius: 3, width: '100%', overflow: 'hidden', marginTop: 4 },
    progressFill: { height: 6, borderRadius: 3 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
    emptyText: { textAlign: 'center', color: '#6c757d', fontSize: 14 },
});


