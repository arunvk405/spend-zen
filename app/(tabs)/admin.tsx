import React, { useState, useEffect } from 'react';
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
import { getAllTransactionsAdmin } from '../../src/database/db';
import { useThemeColors } from '../../src/theme/colors';
import { format } from 'date-fns';
import { ShieldCheck, Database, RefreshCw, User as UserIcon } from 'lucide-react-native';

const screenWidth = Dimensions.get('window').width;

export default function AdminScreen() {
    const Colors = useThemeColors();
    const { isAdmin, loading: authLoading } = useAuth();
    const [allTransactions, setAllTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getAllTransactionsAdmin();
            setAllTransactions(data);
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
            <Text style={[styles.cell, styles.headerCell, { color: Colors.text, width: 100 }]}>User ID</Text>
            <Text style={[styles.cell, styles.headerCell, { color: Colors.text, width: 100 }]}>Category</Text>
            <Text style={[styles.cell, styles.headerCell, { color: Colors.text, width: 80 }]}>Amount</Text>
            <Text style={[styles.cell, styles.headerCell, { color: Colors.text, flex: 1 }]}>Note</Text>
        </View>
    );

    const renderRow = ({ item }: { item: any }) => (
        <View style={[styles.row, { borderBottomColor: Colors.border }]}>
            <Text style={[styles.cell, { color: Colors.text, width: 80 }]} numberOfLines={1}>
                {format(new Date(item.date), 'MM/dd')}
            </Text>
            <Text style={[styles.cell, { color: Colors.textMuted, width: 100, fontSize: 10 }]} numberOfLines={1}>
                {item.userId?.substring(0, 8)}...
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

    return (
        <View style={[styles.container, { backgroundColor: Colors.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: Colors.text }]}>Master DB</Text>
                    <Text style={[styles.subtitle, { color: Colors.textMuted }]}>
                        Viewing {allTransactions.length} total entries
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

            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
                <View style={{ width: Math.max(screenWidth, 600) }}>
                    <FlatList
                        data={allTransactions}
                        renderItem={renderRow}
                        keyExtractor={item => item.id}
                        ListHeaderComponent={TableHeader}
                        onRefresh={loadData}
                        refreshing={loading}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Database size={48} color={Colors.textMuted} />
                                <Text style={{ color: Colors.textMuted, marginTop: 12 }}>No data found in Firestore</Text>
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
