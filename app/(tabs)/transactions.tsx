import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useFinance } from '../../src/context/FinanceContext';
import { useThemeColors, Typography } from '../../src/theme/colors';
import { Search, Trash2 } from 'lucide-react-native';
import { format } from 'date-fns';

export default function TransactionsHistory() {
    const Colors = useThemeColors(); // Hook for dynamic colors
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
        <View style={[styles.transactionItem, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <View style={[styles.dateBlock, { borderRightColor: Colors.border }]}>
                <Text style={[styles.dateDay, { color: Colors.text }]}>{format(new Date(item.date), 'dd')}</Text>
                <Text style={[styles.dateMonth, { color: Colors.textMuted }]}>{format(new Date(item.date), 'MMM')}</Text>
            </View>
            <View style={styles.txDetails}>
                <Text style={[styles.txCategory, { color: Colors.text }]}>{item.category}</Text>
                <Text style={[styles.txNote, { color: Colors.textMuted }]} numberOfLines={1}>{item.note || 'No note'}</Text>
            </View>
            <View style={styles.amountBlock}>
                <Text style={[
                    styles.txAmount,
                    { color: item.type === 'INCOME' ? Colors.income : Colors.expense }
                ]}>
                    {item.type === 'INCOME' ? '+' : '-'}${item.amount.toLocaleString()}
                </Text>
                <Text style={[styles.accountId, { color: Colors.textMuted }]}>{item.accountId}</Text>
            </View>
            <TouchableOpacity
                style={[styles.deleteButton, { borderColor: Colors.border, backgroundColor: Colors.surface }]}
                onPress={() => handleDelete(item)}
            >
                <Trash2 color={Colors.expense} size={20} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: Colors.background }]}>
            {/* Search and Filter */}
            <View style={[styles.header, { backgroundColor: Colors.background, borderBottomColor: Colors.border }]}>
                <View style={[styles.searchBar, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <Search color={Colors.textMuted} size={20} />
                    <TextInput
                        style={[styles.searchInput, { color: Colors.text }]}
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 50,
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
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    dateBlock: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingRight: 16,
        borderRightWidth: 1,
        width: 50,
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
    txDetails: {
        flex: 1,
        paddingHorizontal: 16,
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
        alignItems: 'flex-end',
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
        marginLeft: 12,
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
});
