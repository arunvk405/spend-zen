import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { getAllTransactionsAdmin, getAllUsers } from '../../src/database/db';
import { useThemeColors } from '../../src/theme/colors';
import { format } from 'date-fns';
import { ShieldCheck, Database, RefreshCw, User as UserIcon, Filter, Users } from 'lucide-react-native';

const screenWidth = Dimensions.get('window').width;

export default function AdminScreen() {
    const Colors = useThemeColors();
    const { isAdmin, loading: authLoading } = useAuth();
    const [allTransactions, setAllTransactions] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const usersMap = useMemo(() => {
        const map: Record<string, any> = {};
        users.forEach(u => {
            map[u.uid] = u;
        });
        return map;
    }, [users]);

    const filteredTransactions = useMemo(() => {
        if (!selectedUserId) return allTransactions;
        return allTransactions.filter(tx => tx.userId === selectedUserId);
    }, [allTransactions, selectedUserId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [data, usersData] = await Promise.all([
                getAllTransactionsAdmin(),
                getAllUsers()
            ]);
            setAllTransactions(data);
            setUsers(usersData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            loadData();
        }
    }, [isAdmin]);

    if (authLoading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

    if (!isAdmin) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: Colors.background }]}>
                <ShieldCheck size={64} color={Colors.expense} />
                <Text style={[styles.errorTitle, { color: Colors.text }]}>Access Denied</Text>
                <Text style={[styles.errorSubtitle, { color: Colors.textMuted }]}>
                    You do not have administrative privileges to view this database.
                </Text>
            </View>
        );
    }

    const TableHeader = () => (
        <View style={[styles.row, styles.headerRow, { backgroundColor: Colors.surface, borderBottomColor: Colors.border }]}>
            <Text style={[styles.cell, styles.headerCell, { color: Colors.text, width: 80 }]}>Date</Text>
            <Text style={[styles.cell, styles.headerCell, { color: Colors.text, width: 120 }]}>User Name</Text>
            <Text style={[styles.cell, styles.headerCell, { color: Colors.text, width: 100 }]}>Category</Text>
            <Text style={[styles.cell, styles.headerCell, { color: Colors.text, width: 80 }]}>Amount</Text>
            <Text style={[styles.cell, styles.headerCell, { color: Colors.text, flex: 1 }]}>Note</Text>
        </View>
    );

    const renderRow = ({ item }: { item: any }) => {
        const user = usersMap[item.userId];
        const userName = user?.displayName || user?.email || item.userId?.substring(0, 8);

        return (
            <View style={[styles.row, { borderBottomColor: Colors.border }]}>
                <Text style={[styles.cell, { color: Colors.text, width: 80 }]} numberOfLines={1}>
                    {format(new Date(item.date), 'MM/dd')}
                </Text>
                <Text style={[styles.cell, { color: Colors.text, width: 120, fontWeight: '500' }]} numberOfLines={1}>
                    {userName}
                </Text>
                <Text style={[styles.cell, { color: Colors.text, width: 100 }]} numberOfLines={1}>
                    {item.category}
                </Text>
                <Text style={[
                    styles.cell,
                    { color: item.type === 'INCOME' ? Colors.income : Colors.expense, width: 80, fontWeight: 'bold' }
                ]}>
                    ${item.amount}
                </Text>
                <Text style={[styles.cell, { color: Colors.textMuted, flex: 1, fontSize: 11 }]} numberOfLines={2}>
                    {item.note || '-'}
                </Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: Colors.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: Colors.text }]}>Master DB</Text>
                    <Text style={[styles.subtitle, { color: Colors.textMuted }]}>
                        {filteredTransactions.length} entries shown
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.refreshBtn, { backgroundColor: Colors.primary + '20' }]}
                    onPress={loadData}
                    disabled={loading}
                >
                    <RefreshCw size={20} color={Colors.primary} style={loading ? styles.spin : {}} />
                </TouchableOpacity>
            </View>

            {/* Filter Section */}
            <View style={styles.filterSection}>
                <View style={styles.filterHeader}>
                    <Users size={16} color={Colors.textMuted} />
                    <Text style={[styles.filterLabel, { color: Colors.textMuted }]}>Filter by User:</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    <TouchableOpacity
                        style={[
                            styles.chip,
                            !selectedUserId && { backgroundColor: Colors.primary, borderColor: Colors.primary }
                        ]}
                        onPress={() => setSelectedUserId(null)}
                    >
                        <Text style={[styles.chipText, !selectedUserId ? { color: Colors.white } : { color: Colors.text }]}>All Users</Text>
                    </TouchableOpacity>
                    {users.map(user => (
                        <TouchableOpacity
                            key={user.uid}
                            style={[
                                styles.chip,
                                selectedUserId === user.uid && { backgroundColor: Colors.primary, borderColor: Colors.primary },
                                { borderColor: Colors.border }
                            ]}
                            onPress={() => setSelectedUserId(user.uid)}
                        >
                            <Text style={[
                                styles.chipText,
                                selectedUserId === user.uid ? { color: Colors.white } : { color: Colors.text }
                            ]}>
                                {user.displayName || user.email?.split('@')[0] || 'Unknown'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
                <View style={{ width: Math.max(screenWidth, 650) }}>
                    <FlatList
                        data={filteredTransactions}
                        renderItem={renderRow}
                        keyExtractor={item => item.id}
                        ListHeaderComponent={TableHeader}
                        onRefresh={loadData}
                        refreshing={loading}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Database size={48} color={Colors.textMuted} />
                                <Text style={{ color: Colors.textMuted, marginTop: 12 }}>No transactions found</Text>
                            </View>
                        }
                    />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    refreshBtn: {
        padding: 12,
        borderRadius: 12,
    },
    // Filter Styles
    filterSection: {
        marginBottom: 16,
    },
    filterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        gap: 8,
        marginBottom: 12,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    filterScroll: {
        paddingHorizontal: 24,
        gap: 10,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    tableScroll: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        alignItems: 'center',
    },
    headerRow: {
        borderBottomWidth: 2,
    },
    cell: {
        paddingHorizontal: 4,
        fontSize: 13,
    },
    headerCell: {
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontSize: 11,
        letterSpacing: 1,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 16,
    },
    errorSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 40,
        marginTop: 8,
    },
    empty: {
        alignItems: 'center',
        marginTop: 100,
    },
    spin: {
        // Animation would go here in real CSS
    }
});
