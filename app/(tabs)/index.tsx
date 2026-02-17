import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFinance } from '../../src/context/FinanceContext';
import { useThemeColors, Typography } from '../../src/theme/colors';
import { Wallet, Landmark, CreditCard, TrendingUp, TrendingDown, ArrowRight, Briefcase } from 'lucide-react-native';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';

export default function HomeDashboard() {
    const Colors = useThemeColors();
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
        <View key={acc.id} style={[styles.accountCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: acc.color + '20' }]}>
                {getAccountIcon(acc.id, acc.color)}
            </View>
            <View style={styles.accountDetails}>
                <Text style={[styles.accountName, { color: Colors.textMuted }]}>{acc.name}</Text>
                <Text style={[styles.accountBalance, { color: Colors.text }]}>${acc.balance.toLocaleString()}</Text>
            </View>
        </View>
    );

    return (
        <ScrollView style={[styles.container, { backgroundColor: Colors.background }]} contentContainerStyle={styles.content}>
            {/* Net Worth Summary */}
            <View style={[styles.summaryCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                <Text style={[styles.summaryLabel, { color: Colors.textMuted }]}>Total Net Worth</Text>
                <Text style={[styles.totalBalance, { color: Colors.text }]}>${totalBalance.toLocaleString()}</Text>

                <View style={[styles.statsRow, { borderTopColor: Colors.border }]}>
                    <View style={styles.statItem}>
                        <View style={[styles.statIcon, { backgroundColor: Colors.income + '20' }]}>
                            <TrendingUp color={Colors.income} size={16} />
                        </View>
                        <View>
                            <Text style={[styles.statLabel, { color: Colors.textMuted }]}>Monthly Income</Text>
                            <Text style={[styles.statValue, { color: Colors.text }]}>+${monthlyIncome.toLocaleString()}</Text>
                        </View>
                    </View>
                    <View style={styles.statItem}>
                        <View style={[styles.statIcon, { backgroundColor: Colors.expense + '20' }]}>
                            <TrendingDown color={Colors.expense} size={16} />
                        </View>
                        <View>
                            <Text style={[styles.statLabel, { color: Colors.textMuted }]}>Monthly Expenses</Text>
                            <Text style={[styles.statValue, { color: Colors.text }]}>-${monthlyExpenses.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Accounts List */}
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: Colors.text }]}>Accounts</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsScroll}>
                {accounts.map(renderAccountCard)}
            </ScrollView>

            {/* Recent Transactions */}
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: Colors.text }]}>Recent Transactions</Text>
                <TouchableOpacity onPress={() => router.push('/transactions')}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.seeAll, { color: Colors.primary }]}>See All </Text>
                        <ArrowRight size={14} color={Colors.primary} />
                    </View>
                </TouchableOpacity>
            </View>

            {transactions.slice(0, 5).map((tx) => (
                <View key={tx.id} style={[styles.transactionItem, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <View style={[styles.txIcon, { backgroundColor: Colors.background }]}>
                        <Briefcase size={20} color={Colors.textMuted} />
                    </View>
                    <View style={styles.txDetails}>
                        <Text style={[styles.txCategory, { color: Colors.text }]}>{tx.category}</Text>
                        <Text style={[styles.txNote, { color: Colors.textMuted }]} numberOfLines={1}>
                            {tx.note || format(new Date(tx.date), 'MMM d, h:mm a')}
                        </Text>
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
                <View style={[styles.emptyState, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <Text style={[styles.emptyText, { color: Colors.textMuted }]}>No transactions yet. Tap '+' to start tracking!</Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 100, // Space for tab bar
    },
    summaryCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    totalBalance: {
        fontSize: 32,
        fontWeight: 'bold',
        marginVertical: 10,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
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
        fontSize: 12,
        fontWeight: '400',
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    seeAll: {
        fontWeight: '600',
    },
    accountsScroll: {
        marginBottom: 24,
        marginHorizontal: -20, // Negative margin to allow edge-to-edge scrolling
    },
    accountCard: {
        padding: 16,
        borderRadius: 20,
        marginRight: 16,
        marginLeft: 20, // Add initial padding for first item
        width: 150,
        borderWidth: 1,
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
        fontSize: 12,
        fontWeight: '400',
    },
    accountBalance: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 4,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
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
        fontSize: 16,
        fontWeight: '600',
    },
    txNote: {
        fontSize: 12,
        fontWeight: '400',
        marginTop: 2,
    },
    txAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
    },
});
