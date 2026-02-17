import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFinance } from '../../src/context/FinanceContext';
import { Colors, Typography } from '../../src/theme/colors';
import { Wallet, Landmark, CreditCard, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react-native';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';

export default function HomeDashboard() {
    const { totalBalance, monthlyIncome, monthlyExpenses, accounts, transactions, loading } = useFinance();
    const router = useRouter();

    const getAccountIcon = (id: string, color: string) => {
        switch (id) {
            case 'cash': return <Wallet color={color} size={24} />;
            case 'bank': return <Landmark color={color} size={24} />;
            case 'credit': return <CreditCard color={color} size={24} />;
            default: return <Wallet color={color} size={24} />;
        }
    };

    const renderAccountCard = (acc: any) => (
        <View key={acc.id} style={styles.accountCard}>
            <View style={[styles.iconContainer, { backgroundColor: acc.color + '20' }]}>
                {getAccountIcon(acc.id, acc.color)}
            </View>
            <View style={styles.accountDetails}>
                <Text style={styles.accountName}>{acc.name}</Text>
                <Text style={styles.accountBalance}>${acc.balance.toLocaleString()}</Text>
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Net Worth Summary */}
            <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Net Worth</Text>
                <Text style={styles.totalBalance}>${totalBalance.toLocaleString()}</Text>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <View style={[styles.statIcon, { backgroundColor: Colors.income + '20' }]}>
                            <TrendingUp color={Colors.income} size={16} />
                        </View>
                        <View>
                            <Text style={styles.statLabel}>Monthly Income</Text>
                            <Text style={styles.statValue}>+${monthlyIncome.toLocaleString()}</Text>
                        </View>
                    </View>
                    <View style={styles.statItem}>
                        <View style={[styles.statIcon, { backgroundColor: Colors.expense + '20' }]}>
                            <TrendingDown color={Colors.expense} size={16} />
                        </View>
                        <View>
                            <Text style={styles.statLabel}>Monthly Expenses</Text>
                            <Text style={styles.statValue}>-${monthlyExpenses.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Accounts List */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Accounts</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsScroll}>
                {accounts.map(renderAccountCard)}
            </ScrollView>

            {/* Recent Transactions */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                <TouchableOpacity onPress={() => router.push('/transactions')}>
                    <Text style={styles.seeAll}>See All <ArrowRight size={14} /></Text>
                </TouchableOpacity>
            </View>

            {transactions.slice(0, 5).map((tx) => (
                <View key={tx.id} style={styles.transactionItem}>
                    <View style={[styles.txIcon, { backgroundColor: Colors.surface }]}>
                        <Text style={{ fontSize: 18 }}>💼</Text>
                    </View>
                    <View style={styles.txDetails}>
                        <Text style={styles.txCategory}>{tx.category}</Text>
                        <Text style={styles.txDate}>{format(new Date(tx.date), 'MMM d, h:mm a')}</Text>
                    </View>
                    <Text style={[
                        styles.txAmount,
                        { color: tx.type === 'INCOME' ? Colors.income : Colors.expense }
                    ]}>
                        {tx.type === 'INCOME' ? '+' : '-'}${tx.amount.toLocaleString()}
                    </Text>
                </View>
            ))}

            {transactions.length === 0 && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No transactions yet. Tap '+' to start tracking!</Text>
                </View>
            )}
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
        paddingBottom: 40,
    },
    summaryCard: {
        backgroundColor: Colors.surface,
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    summaryLabel: {
        ...Typography.caption,
        color: Colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    totalBalance: {
        ...Typography.h1,
        color: Colors.text,
        marginVertical: 10,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    statLabel: {
        ...Typography.caption,
        color: Colors.textMuted,
    },
    statValue: {
        ...Typography.body,
        fontWeight: 'bold',
        color: Colors.text,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 8,
    },
    sectionTitle: {
        ...Typography.h3,
        color: Colors.text,
    },
    seeAll: {
        color: Colors.primary,
        fontWeight: '600',
    },
    accountsScroll: {
        marginBottom: 24,
        marginHorizontal: -20,
        paddingHorizontal: 20,
    },
    accountCard: {
        backgroundColor: Colors.surface,
        padding: 16,
        borderRadius: 20,
        marginRight: 16,
        width: 150,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    accountDetails: {
        marginTop: 4,
    },
    accountName: {
        ...Typography.caption,
        color: Colors.textMuted,
    },
    accountBalance: {
        ...Typography.body,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: 4,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    txIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    txDetails: {
        flex: 1,
    },
    txCategory: {
        ...Typography.body,
        fontWeight: '600',
        color: Colors.text,
    },
    txDate: {
        ...Typography.caption,
        color: Colors.textMuted,
        marginTop: 2,
    },
    txAmount: {
        ...Typography.body,
        fontWeight: 'bold',
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        color: Colors.textMuted,
        textAlign: 'center',
        ...Typography.body,
    },
});
