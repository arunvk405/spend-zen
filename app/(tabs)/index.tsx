import React, { useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Platform, Modal, Pressable, ActivityIndicator, Animated
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFinance } from '../../src/context/FinanceContext';
import { useThemeColors } from '../../src/theme/colors';
import {
    Wallet, Landmark, CreditCard, TrendingUp, TrendingDown,
    ArrowRight, Briefcase, RotateCcw, Plus, AlertCircle, Pencil, Shield, X,
    PiggyBank, Gift, Laptop, Package, Utensils, Activity, Home, Car, User, PawPrint, FileText, Film
} from 'lucide-react-native';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../../src/models';
import { format, isSameMonth, isSameYear, parseISO } from 'date-fns';
import { useRouter, useFocusEffect } from 'expo-router';

const MOTIVATIONAL_QUOTES = [
    { quote: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett", category: "Savings" },
    { quote: "A budget is telling your money where to go instead of wondering where it went.", author: "Dave Ramsey", category: "Budgeting" },
    { quote: "Beware of little expenses; a small leak will sink a great ship.", author: "Benjamin Franklin", category: "Mindfulness" },
    { quote: "The goal isn't more money. The goal is living life on your terms.", author: "Chris Brogan", category: "Freedom" },
    { quote: "Financial freedom is available to those who learn about it and work for it.", author: "Robert Kiyosaki", category: "Education" },
    { quote: "It’s not how much money you make, but how much money you keep.", author: "Robert Kiyosaki", category: "Wealth" },
    { quote: "The safe utilization rule: Use credit like cash, and pay off full due immediately to boost score.", author: "Zen Wisdom", category: "Credit" },
    { quote: "Too many people spend money they haven't earned, to buy things they don't want, to impress people they don't like.", author: "Will Rogers", category: "Mindfulness" },
    { quote: "Investing should be more like watching paint dry or watching grass grow. If you want excitement, take $800 and go to Las Vegas.", author: "Paul Samuelson", category: "Investing" },
    { quote: "Never depend on a single income. Make investments to create a second source.", author: "Warren Buffett", category: "Growth" },
    { quote: "The rich invest in time, the poor invest in money.", author: "Warren Buffett", category: "Mindset" },
    { quote: "Every time you borrow money, you're robbing your future self.", author: "Nathan W. Morris", category: "Debt" },
    { quote: "You must gain control over your money or the lack of it will forever control you.", author: "Dave Ramsey", category: "Control" },
    { quote: "Rich people have small TVs and big libraries, and poor people have small libraries and big TVs.", author: "Zig Ziglar", category: "Growth" },
    { quote: "Do not buy things you cannot afford with money you do not have to impress people you do not know.", author: "Common Sense", category: "Mindfulness" },
    { quote: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin", category: "Education" },
    { quote: "If you buy things you do not need, soon you will have to sell things you need.", author: "Warren Buffett", category: "Mindfulness" },
    { quote: "The habit of saving is itself an education; it fosters every virtue and broadens the mind.", author: "T.T. Munger", category: "Savings" },
    { quote: "Buy assets, not liabilities. An asset puts money in your pocket.", author: "Robert Kiyosaki", category: "Assets" }
];

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

const IconRenderer = ({ name, color, size = 18 }: { name: string, color: string, size?: number }) => {
    switch (name) {
        case 'briefcase': return <Briefcase color={color} size={size} />;
        case 'piggy-bank': return <PiggyBank color={color} size={size} />;
        case 'gift': return <Gift color={color} size={size} />;
        case 'trending-up': return <TrendingUp color={color} size={size} />;
        case 'laptop': return <Laptop color={color} size={size} />;
        case 'utensils': return <Utensils color={color} size={size} />;
        case 'car': return <Car color={color} size={size} />;
        case 'home': return <Home color={color} size={size} />;
        case 'user': return <User color={color} size={size} />;
        case 'paw-print': return <PawPrint color={color} size={size} />;
        case 'film': return <Film color={color} size={size} />;
        case 'file-text': return <FileText color={color} size={size} />;
        case 'wallet': return <Wallet color={color} size={size} />;
        case 'landmark': return <Landmark color={color} size={size} />;
        case 'credit-card': return <CreditCard color={color} size={size} />;
        case 'cross': return <Activity color={color} size={size} />;
        case 'package': return <Package color={color} size={size} />;
        default: return <Package color={color} size={size} />;
    }
};

export default function HomeDashboard() {
    const Colors = useThemeColors();
    const router = useRouter();
    const {
        totalBalance, cashBalance, monthlyIncome, monthlyExpenses,
        bankAccounts, totalBankBalance,
        creditCards, totalCreditDue,
        transactions, loading, hasFetchedOnce, hasError, refreshData, clearAccountData, addTransaction,
        cashAccountName, renameCashAccount,
        historyRetention, updateHistoryRetention
    } = useFinance();

    const [fadeAnim] = useState(new Animated.Value(1));
    const [currentQuoteIndex, setCurrentQuoteIndex] = useState(() => {
        return new Date().getDate() % MOTIVATIONAL_QUOTES.length;
    });

    const triggerNewQuote = React.useCallback(() => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true
        }).start(() => {
            setCurrentQuoteIndex(prevIndex => {
                let nextIndex = prevIndex;
                while (nextIndex === prevIndex) {
                    nextIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
                }
                return nextIndex;
            });
            
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true
            }).start();
        });
    }, [fadeAnim]);

    useFocusEffect(
        React.useCallback(() => {
            // Pick a fresh quote immediately on page open/focus
            triggerNewQuote();

            // Set up auto-rotation interval of 10 seconds
            const interval = setInterval(() => {
                triggerNewQuote();
            }, 10000);

            return () => clearInterval(interval);
        }, [triggerNewQuote])
    );



    const [confirmCardId, setConfirmCardId] = useState<string | null>(null);
    const [selectedSourceAccountId, setSelectedSourceAccountId] = useState<string | null>(null);
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

        // Default to cash or first bank account
        setSelectedSourceAccountId('cash');
        setConfirmCardId(cardId);
    };

    const confirmClear = async () => {
        if (!confirmCardId) return;
        const card = creditCards.find(c => c.id === confirmCardId);
        if (!card) return;
        
        setConfirmCardId(null);
        setClearing(true);
        try {
            // 1. If a funding source is chosen (e.g. Bank or Cash), record the EXPENSE transaction first
            if (selectedSourceAccountId) {
                await addTransaction({
                    amount: card.dueAmount,
                    type: 'EXPENSE',
                    category: 'Credit Card Payment',
                    date: new Date().toISOString(),
                    accountId: selectedSourceAccountId,
                    note: `Paid ${card.cardName} due`
                });
            }

            // 2. Record the INCOME transaction on the Credit Card itself to settle the liability
            const sourceName = selectedSourceAccountId 
                ? getAccountName(selectedSourceAccountId) 
                : 'Direct Reset';

            await addTransaction({
                amount: card.dueAmount,
                type: 'INCOME',
                category: 'Credit Card Payment',
                date: new Date().toISOString(),
                accountId: confirmCardId,
                note: `Settled using ${sourceName}`
            });

            if (Platform.OS !== 'web') {
                try {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (e) {}
            }
        } catch (error) {
            console.error("Error settling card:", error);
        } finally {
            setClearing(false);
            setSelectedSourceAccountId(null);
        }
    };

    return (
        <>
        {/* Web & Native Confirm & Select Funding Source Modal */}
        <Modal visible={!!confirmCardId} transparent animationType="fade" onRequestClose={() => setConfirmCardId(null)}>
            <Pressable style={s.modalOverlay} onPress={() => setConfirmCardId(null)}>
                <Pressable style={[s.modalBox, { backgroundColor: Colors.surface, width: '90%', maxWidth: 360 }]} onPress={(e) => e.stopPropagation()}>
                    <Text style={[s.modalTitle, { color: Colors.text }]}>Record Card Payment</Text>
                    {(() => {
                        const card = creditCards.find(c => c.id === confirmCardId);
                        if (!card) return null;
                        return (
                            <>
                                <Text style={[s.modalMsg, { color: Colors.textMuted, marginBottom: 14 }]}>
                                    Select the funding source to settle <Text style={{ color: Colors.primary, fontWeight: '700' }}>₹{card.dueAmount.toLocaleString()}</Text> due on <Text style={{ color: Colors.text, fontWeight: '700' }}>{card.cardName}</Text>:
                                </Text>

                                <ScrollView style={{ maxHeight: 180, marginBottom: 16 }} showsVerticalScrollIndicator={false}>
                                    {/* Cash Account Option */}
                                    <Pressable 
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: 12,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: selectedSourceAccountId === 'cash' ? Colors.primary : Colors.border,
                                            backgroundColor: selectedSourceAccountId === 'cash' ? Colors.primary + '08' : Colors.surface,
                                            marginBottom: 8
                                        }}
                                        onPress={() => setSelectedSourceAccountId('cash')}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.income + '15', justifyContent: 'center', alignItems: 'center' }}>
                                                <Wallet size={16} color={Colors.income} />
                                            </View>
                                            <Text style={{ color: Colors.text, fontSize: 13, fontWeight: '600' }}>{cashAccountName}</Text>
                                        </View>
                                        <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: '600' }}>₹{cashBalance.toLocaleString()}</Text>
                                    </Pressable>

                                    {/* Bank Accounts List */}
                                    {bankAccounts.map(bank => (
                                        <Pressable 
                                            key={bank.id}
                                            style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: 12,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: selectedSourceAccountId === bank.id ? Colors.primary : Colors.border,
                                                backgroundColor: selectedSourceAccountId === bank.id ? Colors.primary + '08' : Colors.surface,
                                                marginBottom: 8
                                            }}
                                            onPress={() => setSelectedSourceAccountId(bank.id)}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: bank.color + '15', justifyContent: 'center', alignItems: 'center' }}>
                                                    <Landmark size={16} color={bank.color} />
                                                </View>
                                                <Text style={{ color: Colors.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{bank.bankName}</Text>
                                            </View>
                                            <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: '600' }}>₹{bank.computedBalance.toLocaleString()}</Text>
                                        </Pressable>
                                    ))}

                                    {/* No Account (Just reset card due) */}
                                    <Pressable 
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: 12,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: selectedSourceAccountId === null ? Colors.primary : Colors.border,
                                            backgroundColor: selectedSourceAccountId === null ? Colors.primary + '08' : Colors.surface,
                                        }}
                                        onPress={() => setSelectedSourceAccountId(null)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.textMuted + '15', justifyContent: 'center', alignItems: 'center' }}>
                                                <X size={16} color={Colors.textMuted} />
                                            </View>
                                            <Text style={{ color: Colors.text, fontSize: 13, fontWeight: '600' }}>No Source (Just Reset Card)</Text>
                                        </View>
                                    </Pressable>
                                </ScrollView>
                            </>
                        );
                    })()}
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
        
        {(!hasFetchedOnce && loading) && (
            <View style={[s.loadingOverlay, { backgroundColor: Colors.background }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={{ marginTop: 12, color: Colors.textMuted, fontWeight: '600' }}>Loading your finances...</Text>
            </View>
        )}

        {hasError && (
            <View style={[s.loadingOverlay, { backgroundColor: Colors.background }]}>
                <AlertCircle size={48} color={Colors.expense} />
                <Text style={{ marginTop: 12, color: Colors.text, fontWeight: '700', fontSize: 18 }}>Sync Failed</Text>
                <Text style={{ marginTop: 4, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 40 }}>
                    We couldn't fetch your latest data. Please check your connection.
                </Text>
                <TouchableOpacity 
                    onPress={refreshData}
                    style={{ marginTop: 24, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
                >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Try Again</Text>
                </TouchableOpacity>
            </View>
        )}

        <ScrollView style={[s.container, { backgroundColor: Colors.background }]} contentContainerStyle={s.content}>

            {/* ── Net Balance Summary Card ─────────────────────────── */}
            <HoverCard disabled={true} style={[s.summaryCard, { backgroundColor: Colors.surface, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 }]}>
                <Text style={[s.summaryLabel, { color: Colors.textMuted }]}>AVAILABLE BALANCE</Text>
                <Text style={[s.totalBalance, { color: Colors.text }]}>
                    ₹{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <View style={[s.statsRow, { borderTopColor: Colors.border }]}>
                    <View style={s.statItem}>
                        <View style={[s.statIcon, { backgroundColor: Colors.income + '20' }]}>
                            <Landmark color={Colors.income} size={16} />
                        </View>
                        <View>
                            <Text style={[s.statLabel, { color: Colors.textMuted }]}>Bank Balance</Text>
                            <Text style={[s.statValue, { color: Colors.income }]}>₹{totalBankBalance.toLocaleString()}</Text>
                        </View>
                    </View>
                    <View style={s.statItem}>
                        <View style={[s.statIcon, { backgroundColor: Colors.primary + '20' }]}>
                            <Wallet color={Colors.primary} size={16} />
                        </View>
                        <View>
                            <Text style={[s.statLabel, { color: Colors.textMuted }]}>{cashAccountName || 'Cash in Hand'}</Text>
                            <Text style={[s.statValue, { color: Colors.primary }]}>₹{cashBalance.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>

                {/* Compact, elegant monthly budget stats banner directly integrated */}
                <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginTop: 14, 
                    paddingVertical: 8, 
                    paddingHorizontal: 12, 
                    borderRadius: 12, 
                    backgroundColor: Colors.surface,
                    borderWidth: 1,
                    borderColor: Colors.border
                }}>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>May Summary:</Text>
                        <Text style={{ fontSize: 11, color: Colors.income, fontWeight: '600' }}>In: +₹{monthlyIncome.toLocaleString()}</Text>
                        <Text style={{ fontSize: 11, color: Colors.expense, fontWeight: '600' }}>Out: -₹{monthlyExpenses.toLocaleString()}</Text>
                    </View>
                    <View style={{ backgroundColor: (monthlyIncome - monthlyExpenses) >= 0 ? Colors.income + '15' : Colors.expense + '15', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: (monthlyIncome - monthlyExpenses) >= 0 ? Colors.income : Colors.expense }}>
                            Save: ₹{(monthlyIncome - monthlyExpenses).toLocaleString()}
                        </Text>
                    </View>
                </View>

                {totalCreditDue > 0 && (
                    <View style={[s.dueAlert, { backgroundColor: Colors.expense + '15', borderColor: Colors.expense + '30', marginTop: 10 }]}>
                        <AlertCircle size={14} color={Colors.expense} />
                        <Text style={[s.dueAlertText, { color: Colors.expense }]}>
                            Total Credit Card Due: ₹{totalCreditDue.toLocaleString()}
                        </Text>
                    </View>
                )}
            </HoverCard>

            {/* ── Dynamic & Interactive Financial Mindset Spark ────── */}
            <Pressable
                onPress={triggerNewQuote}
                style={({ pressed }) => [
                    {
                        backgroundColor: Colors.surface,
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: Colors.border,
                        borderLeftWidth: 4,
                        borderLeftColor: Colors.primary,
                        marginTop: 16,
                        marginBottom: 8,
                        flexDirection: 'row',
                        gap: 12,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: pressed ? 0.02 : 0.05,
                        shadowRadius: 8,
                        elevation: 2,
                    },
                    pressed ? { transform: [{ scale: 0.99 }] } : undefined,
                    Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.15s ease' } : undefined
                ] as any}
            >
                <View style={{
                    backgroundColor: Colors.primary + '15',
                    padding: 10,
                    borderRadius: 12,
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <PiggyBank color={Colors.primary} size={22} />
                </View>
                <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{
                            color: Colors.textMuted,
                            fontSize: 10,
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                        }}>
                            — {MOTIVATIONAL_QUOTES[currentQuoteIndex].category} Spark
                        </Text>
                        <Text style={{
                            color: Colors.primary,
                            fontSize: 9,
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            opacity: 0.8
                        }}>
                            Tap to rotate
                        </Text>
                    </View>
                    <Text style={{
                        color: Colors.text,
                        fontSize: 13,
                        fontWeight: '600',
                        lineHeight: 18,
                        fontStyle: 'italic'
                    }}>
                        "{MOTIVATIONAL_QUOTES[currentQuoteIndex].quote}"
                    </Text>
                    <Text style={{
                        color: Colors.textMuted,
                        fontSize: 11,
                        fontWeight: '700',
                        marginTop: 4,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5
                    }}>
                        — {MOTIVATIONAL_QUOTES[currentQuoteIndex].author}
                    </Text>
                </Animated.View>
            </Pressable>

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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {loading && <ActivityIndicator size="small" color={Colors.primary} />}
                    <TouchableOpacity onPress={refreshData}>
                        <RotateCcw size={16} color={Colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/transactions')}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[s.seeAll, { color: Colors.primary }]}>See All </Text>
                            <ArrowRight size={14} color={Colors.primary} />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
            {(() => {
                const allCategories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
                return currentMonthTransactions.slice(0, 5).map(tx => {
                    const categoryData = allCategories.find(c => c.name === tx.category && c.type === tx.type) || 
                                       allCategories.find(c => c.name === tx.category) ||
                                       { icon: 'package', color: Colors.textMuted };
                    
                    return (
                        <HoverCard disabled={true} key={tx.id} style={[s.txItem, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                            <View style={[s.txHeader, { 
                                borderBottomColor: Colors.border + '30',
                                backgroundColor: Colors.isDark ? '#ffffff05' : '#00000003' 
                            }]}>
                                <Text style={[s.txCategory, { color: Colors.text }]}>{tx.category}</Text>
                                {tx.note && (
                                    <Text style={[s.txNote, { color: Colors.textMuted }]} numberOfLines={1}>
                                        • {tx.note}
                                    </Text>
                                )}
                            </View>

                            <View style={s.txBody}>
                                <View style={[s.txIcon, { backgroundColor: categoryData.color + '15', marginHorizontal: 0 }]}>
                                    <IconRenderer name={categoryData.icon} color={categoryData.color} size={18} />
                                </View>
                                
                                <View style={{ marginLeft: 16, flex: 1 }}>
                                    <Text style={[s.txAccountTag, { color: Colors.textMuted, marginTop: 0 }]}>
                                        {getAccountName(tx.accountId)} • {format(new Date(tx.date), 'MMM d')}
                                    </Text>
                                </View>

                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[s.txAmount, { color: tx.type === 'INCOME' ? Colors.income : Colors.expense }]}>
                                        {tx.type === 'INCOME' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        </HoverCard>
                    );
                });
            })()}
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
    txItem: {
        padding: 0,
        borderRadius: 14,
        marginBottom: 10,
        borderWidth: 1,
        overflow: 'hidden',
    },
    txHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderBottomWidth: 1,
        gap: 6,
    },
    txBody: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },
    txIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    txCategory: { fontSize: 14, fontWeight: '700' },
    txNote: { fontSize: 11, fontWeight: '500' },
    txAmount: { fontSize: 15, fontWeight: 'bold' },
    txAccountTag: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
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
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    }
});
