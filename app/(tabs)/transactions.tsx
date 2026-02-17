import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useFinance } from '../../src/context/FinanceContext';
import { Colors, Typography } from '../../src/theme/colors';
import { Search, Trash2 } from 'lucide-react-native';
import { format } from 'date-fns';

export default function TransactionsHistory() {
    const { transactions, deleteTransaction } = useFinance();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const matchesSearch = tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (tx.note && tx.note.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesType = filterType === 'ALL' || tx.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [transactions, searchQuery, filterType]);

    const handleDelete = async (item: any) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete this ${item.type.toLowerCase()} transaction of $${item.amount}?`
        );

        if (confirmed) {
            try {
                await deleteTransaction(item.id);
            } catch (error) {
                window.alert('Failed to delete transaction');
            }
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.transactionItem}>
            <View style={styles.dateBlock}>
                <Text style={styles.dateDay}>{format(new Date(item.date), 'dd')}</Text>
                <Text style={styles.dateMonth}>{format(new Date(item.date), 'MMM')}</Text>
            </View>
            <View style={styles.txDetails}>
                <Text style={styles.txCategory}>{item.category}</Text>
                <Text style={styles.txNote} numberOfLines={1}>{item.note || 'No note'}</Text>
            </View>
            <View style={styles.amountBlock}>
                <Text style={[
                    styles.txAmount,
                    { color: item.type === 'INCOME' ? Colors.income : Colors.expense }
                ]}>
                    {item.type === 'INCOME' ? '+' : '-'}${item.amount.toLocaleString()}
                </Text>
                <Text style={styles.accountId}>{item.accountId}</Text>
            </View>
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item)}
            >
                <Trash2 color={Colors.expense} size={20} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Search and Filter */}
            <View style={styles.header}>
                <View style={styles.searchBar}>
                    <Search color={Colors.textMuted} size={20} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search categories or notes..."
                        placeholderTextColor={Colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <View style={styles.filterRow}>
                    {['ALL', 'INCOME', 'EXPENSE'].map((t) => (
                        <TouchableOpacity
                            key={t}
                            style={[styles.filterChip, filterType === t && styles.activeFilter]}
                            onPress={() => setFilterType(t as any)}
                        >
                            <Text style={[styles.filterText, filterType === t && styles.activeFilterText]}>
                                {t.charAt(0) + t.slice(1).toLowerCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <FlatList
                data={filteredTransactions}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No matching transactions found.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        padding: 20,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 50,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        color: Colors.text,
        fontSize: 16,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 10,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    activeFilter: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    filterText: {
        color: Colors.textMuted,
        fontWeight: '600',
    },
    activeFilterText: {
        color: Colors.white,
    },
    listContent: {
        padding: 20,
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
    dateBlock: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingRight: 16,
        borderRightWidth: 1,
        borderRightColor: Colors.border,
        width: 50,
    },
    dateDay: {
        ...Typography.h3,
        color: Colors.text,
        lineHeight: 22,
    },
    dateMonth: {
        ...Typography.caption,
        color: Colors.textMuted,
        textTransform: 'uppercase',
    },
    txDetails: {
        flex: 1,
        paddingHorizontal: 16,
    },
    txCategory: {
        ...Typography.body,
        fontWeight: 'bold',
        color: Colors.text,
    },
    txNote: {
        ...Typography.caption,
        color: Colors.textMuted,
        marginTop: 2,
    },
    amountBlock: {
        alignItems: 'flex-end',
    },
    txAmount: {
        ...Typography.body,
        fontWeight: 'bold',
    },
    accountId: {
        ...Typography.caption,
        color: Colors.textMuted,
        marginTop: 2,
        textTransform: 'capitalize',
    },
    deleteButton: {
        marginLeft: 12,
        padding: 8,
        borderRadius: 8,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        color: Colors.textMuted,
        ...Typography.body,
    },
});
