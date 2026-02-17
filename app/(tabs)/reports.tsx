import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { useThemeColors, Typography } from '../../src/theme/colors';
import { PieChart } from 'react-native-chart-kit';
import { useFinance } from '../../src/context/FinanceContext';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

const screenWidth = Dimensions.get('window').width;

const ACCOUNT_FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'cash', label: 'Cash' },
    { id: 'bank', label: 'Bank' },
    { id: 'credit', label: 'Credit' }
];

export default function Reports() {
    const Colors = useThemeColors();
    const { transactions } = useFinance();
    const [selectedAccount, setSelectedAccount] = useState('all');

    const filteredTransactions = useMemo(() => {
        if (selectedAccount === 'all') return transactions;
        return transactions.filter(t => t.accountId === selectedAccount);
    }, [transactions, selectedAccount]);

    const chartConfig = {
        backgroundGradientFrom: Colors.surface,
        backgroundGradientTo: Colors.surface,
        color: (opacity = 1) => `rgba(${parseInt(Colors.primary.slice(1, 3), 16)}, ${parseInt(Colors.primary.slice(3, 5), 16)}, ${parseInt(Colors.primary.slice(5, 7), 16)}, ${opacity})`,
        labelColor: (opacity = 1) => Colors.textMuted,
        strokeWidth: 2,
        barPercentage: 0.7,
        useShadowColorFromDataset: false
    };

    // 1. Expense Breakdown by Category (Current Month)
    const categoryData = useMemo(() => {
        const currentMonth = new Date();
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);

        const expenses = filteredTransactions.filter(t =>
            t.type === 'EXPENSE' &&
            isWithinInterval(parseISO(t.date), { start, end })
        );

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
            const label = t.accountId.charAt(0).toUpperCase() + t.accountId.slice(1);
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
                <Text style={[styles.title, { color: Colors.text }]}>Reports</Text>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterContainer}
                    contentContainerStyle={styles.filterContent}
                >
                    {ACCOUNT_FILTERS.map(filter => (
                        <TouchableOpacity
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
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Income by Account */}
            <View style={[styles.card, { backgroundColor: Colors.surface }]}>
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
            </View>

            {/* Expense Breakdown */}
            <View style={[styles.card, { backgroundColor: Colors.surface }]}>
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
            </View>
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
    filterContainer: {
        marginBottom: 10,
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
