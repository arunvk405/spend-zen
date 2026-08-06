import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Pressable, Platform, Animated, FlatList } from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';

import { useThemeColors, Typography } from '../../src/theme/colors';
import { PieChart } from 'react-native-chart-kit';
import InteractiveDonut from '../../src/components/InteractiveDonut';
import { useFinance } from '../../src/context/FinanceContext';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, isSameMonth, isSameYear, format, subMonths, getDaysInMonth, getDate, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle, Wallet, Info, Tag, TrendingUp, TrendingDown, Activity, Zap, Award, Target, Calendar, ShoppingBag } from 'lucide-react-native';

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

const ITEM_WIDTH = 72; // 64 width + 8 marginRight
const getItemLayout = (data: any, index: number) => ({
    length: ITEM_WIDTH,
    offset: ITEM_WIDTH * index,
    index,
});

export default function Reports() {
    const Colors = useThemeColors();
    const router = useRouter();
    const { transactions, bankAccounts, creditCards, cashAccountName, categoryBudgets } = useFinance();
    
    const [selectedExpenseCat, setSelectedExpenseCat] = useState<string | null>(null);
    const [selectedIncomeCat, setSelectedIncomeCat] = useState<string | null>(null);
    const [selectedDayInfo, setSelectedDayInfo] = useState<{ day: number; amount: number } | null>(null);

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

    const navigateToHistory = (item: string | { name: string; accountId?: string }, type: 'EXPENSE' | 'INCOME') => {
        const itemName = typeof item === 'string' ? item : item.name;
        const accountId = typeof item === 'object' ? item.accountId : undefined;

        if (type === 'INCOME' && accountId) {
            router.push({
                pathname: '/transactions',
                params: {
                    accountId,
                    type,
                    date: selectedDate.toISOString()
                }
            });
        } else {
            router.push({
                pathname: '/transactions',
                params: {
                    category: itemName,
                    type,
                    date: selectedDate.toISOString()
                }
            });
        }
    };
    const monthListRef = useRef<FlatList>(null);

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

    // Sync selectedAccount if params change
    React.useEffect(() => {
        if (params.accountId) {
            setSelectedAccount(params.accountId as string);
            router.setParams({ accountId: '' });
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
        return filteredTransactionsByDate.filter(t => t.accountId === selectedAccount || (t.type === 'TRANSFER' && t.toAccountId === selectedAccount));
    }, [filteredTransactionsByDate, selectedAccount]);

    const stats = useMemo(() => {
        let income = 0;
        let expense = 0;
        filteredTransactions.forEach(t => {
            if (t.category === 'Credit Card Payment') return;

            if (selectedAccount === 'all') {
                // For ALL accounts view: ignore self transfers completely to keep overall totals untouched
                if (t.type === 'TRANSFER' || t.category === 'Self Transfer') return;

                if (t.type === 'INCOME') income += Number(t.amount);
                else if (t.type === 'EXPENSE') expense += Number(t.amount);
            } else {
                // For a SPECIFIC bank account: calculate inflows & outflows for this bank
                if (t.type === 'INCOME' || (t.type === 'TRANSFER' && t.toAccountId === selectedAccount)) {
                    income += Number(t.amount);
                } else if (t.type === 'EXPENSE' || (t.type === 'TRANSFER' && t.accountId === selectedAccount)) {
                    expense += Number(t.amount);
                }
            }
        });
        return { income, expense, net: income - expense };
    }, [filteredTransactions, selectedAccount]);

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
        const expenses = filteredTransactions.filter(t => {
            if (t.category === 'Credit Card Payment') return false;
            if (selectedAccount === 'all') {
                return t.type === 'EXPENSE';
            } else {
                return t.type === 'EXPENSE' || (t.type === 'TRANSFER' && t.accountId === selectedAccount);
            }
        });

        const breakdown: Record<string, { amount: number, color: string }> = {};
        
        expenses.forEach(t => {
            const catName = (t.type === 'TRANSFER' || t.category === 'Self Transfer') ? 'Self Transfer (Out)' : t.category;
            if (!breakdown[catName]) {
                const isTransferCat = catName.includes('Self Transfer');
                breakdown[catName] = {
                    amount: 0,
                    color: isTransferCat ? Colors.primary : Colors.charts.pie[Object.keys(breakdown).length % Colors.charts.pie.length]
                };
            }
            breakdown[catName].amount += Number(t.amount);
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
    }, [filteredTransactions, selectedAccount, Colors]);

    const incomeBreakdown = useMemo(() => {
        const incomes = filteredTransactions.filter(t => {
            if (t.category === 'Credit Card Payment') return false;
            if (selectedAccount === 'all') {
                return t.type === 'INCOME';
            } else {
                return t.type === 'INCOME' || (t.type === 'TRANSFER' && t.toAccountId === selectedAccount);
            }
        });

        const breakdown: Record<string, { accountId?: string; amount: number; color: string }> = {};
        
        incomes.forEach(t => {
            let label = '';
            let accountId: string | undefined = undefined;

            if (selectedAccount === 'all') {
                label = getAccountName(t.accountId);
                accountId = t.accountId;
            } else {
                if (t.type === 'TRANSFER' || t.category === 'Self Transfer') {
                    label = `Self Transfer (From ${getAccountName(t.accountId)})`;
                } else {
                    label = t.category;
                }
                accountId = t.accountId;
            }

            if (!breakdown[label]) {
                breakdown[label] = {
                    accountId,
                    amount: 0,
                    color: label.includes('Self Transfer') ? Colors.primary : (Object.keys(breakdown).length === 0 ? Colors.primary : Colors.income)
                };
            }
            breakdown[label].amount += Number(t.amount);
        });

        const total = Object.values(breakdown).reduce((sum, item) => sum + item.amount, 0);

        return Object.keys(breakdown)
            .map((key) => ({
                name: key,
                accountId: breakdown[key].accountId,
                amount: breakdown[key].amount,
                color: breakdown[key].color,
                percent: total > 0 ? (breakdown[key].amount / total) * 100 : 0
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [filteredTransactions, selectedAccount, Colors, cashAccountName, bankAccounts, creditCards]);

    const previousMonthStats = useMemo(() => {
        const prevDate = subMonths(selectedDate, 1);
        const prevTxns = transactions.filter(t => {
            const txDate = parseISO(t.date);
            return isSameMonth(txDate, prevDate) && isSameYear(txDate, prevDate);
        });

        const filteredPrev = selectedAccount === 'all'
            ? prevTxns
            : prevTxns.filter(t => t.accountId === selectedAccount || (t.type === 'TRANSFER' && t.toAccountId === selectedAccount));

        let income = 0;
        let expense = 0;

        filteredPrev.forEach(t => {
            if (t.category === 'Credit Card Payment') return;
            if (selectedAccount === 'all') {
                if (t.type === 'TRANSFER' || t.category === 'Self Transfer') return;
                if (t.type === 'INCOME') income += Number(t.amount);
                else if (t.type === 'EXPENSE') expense += Number(t.amount);
            } else {
                if (t.type === 'INCOME' || (t.type === 'TRANSFER' && t.toAccountId === selectedAccount)) {
                    income += Number(t.amount);
                } else if (t.type === 'EXPENSE' || (t.type === 'TRANSFER' && t.accountId === selectedAccount)) {
                    expense += Number(t.amount);
                }
            }
        });

        return { income, expense };
    }, [transactions, selectedDate, selectedAccount]);

    const dailySpendingData = useMemo(() => {
        const daysInMonth = getDaysInMonth(selectedDate);
        const dailyTotals = new Array(daysInMonth).fill(0);

        filteredTransactions.forEach(t => {
            if (t.category === 'Credit Card Payment') return;
            const isExpenseItem = selectedAccount === 'all'
                ? (t.type === 'EXPENSE' && t.category !== 'Self Transfer')
                : (t.type === 'EXPENSE' || (t.type === 'TRANSFER' && t.accountId === selectedAccount));

            if (isExpenseItem) {
                const dayNum = getDate(parseISO(t.date));
                if (dayNum >= 1 && dayNum <= daysInMonth) {
                    dailyTotals[dayNum - 1] += Number(t.amount);
                }
            }
        });

        let maxSpending = 0;
        let peakDay = 0;
        dailyTotals.forEach((amt, idx) => {
            if (amt > maxSpending) {
                maxSpending = amt;
                peakDay = idx + 1;
            }
        });

        const activeDaysCount = dailyTotals.filter(a => a > 0).length || 1;
        const avgDaily = Math.round(stats.expense / activeDaysCount);

        return { dailyTotals, maxSpending, peakDay, avgDaily, daysInMonth };
    }, [filteredTransactions, selectedAccount, selectedDate, stats.expense]);

    const financialHealth = useMemo(() => {
        if (stats.income <= 0) return { label: 'No Income Recorded', rate: 0, color: Colors.textMuted };
        const rate = (stats.net / stats.income) * 100;
        if (rate >= 30) return { label: 'Excellent Health 🌟', rate: Math.round(rate), color: Colors.income };
        if (rate >= 10) return { label: 'Good Savings Pace 🚀', rate: Math.round(rate), color: Colors.primary };
        if (rate >= 0) return { label: 'Tight Budget Warning ⚠️', rate: Math.round(rate), color: '#F59E0B' };
        return { label: 'Deficit Warning 🚨', rate: Math.round(rate), color: Colors.expense };
    }, [stats, Colors]);

    const expDiffPct = useMemo(() => {
        if (previousMonthStats.expense <= 0) return 0;
        const diff = ((stats.expense - previousMonthStats.expense) / previousMonthStats.expense) * 100;
        return Math.round(diff * 10) / 10;
    }, [stats.expense, previousMonthStats.expense]);

    const topPurchases = useMemo(() => {
        const expensesOnly = filteredTransactions.filter(t => {
            if (t.category === 'Credit Card Payment') return false;
            if (selectedAccount === 'all') {
                return t.type === 'EXPENSE' && t.category !== 'Self Transfer';
            } else {
                return t.type === 'EXPENSE' || (t.type === 'TRANSFER' && t.accountId === selectedAccount);
            }
        });

        return [...expensesOnly]
            .sort((a, b) => Number(b.amount) - Number(a.amount))
            .slice(0, 3);
    }, [filteredTransactions, selectedAccount]);

    const weekdayWeekendStats = useMemo(() => {
        let weekday = 0;
        let weekend = 0;

        filteredTransactions.forEach(t => {
            if (t.category === 'Credit Card Payment') return;
            const isExpenseItem = selectedAccount === 'all'
                ? (t.type === 'EXPENSE' && t.category !== 'Self Transfer')
                : (t.type === 'EXPENSE' || (t.type === 'TRANSFER' && t.accountId === selectedAccount));

            if (isExpenseItem) {
                const dateObj = parseISO(t.date);
                const dayOfWeek = getDay(dateObj); // 0 = Sunday, 6 = Saturday
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    weekend += Number(t.amount);
                } else {
                    weekday += Number(t.amount);
                }
            }
        });

        const total = weekday + weekend;
        const weekdayPct = total > 0 ? Math.round((weekday / total) * 100) : 0;
        const weekendPct = total > 0 ? Math.round((weekend / total) * 100) : 0;

        return { weekday, weekend, weekdayPct, weekendPct, total };
    }, [filteredTransactions, selectedAccount]);

    const budgetProgressList = useMemo(() => {
        if (!categoryBudgets) return [];
        return expenseBreakdown
            .filter(item => categoryBudgets[item.name] && categoryBudgets[item.name] > 0)
            .map(item => {
                const budget = categoryBudgets[item.name];
                const pct = Math.round((item.amount / budget) * 100);
                return {
                    category: item.name,
                    spent: item.amount,
                    budget,
                    pct,
                    color: pct > 100 ? Colors.expense : pct >= 80 ? '#F59E0B' : Colors.income
                };
            })
            .sort((a, b) => b.pct - a.pct);
    }, [expenseBreakdown, categoryBudgets, Colors]);

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
                    <Text 
                        numberOfLines={1} 
                        adjustsFontSizeToFit 
                        style={[styles.summaryValue, { color: Colors.income }]}
                    >
                        ₹{stats.income.toLocaleString()}
                    </Text>
                </View>
                <View style={[styles.summaryItem, { backgroundColor: Colors.surface }]}>
                    <ArrowDownCircle color={Colors.expense} size={20} />
                    <Text style={[styles.summaryLabel, { color: Colors.textMuted }]}>Expense</Text>
                    <Text 
                        numberOfLines={1} 
                        adjustsFontSizeToFit 
                        style={[styles.summaryValue, { color: Colors.expense }]}
                    >
                        ₹{stats.expense.toLocaleString()}
                    </Text>
                </View>
                <View style={[styles.summaryItem, { backgroundColor: Colors.surface }]}>
                    <Wallet color={Colors.primary} size={20} />
                    <Text style={[styles.summaryLabel, { color: Colors.textMuted }]}>Savings</Text>
                    <Text 
                        numberOfLines={1} 
                        adjustsFontSizeToFit 
                        style={[styles.summaryValue, { color: Colors.primary }]}
                    >
                        ₹{stats.net.toLocaleString()}
                    </Text>
                </View>
            </View>

            {/* Visual Analytics: Financial Health & Month-over-Month Comparison */}
            <HoverCard disabled={true} style={[styles.card, { backgroundColor: Colors.surface }]}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={[styles.cardTitle, { color: Colors.text }]}>Financial Performance & Trends</Text>
                        <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2 }}>
                            vs {format(subMonths(selectedDate, 1), 'MMMM yyyy')}
                        </Text>
                    </View>
                    <Activity size={18} color={Colors.primary} />
                </View>

                {/* Health Badge & Savings Rate Bar */}
                <View style={{ marginBottom: 16, backgroundColor: Colors.background, padding: 12, borderRadius: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Award size={16} color={financialHealth.color} />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.text }}>{financialHealth.label}</Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: financialHealth.color }}>
                            {financialHealth.rate}% Savings Rate
                        </Text>
                    </View>
                    <View style={{ height: 8, backgroundColor: Colors.border + '40', borderRadius: 4, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${Math.min(100, Math.max(0, financialHealth.rate))}%`, backgroundColor: financialHealth.color, borderRadius: 4 }} />
                    </View>
                </View>

                {/* MoM Comparison Pills */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1, backgroundColor: Colors.background, padding: 12, borderRadius: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                            {expDiffPct > 0 ? (
                                <TrendingUp size={14} color={Colors.expense} />
                            ) : (
                                <TrendingDown size={14} color={Colors.income} />
                            )}
                            <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.textMuted }}>Expense Trend</Text>
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: 'bold', color: expDiffPct > 0 ? Colors.expense : Colors.income }}>
                            {expDiffPct > 0 ? `+${expDiffPct}%` : `${expDiffPct}%`}
                        </Text>
                        <Text style={{ fontSize: 10, color: Colors.textMuted, marginTop: 2 }}>
                            Last Mo: ₹{previousMonthStats.expense.toLocaleString()}
                        </Text>
                    </View>

                    <View style={{ flex: 1, backgroundColor: Colors.background, padding: 12, borderRadius: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                            <Zap size={14} color={Colors.primary} />
                            <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.textMuted }}>Daily Avg Burn</Text>
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: 'bold', color: Colors.text }}>
                            ₹{dailySpendingData.avgDaily.toLocaleString()}/day
                        </Text>
                        <Text style={{ fontSize: 10, color: Colors.textMuted, marginTop: 2 }}>
                            Peak: {dailySpendingData.peakDay ? `Day ${dailySpendingData.peakDay} (₹${dailySpendingData.maxSpending.toLocaleString()})` : 'None'}
                        </Text>
                    </View>
                </View>

                {/* Daily Spending Bar Chart with Clear Legend & Interactive Inspector */}
                <View style={{ marginTop: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.text }}>
                            Daily Expense Activity
                        </Text>
                        <View style={{ backgroundColor: Colors.background, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: selectedDayInfo ? Colors.primary : Colors.textMuted }}>
                                {selectedDayInfo
                                    ? `Day ${selectedDayInfo.day}: ₹${selectedDayInfo.amount.toLocaleString()}`
                                    : dailySpendingData.peakDay > 0
                                        ? `Peak: Day ${dailySpendingData.peakDay} (₹${dailySpendingData.maxSpending.toLocaleString()})`
                                        : 'Tap any bar to inspect'}
                            </Text>
                        </View>
                    </View>

                    {/* Color Legend so customers immediately understand the bars */}
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: Colors.primary }} />
                            <Text style={{ fontSize: 10, color: Colors.textMuted }}>Daily Expense</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: Colors.expense }} />
                            <Text style={{ fontSize: 10, color: Colors.textMuted }}>Highest Spending Day (Peak)</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: Colors.border + '60' }} />
                            <Text style={{ fontSize: 10, color: Colors.textMuted }}>No Expense</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 60, gap: 2 }}>
                        {dailySpendingData.dailyTotals.map((amt, idx) => {
                            const barHeight = dailySpendingData.maxSpending > 0 ? Math.max(4, (amt / dailySpendingData.maxSpending) * 56) : 4;
                            const isPeak = idx + 1 === dailySpendingData.peakDay && amt > 0;
                            const isSelected = selectedDayInfo && selectedDayInfo.day === idx + 1;
                            return (
                                <TouchableOpacity
                                    key={`day-${idx}`}
                                    onPress={() => setSelectedDayInfo({ day: idx + 1, amount: amt })}
                                    style={{
                                        flex: 1,
                                        height: barHeight,
                                        backgroundColor: isPeak ? Colors.expense : (amt > 0 ? Colors.primary : Colors.border + '50'),
                                        borderRadius: 2,
                                        opacity: selectedDayInfo ? (isSelected ? 1 : 0.4) : 1
                                    }}
                                />
                            );
                        })}
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={{ fontSize: 9, color: Colors.textMuted }}>Day 1</Text>
                        <Text style={{ fontSize: 9, color: Colors.textMuted }}>Day 15</Text>
                        <Text style={{ fontSize: 9, color: Colors.textMuted }}>Day {dailySpendingData.daysInMonth}</Text>
                    </View>
                </View>
            </HoverCard>

            {/* 🏆 Top 3 Purchases of the Month & 📅 Weekday vs Weekend Analysis */}
            <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 4, marginBottom: 8 }}>
                {/* Top Purchases Card */}
                <View style={{ flex: 1, backgroundColor: Colors.surface, borderRadius: 20, padding: 14, borderColor: Colors.border, borderWidth: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <ShoppingBag size={16} color={Colors.primary} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.text }}>Top Purchases</Text>
                    </View>
                    {topPurchases.length > 0 ? (
                        topPurchases.map((tx, idx) => (
                            <View key={`top-${tx.id || idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <View style={{ flex: 1, marginRight: 6 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.text }} numberOfLines={1}>
                                        #{idx + 1} {tx.category}
                                    </Text>
                                    <Text style={{ fontSize: 9, color: Colors.textMuted }} numberOfLines={1}>
                                        {format(parseISO(tx.date), 'MMM dd')} {tx.note ? `• ${tx.note}` : ''}
                                    </Text>
                                </View>
                                <Text style={{ fontSize: 11, fontWeight: 'bold', color: Colors.expense }}>
                                    ₹{Number(tx.amount).toLocaleString()}
                                </Text>
                            </View>
                        ))
                    ) : (
                        <Text style={{ fontSize: 10, color: Colors.textMuted, marginTop: 4 }}>No major purchases recorded</Text>
                    )}
                </View>

                {/* Weekday vs Weekend Card */}
                <View style={{ flex: 1, backgroundColor: Colors.surface, borderRadius: 20, padding: 14, borderColor: Colors.border, borderWidth: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <Calendar size={16} color={Colors.primary} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.text }}>Day Split</Text>
                    </View>
                    <View style={{ gap: 8 }}>
                        <View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                                <Text style={{ fontSize: 10, color: Colors.textMuted }}>Mon-Fri (Weekdays)</Text>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.text }}>{weekdayWeekendStats.weekdayPct}%</Text>
                            </View>
                            <View style={{ height: 6, backgroundColor: Colors.border + '40', borderRadius: 3, overflow: 'hidden' }}>
                                <View style={{ height: '100%', width: `${weekdayWeekendStats.weekdayPct}%`, backgroundColor: Colors.primary, borderRadius: 3 }} />
                            </View>
                            <Text style={{ fontSize: 9, color: Colors.textMuted, marginTop: 2 }}>₹{weekdayWeekendStats.weekday.toLocaleString()}</Text>
                        </View>

                        <View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                                <Text style={{ fontSize: 10, color: Colors.textMuted }}>Sat-Sun (Weekends)</Text>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.text }}>{weekdayWeekendStats.weekendPct}%</Text>
                            </View>
                            <View style={{ height: 6, backgroundColor: Colors.border + '40', borderRadius: 3, overflow: 'hidden' }}>
                                <View style={{ height: '100%', width: `${weekdayWeekendStats.weekendPct}%`, backgroundColor: '#F59E0B', borderRadius: 3 }} />
                            </View>
                            <Text style={{ fontSize: 9, color: Colors.textMuted, marginTop: 2 }}>₹{weekdayWeekendStats.weekend.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* 🎯 Category Budget Tracker (if budgets are set) */}
            {budgetProgressList.length > 0 && (
                <HoverCard disabled={true} style={[styles.card, { backgroundColor: Colors.surface, marginTop: 4 }]}>
                    <View style={styles.cardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Target size={18} color={Colors.primary} />
                            <Text style={[styles.cardTitle, { color: Colors.text }]}>Category Budget Tracker</Text>
                        </View>
                    </View>
                    <View style={{ gap: 12 }}>
                        {budgetProgressList.map(item => (
                            <View key={`bgt-${item.category}`}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.text }}>{item.category}</Text>
                                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: item.color }}>
                                        ₹{item.spent.toLocaleString()} / ₹{item.budget.toLocaleString()} ({item.pct}%)
                                    </Text>
                                </View>
                                <View style={{ height: 8, backgroundColor: Colors.border + '40', borderRadius: 4, overflow: 'hidden' }}>
                                    <View style={{ height: '100%', width: `${Math.min(100, item.pct)}%`, backgroundColor: item.color, borderRadius: 4 }} />
                                </View>
                            </View>
                        ))}
                    </View>
                </HoverCard>
            )}

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
                                onCenterPress={(item) => navigateToHistory(item.name, 'EXPENSE')}
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
                                    onPress={() => navigateToHistory({ name: item.name }, 'EXPENSE')}
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
                                onCenterPress={(item) => navigateToHistory({ name: item.name, accountId: (item as any).accountId }, 'INCOME')}
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
                                    onPress={() => navigateToHistory({ name: item.name, accountId: item.accountId }, 'INCOME')}
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
    yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    yearText: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 20 },
    arrowBtn: { padding: 4 },
    monthScroll: { marginBottom: 16, marginHorizontal: -20 },
    monthContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
    monthChip: { width: 64, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
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


