import React, { useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Platform, Modal, Pressable, ActivityIndicator
} from 'react-native';
import { useFinance } from '../../src/context/FinanceContext';
import { useThemeColors } from '../../src/theme/colors';
import {
    Wallet, Landmark, CreditCard, TrendingUp, TrendingDown,
    ArrowRight, Briefcase, RotateCcw, Plus, AlertCircle, Pencil, Shield
} from 'lucide-react-native';
import { format, isSameMonth, isSameYear, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';

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

export default function HomeDashboard() {
    const Colors = useThemeColors();
    const router = useRouter();
    const {
        totalBalance, cashBalance, monthlyIncome, monthlyExpenses,
        bankAccounts, totalBankBalance,
        creditCards, totalCreditDue,
        transactions, loading, clearAccountData, addTransaction,
        cashAccountName, renameCashAccount,
        historyRetention, updateHistoryRetention
    } = useFinance();



    const [confirmCardId, setConfirmCardId] = useState<string | null>(null);
    const [clearing, setClearing] = useState(false);

    const handleRenameCash = () => {
        const newName = window.prompt("Rename Cash Account:", cashAccountName);
        if (newName && newName.trim()) {
            renameCashAccount(newName.trim());
        }
    };

    const getAccountName = (id: string) => {
        if (id === 'cash') return cashAccountName;
        const bank = bankAccounts.find(b => b.id === id);
        if (bank) return bank.bankName;
        const card = creditCards.find(c => c.id === id);
        if (card) return card.cardName;
        return id;
    };

    const currentMonthTransactions = useMemo(() => {
        const now = new Date();
        return transactions.filter(tx => {
            const d = parseISO(tx.date);
            return isSameMonth(d, now) && isSameYear(d, now);
        });
    }, [transactions]);

    const handleClearCard = (cardId: string) => {
        const card = creditCards.find(c => c.id === cardId);
        if (!card || card.dueAmount <= 0) return;

        if (Platform.OS === 'web') {
            setConfirmCardId(cardId);
        } else {
            const { Alert } = require('react-native');
            Alert.alert('Record Payment', `Record a payment of ₹${card.dueAmount.toLocaleString()} for ${card.cardName}? This keeps your history.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Record Payment', fontWeight: '700', onPress: async () => {
                    setClearing(true);
                    await addTransaction({
                        amount: card.dueAmount,
                        type: 'INCOME',
                        category: 'Credit Card Payment',
                        date: new Date().toISOString(),
                        accountId: cardId,
                        note: `Full payment for ${card.cardName}`
                    });
                    setClearing(false);
                }},
            ]);
        }
    };

    const confirmClear = async () => {
        if (!confirmCardId) return;
        const card = creditCards.find(c => c.id === confirmCardId);
        if (!card) return;
        
        setConfirmCardId(null);
        setClearing(true);
        await addTransaction({
            amount: card.dueAmount,
            type: 'INCOME',
            category: 'Credit Card Payment',
            date: new Date().toISOString(),
            accountId: confirmCardId,
            note: `Full payment for ${card.cardName}`
        });
        setClearing(false);
    };

    return (
        <>
        {/* Web confirm modal */}
        <Modal visible={!!confirmCardId} transparent animationType="fade" onRequestClose={() => setConfirmCardId(null)}>
            <Pressable style={s.modalOverlay} onPress={() => setConfirmCardId(null)}>
                <Pressable style={[s.modalBox, { backgroundColor: Colors.surface }]} onPress={() => {}}>
                    <Text style={[s.modalTitle, { color: Colors.text }]}>Record Payment?</Text>
                    <Text style={[s.modalMsg, { color: Colors.textMuted }]}>
                        This will record a full payment for this card. Your transaction history will be preserved.
                    </Text>
                    <View style={s.modalBtns}>
                        <Pressable style={[s.modalBtn, { borderColor: Colors.border, borderWidth: 1 }]} onPress={() => setConfirmCardId(null)}>
                            <Text style={{ color: Colors.textMuted, fontWeight: '600' }}>Cancel</Text>
                        </Pressable>
                        <Pressable style={[s.modalBtn, { backgroundColor: Colors.primary }]} onPress={confirmClear}>
                            {clearing ? <ActivityIndicator color="#fff" size="small" /> :
                                <Text style={{ color: '#fff', fontWeight: '700' }}>Record Payment</Text>}
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>

        <ScrollView style={[s.container, { backgroundColor: Colors.background }]} contentContainerStyle={s.content}>

            {/* ── Net Balance Summary Card ─────────────────────────── */}
            <HoverCard disabled={true} style={[s.summaryCard, { backgroundColor: Colors.surface, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 }]}>
                <Text style={[s.summaryLabel, { color: Colors.textMuted }]}>Total Net Balance</Text>
                <Text style={[s.totalBalance, { color: Colors.text }]}>₹{totalBalance.toLocaleString()}</Text>
                <View style={[s.statsRow, { borderTopColor: Colors.border }]}>
                    <View style={s.statItem}>
                        <View style={[s.statIcon, { backgroundColor: Colors.income + '20' }]}>
                            <TrendingUp color={Colors.income} size={16} />
                        </View>
                        <View>
                            <Text style={[s.statLabel, { color: Colors.textMuted }]}>Monthly Income</Text>
                            <Text style={[s.statValue, { color: Colors.income }]}>+₹{monthlyIncome.toLocaleString()}</Text>
                        </View>
                    </View>
                    <View style={s.statItem}>
                        <View style={[s.statIcon, { backgroundColor: Colors.expense + '20' }]}>
                            <TrendingDown color={Colors.expense} size={16} />
                        </View>
                        <View>
                            <Text style={[s.statLabel, { color: Colors.textMuted }]}>Monthly Expenses</Text>
                            <Text style={[s.statValue, { color: Colors.expense }]}>-₹{monthlyExpenses.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>
                {totalCreditDue > 0 && (
                    <View style={[s.dueAlert, { backgroundColor: Colors.expense + '15', borderColor: Colors.expense + '30' }]}>
                        <AlertCircle size={14} color={Colors.expense} />
                        <Text style={[s.dueAlertText, { color: Colors.expense }]}>
                            Total Credit Card Due: ₹{totalCreditDue.toLocaleString()}
                        </Text>
                    </View>
                )}
            </HoverCard>

            {/* ── Cash ─────────────────────────────────────────────── */}
            <View style={[s.sectionHeader]}>
                <Text style={[s.sectionTitle, { color: Colors.text }]}>{cashAccountName}</Text>
                <TouchableOpacity onPress={handleRenameCash} style={{ padding: 4 }}>
                    <Pencil size={14} color={Colors.textMuted} />
                </TouchableOpacity>
            </View>
            <HoverCard 
                style={[s.cashCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                onPress={() => router.push({ pathname: '/reports', params: { accountId: 'cash' } })}
            >
                <View style={[s.accountIcon, { backgroundColor: '#4CAF5020' }]}>
                    <Wallet color="#4CAF50" size={22} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[s.accountName, { color: Colors.textMuted }]}>{cashAccountName}</Text>
                    <Text style={[s.accountBalance, { color: Colors.text }]}>₹{cashBalance.toLocaleString()}</Text>
                </View>
            </HoverCard>

            {/* ── Bank Accounts ─────────────────────────────────────── */}
            <View style={s.sectionHeader}>
                <Text style={[s.sectionTitle, { color: Colors.text }]}>Bank Accounts</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={[s.sectionTotal, { color: Colors.income }]}>₹{totalBankBalance.toLocaleString()}</Text>
                    <TouchableOpacity onPress={() => router.push('/manage-accounts')}
                        style={[s.addAccountBtn, { backgroundColor: Colors.primary }]}>
                        <Plus size={14} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
            {bankAccounts.length === 0 ? (
                <TouchableOpacity onPress={() => router.push('/manage-accounts')}
                    style={[s.emptyCard, { borderColor: Colors.border }]}>
                    <Plus size={16} color={Colors.textMuted} />
                    <Text style={[s.emptyText, { color: Colors.textMuted }]}>Add your first bank account</Text>
                </TouchableOpacity>
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.hScroll}>
                    {bankAccounts.map(acc => (
                        <HoverCard 
                            key={acc.id} 
                            style={[s.bankCard, { backgroundColor: Colors.surface, borderColor: Colors.border, borderTopColor: acc.color, borderTopWidth: 3 }]}
                            onPress={() => router.push({ pathname: '/reports', params: { accountId: acc.id } })}
                        >
                            <View style={[s.accountIcon, { backgroundColor: acc.color + '20' }]}>
                                <Landmark color={acc.color} size={20} />
                            </View>
                            <Text style={[s.accountName, { color: Colors.textMuted }]} numberOfLines={1}>{acc.bankName}</Text>
                            <Text style={[s.accountType, { color: Colors.textMuted }]}>{acc.accountType}</Text>
                            <Text style={[s.accountBalance, { color: Colors.text }]}>₹{acc.computedBalance.toLocaleString()}</Text>
                        </HoverCard>
                    ))}
                    <HoverCard onPress={() => router.push('/manage-accounts')}
                        style={[s.bankCard, s.addCard, { borderColor: Colors.border }]}>
                        <Plus size={24} color={Colors.textMuted} />
                        <Text style={[{ color: Colors.textMuted, fontSize: 12, marginTop: 4 }]}>Add</Text>
                    </HoverCard>
                </ScrollView>
            )}

            {/* ── Credit Cards ──────────────────────────────────────── */}
            <View style={s.sectionHeader}>
                <Text style={[s.sectionTitle, { color: Colors.text }]}>Credit Cards</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {totalCreditDue > 0 && (
                        <Text style={[s.sectionTotal, { color: Colors.expense }]}>Due ₹{totalCreditDue.toLocaleString()}</Text>
                    )}
                    <TouchableOpacity onPress={() => router.push('/manage-accounts?tab=credit')}
                        style={[s.addAccountBtn, { backgroundColor: '#EF4444' }]}>
                        <Plus size={14} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
            {creditCards.length === 0 ? (
                <TouchableOpacity onPress={() => router.push('/manage-accounts?tab=credit')}
                    style={[s.emptyCard, { borderColor: Colors.border }]}>
                    <Plus size={16} color={Colors.textMuted} />
                    <Text style={[s.emptyText, { color: Colors.textMuted }]}>Add your first credit card</Text>
                </TouchableOpacity>
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.hScroll}>
                    {creditCards.map(card => (
                        <HoverCard 
                            key={card.id} 
                            style={[s.bankCard, { width: 170, padding: 12, backgroundColor: Colors.surface, borderColor: Colors.border, borderTopColor: card.color, borderTopWidth: 3 }]}
                            onPress={() => router.push({ pathname: '/reports', params: { accountId: card.id } })}
                        >
                            <View style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                                <Pressable onPress={() => handleClearCard(card.id)} hitSlop={8}>
                                    <RotateCcw size={10} color={Colors.textMuted} />
                                </Pressable>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <View style={[s.accountIcon, { width: 28, height: 28, marginBottom: 0, backgroundColor: card.color + '20' }]}>
                                    <CreditCard color={card.color} size={14} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.accountName, { color: Colors.text, fontWeight: '700' }]} numberOfLines={1}>{card.cardName}</Text>
                                    <Text style={{ fontSize: 9, color: Colors.textMuted }}>Due on {card.dueDay}</Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                <View>
                                    <Text style={{ fontSize: 8, color: Colors.textMuted, textTransform: 'uppercase' }}>Limit</Text>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.text }}>₹{card.creditLimit.toLocaleString()}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ fontSize: 8, color: Colors.textMuted, textTransform: 'uppercase' }}>Used</Text>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.expense }}>₹{card.usedAmount.toLocaleString()}</Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View>
                                    <Text style={{ fontSize: 8, color: Colors.textMuted, textTransform: 'uppercase' }}>Avail</Text>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.income }}>₹{card.availableBalance.toLocaleString()}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ fontSize: 8, color: Colors.textMuted, textTransform: 'uppercase' }}>Due</Text>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: card.dueAmount > 0 ? Colors.expense : Colors.text }}>₹{card.dueAmount.toLocaleString()}</Text>
                                </View>
                            </View>
                        </HoverCard>
                    ))}
                    <HoverCard onPress={() => router.push('/manage-accounts?tab=credit')}
                        style={[s.bankCard, s.addCard, { width: 100, borderColor: Colors.border }]}>
                        <Plus size={24} color={Colors.textMuted} />
                        <Text style={[{ color: Colors.textMuted, fontSize: 12, marginTop: 4 }]}>Add</Text>
                    </HoverCard>
                </ScrollView>
            )}

            {/* ── Recent Transactions ───────────────────────────────── */}
            <View style={[s.sectionHeader, { marginTop: 8 }]}>
                <Text style={[s.sectionTitle, { color: Colors.text }]}>Recent Transactions</Text>
                <TouchableOpacity onPress={() => router.push('/transactions')}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[s.seeAll, { color: Colors.primary }]}>See All </Text>
                        <ArrowRight size={14} color={Colors.primary} />
                    </View>
                </TouchableOpacity>
            </View>
            {currentMonthTransactions.slice(0, 5).map(tx => (
                <HoverCard disabled={true} key={tx.id} style={[s.txItem, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <View style={[s.txIcon, { backgroundColor: Colors.background }]}>
                        <Briefcase size={18} color={Colors.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.txCategory, { color: Colors.text }]}>{tx.category}</Text>
                        <Text style={[s.txNote, { color: Colors.textMuted }]} numberOfLines={1}>
                            {tx.note || format(new Date(tx.date), 'MMM d, h:mm a')}
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[s.txAmount, { color: tx.type === 'INCOME' ? Colors.income : Colors.expense }]}>
                            {tx.type === 'INCOME' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                        </Text>
                        <Text style={[s.txAccountTag, { color: Colors.textMuted }]}>{getAccountName(tx.accountId)}</Text>
                    </View>
                </HoverCard>
            ))}
            {currentMonthTransactions.length === 0 && (
                <View style={[s.emptyCard, { borderColor: Colors.border, flexDirection: 'column', gap: 4, padding: 32 }]}>
                    <Text style={[s.emptyText, { color: Colors.textMuted }]}>No transactions this month.</Text>
                    <Text style={[{ color: Colors.textMuted, fontSize: 12 }]}>Tap '+' to start tracking!</Text>
                </View>
            )}
        </ScrollView>
        </>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, paddingBottom: 100 },
    // Summary
    summaryCard: { borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1 },
    summaryLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    totalBalance: { fontSize: 32, fontWeight: 'bold', marginVertical: 10 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 20, borderTopWidth: 1 },
    statItem: { flexDirection: 'row', alignItems: 'center' },
    statIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    statLabel: { fontSize: 12 },
    statValue: { fontSize: 15, fontWeight: 'bold' },
    dueAlert: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 10, borderRadius: 10, borderWidth: 1 },
    dueAlertText: { fontSize: 13, fontWeight: '600' },
    // Section header
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
    sectionTitle: { fontSize: 18, fontWeight: '700' },
    sectionTotal: { fontSize: 14, fontWeight: '700' },
    addAccountBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    // Cash
    cashCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    // Bank
    hScroll: { marginHorizontal: -20, paddingLeft: 20, marginBottom: 24, paddingBottom: 16, paddingTop: 8, marginTop: -4 },
    bankCard: { width: 148, padding: 14, borderRadius: 18, marginRight: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    addCard: { justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', shadowOpacity: 0, elevation: 0 },
    // Credit card
    creditCard: { borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    creditCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    creditCardName: { fontSize: 15, fontWeight: '700' },
    creditCardDueDate: { fontSize: 12, marginTop: 2 },
    creditCardStats: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, marginBottom: 12 },
    creditStat: { alignItems: 'center' },
    creditStatLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    creditStatVal: { fontSize: 14, fontWeight: '700', marginTop: 2 },
    usageBarBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
    usageBarFill: { height: 4, borderRadius: 2 },
    clearBtn: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    // Common
    accountIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    accountName: { fontSize: 12, fontWeight: '400' },
    accountType: { fontSize: 11, marginTop: 1 },
    accountBalance: { fontSize: 16, fontWeight: 'bold', marginTop: 4 },
    emptyCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: 18, marginBottom: 24 },
    emptyText: { fontSize: 14 },
    seeAll: { fontWeight: '600', fontSize: 14 },
    txItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1 },
    txIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    txCategory: { fontSize: 15, fontWeight: '600' },
    txNote: { fontSize: 12, marginTop: 2 },
    txAmount: { fontSize: 15, fontWeight: 'bold' },
    txAccountTag: { fontSize: 10, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalBox: { width: 320, borderRadius: 20, padding: 24, elevation: 10 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
    modalMsg: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
    modalBtns: { flexDirection: 'row', gap: 12 },
    modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    optionBtn: {
        width: '100%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 10,
        alignItems: 'center',
    },
    optionText: {
        fontSize: 15,
        fontWeight: '700',
    }
});
