import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { useThemeColors } from '../../src/theme/colors';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';
import { useFinance } from '../../src/context/FinanceContext';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

const screenWidth = Dimensions.get('window').width;

export default function Reports() {
    const Colors = useThemeColors();
    const { transactions } = useFinance();

    const chartConfig = {
        backgroundGradientFrom: Colors.surface,
        backgroundGradientTo: Colors.surface,
        color: (opacity = 1) => `rgba(${parseInt(Colors.primary.slice(1, 3), 16)}, ${parseInt(Colors.primary.slice(3, 5), 16)}, ${parseInt(Colors.primary.slice(5, 7), 16)}, ${opacity})`,
        labelColor: (opacity = 1) => Colors.textMuted,
        strokeWidth: 2,
        barPercentage: 0.5,
        useShadowColorFromDataset: false
    };

    // --- Data Aggregation Logic ---

    // 1. Expense Breakdown by Category (Current Month)
    const categoryData = useMemo(() => {
        const currentMonth = new Date();
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);

        const expenses = transactions.filter(t =>
            t.type === 'EXPENSE' &&
            isWithinInterval(parseISO(t.date), { start, end })
        );

        const breakdown: Record<string, number> = {};
        expenses.forEach(t => {
            breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
        });

        // Convert to chart format and take top 5
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
    }, [transactions]);

    // 2. Spending Trend (Last 6 Months)
    const trendData = useMemo(() => {
        const data: number[] = [];
        const labels: string[] = [];

        for (let i = 5; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const start = startOfMonth(date);
            const end = endOfMonth(date);
            const monthLabel = format(date, 'MMM');

            const monthlyExpense = transactions
                .filter(t => t.type === 'EXPENSE' && isWithinInterval(parseISO(t.date), { start, end }))
                .reduce((sum, t) => sum + t.amount, 0);

            data.push(monthlyExpense);
            labels.push(monthLabel);
        }

        return {
            labels,
            datasets: [{ data }]
        };
    }, [transactions]);


    return (
        <ScrollView style={[styles.container, { backgroundColor: Colors.background }]} contentContainerStyle={{ paddingBottom: 100 }}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: Colors.text }]}>Financial Insights</Text>
                <Text style={[styles.subtitle, { color: Colors.textMuted }]}>Overview of your spending habits</Text>
            </View>

            {/* Category Pie Chart */}
            <View style={[styles.card, { backgroundColor: Colors.surface }]}>
                <Text style={[styles.cardTitle, { color: Colors.text }]}>Expenses This Month</Text>
                {categoryData.length > 0 ? (
                    <PieChart
                        data={categoryData}
                        width={screenWidth - 32}
                        height={220}
                        chartConfig={chartConfig}
                        accessor={"population"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        center={[10, 0]}
                        absolute
                    />
                ) : (
                    <Text style={{ color: Colors.textMuted, textAlign: 'center', marginVertical: 20 }}>No expenses yet this month.</Text>
                )}
            </View>

            {/* Monthly Trend Bar Chart */}
            <View style={[styles.card, { backgroundColor: Colors.surface }]}>
                <Text style={[styles.cardTitle, { color: Colors.text }]}>6-Month Trend</Text>
                <BarChart
                    data={trendData}
                    width={screenWidth - 64}
                    height={220}
                    yAxisLabel="$"
                    yAxisSuffix=""
                    chartConfig={{
                        ...chartConfig,
                        backgroundColor: Colors.surface,
                        decimalPlaces: 0,
                    }}
                    verticalLabelRotation={0}
                />
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
    },
    card: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        alignItems: 'center' // Center charts
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        alignSelf: 'flex-start',
        marginBottom: 16,
        marginLeft: 8
    }
});
