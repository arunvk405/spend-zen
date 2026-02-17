import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useFinance } from '../../src/context/FinanceContext';
import { Colors, Typography } from '../../src/theme/colors';
import { PieChart } from 'react-native-chart-kit';
import { EXPENSE_CATEGORIES } from '../../src/models';

const screenWidth = Dimensions.get('window').width;

export default function Reports() {
    const { transactions, monthlyExpenses } = useFinance();

    const expenseData = useMemo(() => {
        const categories: Record<string, number> = {};

        transactions
            .filter(tx => tx.type === 'EXPENSE')
            .forEach(tx => {
                categories[tx.category] = (categories[tx.category] || 0) + tx.amount;
            });

        return Object.entries(categories).map(([name, amount]) => {
            const catInfo = EXPENSE_CATEGORIES.find(c => c.name === name);
            return {
                name: name,
                population: amount,
                color: catInfo ? catInfo.color : Colors.primary,
                legendFontColor: Colors.textMuted,
                legendFontSize: 12,
            };
        }).sort((a, b) => b.population - a.population);
    }, [transactions]);

    const chartConfig = {
        color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.reportCard}>
                <Text style={styles.cardTitle}>Spending by Category</Text>
                {expenseData.length > 0 ? (
                    <View style={styles.chartContainer}>
                        <PieChart
                            data={expenseData}
                            width={screenWidth - 40}
                            height={220}
                            chartConfig={chartConfig}
                            accessor="population"
                            backgroundColor="transparent"
                            paddingLeft="15"
                            absolute
                        />
                    </View>
                ) : (
                    <View style={styles.emptyChart}>
                        <Text style={styles.emptyText}>No expense data to display</Text>
                    </View>
                )}
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Expense Breakdown</Text>
            </View>

            {expenseData.map((item) => (
                <View key={item.name} style={styles.breakdownItem}>
                    <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                    <Text style={styles.categoryName}>{item.name}</Text>
                    <Text style={styles.categoryAmount}>${item.population.toLocaleString()}</Text>
                    <Text style={styles.categoryPercent}>
                        {Math.round((item.population / (monthlyExpenses || 1)) * 100)}%
                    </Text>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: 20,
    },
    reportCard: {
        backgroundColor: Colors.surface,
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
    },
    cardTitle: {
        ...Typography.h3,
        color: Colors.text,
        alignSelf: 'flex-start',
        marginBottom: 20,
    },
    chartContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyChart: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: Colors.textMuted,
        ...Typography.body,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        ...Typography.h3,
        color: Colors.text,
    },
    breakdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    colorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    categoryName: {
        flex: 1,
        ...Typography.body,
        color: Colors.text,
    },
    categoryAmount: {
        ...Typography.body,
        fontWeight: 'bold',
        color: Colors.text,
        marginRight: 12,
    },
    categoryPercent: {
        ...Typography.caption,
        color: Colors.textMuted,
        width: 40,
        textAlign: 'right',
    },
});
