import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView, Pressable, Platform, Modal } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFinance } from '../../src/context/FinanceContext';
import { useThemeColors, Typography } from '../../src/theme/colors';
import {
    Search, Trash2, Calendar, ChevronLeft, ChevronRight, Pencil, Info,
    Briefcase, PiggyBank, Gift, TrendingUp, Laptop, Package,
    Utensils, Activity, Home, Car, User, PawPrint, Film, CreditCard, Wallet, Landmark,
    SlidersHorizontal, X, Download, Copy, FileText
} from 'lucide-react-native';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, TRANSFER_CATEGORIES } from '../../src/models';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, isSameMonth, isSameYear, isToday, isSameWeek } from 'date-fns';
import ReportsView from './reports';

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const ITEM_WIDTH = 72; // 64 width + 8 marginRight
const getItemLayout = (data: any, index: number) => ({
    length: ITEM_WIDTH,
    offset: ITEM_WIDTH * index,
    index,
});

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

const IconRenderer = ({ name, color, size = 20 }: { name: string, color: string, size?: number }) => {
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

export default function TransactionsHistory() {
    const Colors = useThemeColors();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const topMargin = Math.max(insets.top, Platform.OS === 'web' ? 12 : 8);
    const bottomPadding = Math.max(insets.bottom + 85, 105);

    const { transactions, deleteTransaction, bankAccounts, creditCards, cashAccountName, historyRetention } = useFinance();
    const params = useLocalSearchParams<{ category?: string; accountId?: string; account?: string; date?: string; type?: string; mode?: string }>();
    const [activeSubTab, setActiveSubTab] = useState<'HISTORY' | 'REPORTS'>('HISTORY');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    // Modal temp states
    const [tempCategories, setTempCategories] = useState<string[]>([]);
    const [tempAccounts, setTempAccounts] = useState<string[]>([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'>('ALL');
    const [datePreset, setDatePreset] = useState<'THIS_MONTH' | 'TODAY' | 'THIS_WEEK' | 'ALL_TIME'>('THIS_MONTH');

    const getAccountName = useCallback((id: string) => {
        if (id === 'cash') return cashAccountName;
        const bank = bankAccounts.find(b => b.id === id);
        if (bank) return bank.bankName;
        const card = creditCards.find(c => c.id === id);
        if (card) return card.cardName;
        return id;
    }, [cashAccountName, bankAccounts, creditCards]);

    // Month/Year filter state
    const [selectedDate, setSelectedDate] = useState(new Date());
    const monthListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (params.mode === 'reports') {
            setActiveSubTab('REPORTS');
        }
        if (params.category || params.accountId || params.account || params.date || params.type) {
            const hasCategory = typeof params.category === 'string' && params.category.length > 0;
            const hasAccountId = (typeof params.accountId === 'string' && params.accountId.length > 0) || (typeof params.account === 'string' && params.account.length > 0);
            const hasDate = typeof params.date === 'string' && params.date.length > 0;
            const hasType = typeof params.type === 'string' && params.type.length > 0;

            if (hasCategory || hasAccountId || hasDate || hasType) {
                if (hasCategory) {
                    // Check if passed category string is actually an Account Name or Account ID
                    const matchingAccount = bankAccounts.find(b => b.bankName === params.category || b.id === params.category) ||
                        creditCards.find(c => c.cardName === params.category || c.id === params.category) ||
                        (params.category === cashAccountName || params.category === 'cash' ? { id: 'cash' } : null);

                    if (matchingAccount) {
                        setSelectedAccounts([matchingAccount.id]);
                        setSelectedCategories([]);
                    } else {
                        setSelectedCategories([params.category as string]);
                    }
                }
                if (hasAccountId) {
                    const rawAcc = params.accountId || params.account;
                    const accObj = bankAccounts.find(b => b.id === rawAcc || b.bankName === rawAcc) ||
                        creditCards.find(c => c.id === rawAcc || c.cardName === rawAcc) ||
                        (rawAcc === 'cash' || rawAcc === cashAccountName ? { id: 'cash' } : null);

                    if (accObj) {
                        setSelectedAccounts([accObj.id]);
                    } else if (rawAcc) {
                        setSelectedAccounts([rawAcc as string]);
                    }
                }
                if (hasType) {
                    setFilterType(params.type as 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER');
                }
                if (hasDate) {
                    setSelectedDate(new Date(params.date as string));
                }
                // Clear the params from the router so they don't lock the state when tab changes
                router.setParams({ category: '', accountId: '', account: '', date: '', type: '' });
            }
        }
    }, [params.category, params.accountId, params.account, params.date, params.type, bankAccounts, creditCards, cashAccountName]);

    useFocusEffect(
        React.useCallback(() => {
            const timer = setTimeout(() => {
                monthListRef.current?.scrollToIndex({
                    index: selectedDate.getMonth(),
                    animated: true,
                    viewPosition: 0.5,
                });
            }, 150);
            return () => clearTimeout(timer);
        }, [selectedDate])
    );

    const filteredTransactions = useMemo(() => {
        const now = new Date();
        return transactions.filter(tx => {
            const txDate = parseISO(tx.date);

            let matchesDate = true;
            if (datePreset === 'THIS_MONTH') {
                matchesDate = isSameMonth(txDate, selectedDate) && isSameYear(txDate, selectedDate);
            } else if (datePreset === 'TODAY') {
                matchesDate = isToday(txDate);
            } else if (datePreset === 'THIS_WEEK') {
                matchesDate = isSameWeek(txDate, now, { weekStartsOn: 1 });
            } else if (datePreset === 'ALL_TIME') {
                matchesDate = true;
            }

            const matchesType = filterType === 'ALL' || tx.type === filterType;
            const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(tx.category);
            const matchesAccount = selectedAccounts.length === 0 || selectedAccounts.includes(tx.accountId);

            let matchesSearch = true;
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const noteText = (tx.note || '').toLowerCase();
                const categoryText = (tx.category || '').toLowerCase();
                const accountName = getAccountName(tx.accountId).toLowerCase();
                const toAccountName = tx.toAccountId ? getAccountName(tx.toAccountId).toLowerCase() : '';
                const amountText = tx.amount.toString();

                matchesSearch = noteText.includes(query) ||
                    categoryText.includes(query) ||
                    accountName.includes(query) ||
                    toAccountName.includes(query) ||
                    amountText.includes(query);
            }

            return matchesDate && matchesType && matchesCategory && matchesAccount && matchesSearch;
        });
    }, [transactions, filterType, selectedDate, selectedCategories, selectedAccounts, searchQuery, datePreset, cashAccountName, bankAccounts, creditCards]);

    const totals = useMemo(() => {
        let income = 0;
        let expense = 0;
        let transfer = 0;

        filteredTransactions.forEach(tx => {
            const amt = Number(tx.amount) || 0;
            if (tx.type === 'INCOME') {
                income += amt;
            } else if (tx.type === 'EXPENSE') {
                expense += amt;
            } else if (tx.type === 'TRANSFER') {
                transfer += amt;
            }
        });

        income = Math.round(income * 100) / 100;
        expense = Math.round(expense * 100) / 100;
        transfer = Math.round(transfer * 100) / 100;
        const net = Math.round((income - expense) * 100) / 100;

        return {
            income,
            expense,
            transfer,
            net,
            count: filteredTransactions.length
        };
    }, [filteredTransactions]);

    const hasActiveFilters = selectedCategories.length > 0 || selectedAccounts.length > 0 || filterType !== 'ALL' || searchQuery.trim().length > 0 || datePreset !== 'THIS_MONTH';

    const formatAmount = (num: number) => {
        return num.toLocaleString('en-IN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
    };

    const categoriesToSelect = useMemo(() => {
        if (filterType === 'INCOME') return INCOME_CATEGORIES;
        if (filterType === 'EXPENSE') return EXPENSE_CATEGORIES;
        if (filterType === 'TRANSFER') return TRANSFER_CATEGORIES;

        const combined = [...INCOME_CATEGORIES];
        EXPENSE_CATEGORIES.forEach(exp => {
            if (!combined.some(inc => inc.name === exp.name)) {
                combined.push(exp);
            }
        });
        TRANSFER_CATEGORIES.forEach(tr => {
            if (!combined.some(c => c.name === tr.name)) {
                combined.push(tr);
            }
        });
        return combined;
    }, [filterType]);

    const accountsToSelect = useMemo(() => {
        const list = [{ id: 'cash', name: cashAccountName }];
        bankAccounts.forEach(b => list.push({ id: b.id, name: b.bankName }));
        creditCards.forEach(c => list.push({ id: c.id, name: c.cardName }));
        return list;
    }, [bankAccounts, creditCards, cashAccountName]);

    const openModal = () => {
        setTempCategories([...selectedCategories]);
        setTempAccounts([...selectedAccounts]);
        setIsFilterModalOpen(true);
    };

    const handleApply = () => {
        setSelectedCategories([...tempCategories]);
        setSelectedAccounts([...tempAccounts]);
        setIsFilterModalOpen(false);
    };

    const handleExportCSV = () => {
        if (filteredTransactions.length === 0) {
            if (Platform.OS === 'web') {
                window.alert("No transactions to export");
            } else {
                const { Alert } = require('react-native');
                Alert.alert("Export", "No transactions to export");
            }
            return;
        }

        // Header row
        let csv = 'Date,Category,Type,Amount,Account,Note\n';

        filteredTransactions.forEach(t => {
            const accountName = getAccountName(t.accountId);
            const noteText = t.note ? t.note.replace(/"/g, '""') : '';
            csv += `"${t.date.split('T')[0]}","${t.category}","${t.type}",${t.amount},"${accountName}","${noteText}"\n`;
        });

        if (Platform.OS === 'web') {
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `SpendZen_Export_${format(selectedDate, 'yyyy_MM')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            const { Share } = require('react-native');
            Share.share({
                message: csv,
                title: 'Spend Zen Transactions Export'
            }).catch((err: any) => console.error(err));
        }
    };

    const handleDuplicate = (item: any) => {
        router.push({
            pathname: '/add',
            params: {
                type: item.type,
                amount: item.amount.toString(),
                category: item.category,
                accountId: item.accountId,
                toAccountId: item.toAccountId || '',
                note: item.note || ''
            }
        });
    };

    const handleExportPDF = () => {
        if (filteredTransactions.length === 0) {
            if (Platform.OS === 'web') {
                window.alert("No transactions to export");
            }
            return;
        }

        if (Platform.OS === 'web') {
            const monthTitle = format(selectedDate, 'MMMM yyyy');
            const printWindow = window.open('', '_blank');
            if (!printWindow) return;

            let rowsHtml = '';
            filteredTransactions.forEach(t => {
                const accName = getAccountName(t.accountId);
                const toAcc = t.toAccountId ? ` ➔ ${getAccountName(t.toAccountId)}` : '';
                const color = t.type === 'INCOME' ? '#10B981' : t.type === 'EXPENSE' ? '#EF4444' : '#6366F1';
                const sign = t.type === 'INCOME' ? '+' : t.type === 'EXPENSE' ? '-' : '⇄ ';
                rowsHtml += `
                    <tr>
                        <td>${format(new Date(t.date), 'dd MMM yyyy')}</td>
                        <td>${t.category}</td>
                        <td>${t.type}</td>
                        <td>${accName}${toAcc}</td>
                        <td style="color: ${color}; font-weight: bold;">${sign}₹${Number(t.amount).toLocaleString()}</td>
                        <td>${t.note || '-'}</td>
                    </tr>
                `;
            });

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>SpendZen Statement - ${monthTitle}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
                        h1 { margin-bottom: 4px; color: #4f46e5; font-size: 22px; }
                        p { font-size: 13px; color: #64748b; margin-top: 0; }
                        .summary { display: flex; gap: 16px; margin: 20px 0; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; }
                        .stat { flex: 1; }
                        .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
                        .stat-val { font-size: 18px; font-weight: bold; margin-top: 4px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                        th, td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 13px; }
                        th { background: #f1f5f9; font-weight: 700; color: #334155; }
                    </style>
                </head>
                <body>
                    <h1>SpendZen Monthly Statement</h1>
                    <p>Period: <strong>${monthTitle}</strong> | Generated on: ${format(new Date(), 'dd MMM yyyy')}</p>
                    <div class="summary">
                        <div class="stat"><div class="stat-label">Total Income</div><div class="stat-val" style="color:#10B981;">+₹${totals.income.toLocaleString()}</div></div>
                        <div class="stat"><div class="stat-label">Total Expense</div><div class="stat-val" style="color:#EF4444;">-₹${totals.expense.toLocaleString()}</div></div>
                        <div class="stat"><div class="stat-label">Net Balance</div><div class="stat-val">₹${totals.net.toLocaleString()}</div></div>
                        <div class="stat"><div class="stat-label">Total Txns</div><div class="stat-val">${totals.count}</div></div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Type</th>
                                <th>Account</th>
                                <th>Amount</th>
                                <th>Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
                </html>
            `;

            printWindow.document.write(htmlContent);
            printWindow.document.close();
        }
    };

    const handleReset = () => {
        setTempCategories([]);
        setTempAccounts([]);
    };

    const handleCancel = () => {
        setIsFilterModalOpen(false);
    };

    const toggleTempCategory = (categoryName: string) => {
        if (tempCategories.includes(categoryName)) {
            setTempCategories(tempCategories.filter(c => c !== categoryName));
        } else {
            setTempCategories([...tempCategories, categoryName]);
        }
    };

    const toggleTempAccount = (accountId: string) => {
        if (tempAccounts.includes(accountId)) {
            setTempAccounts(tempAccounts.filter(a => a !== accountId));
        } else {
            setTempAccounts([...tempAccounts, accountId]);
        }
    };

    const changeYear = (delta: number) => {
        const newDate = new Date(selectedDate);
        newDate.setFullYear(selectedDate.getFullYear() + delta);
        setSelectedDate(newDate);
    };

    const selectMonth = (index: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(index);
        setSelectedDate(newDate);
    };

    const handleDelete = async (item: any) => {
        if (Platform.OS === 'web') {
            if (window.confirm(`Are you sure you want to delete this ${item.type.toLowerCase()} transaction of ₹${item.amount}?`)) {
                try {
                    await deleteTransaction(item.id);
                } catch (error) {
                    window.alert('Failed to delete transaction');
                }
            }
        } else {
            const { Alert } = require('react-native');
            Alert.alert(
                'Delete Transaction',
                `Are you sure you want to delete this ${item.type.toLowerCase()} transaction of ₹${item.amount}?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete', style: 'destructive', onPress: async () => {
                            try {
                                await deleteTransaction(item.id);
                            } catch (error) {
                                Alert.alert('Error', 'Failed to delete transaction');
                            }
                        }
                    },
                ]
            );
        }
    };



    const categoryMap = useMemo(() => {
        const map = new Map<string, any>();
        [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES, ...TRANSFER_CATEGORIES].forEach(c => {
            map.set(`${c.type}_${c.name}`, c);
            if (!map.has(c.name)) map.set(c.name, c);
        });
        return map;
    }, []);

    const renderItem = ({ item }: { item: any }) => {
        const isTransfer = item.type === 'TRANSFER';
        const categoryData = categoryMap.get(`${item.type}_${item.category}`) ||
            categoryMap.get(item.category) ||
            { icon: isTransfer ? 'rotate-ccw' : 'package', color: isTransfer ? Colors.primary : Colors.textMuted };

        const fromAccName = getAccountName(item.accountId);
        const toAccName = item.toAccountId ? getAccountName(item.toAccountId) : '';
        const accountDisplay = isTransfer && toAccName ? `${fromAccName} ➔ ${toAccName}` : fromAccName;
        const formattedDate = format(new Date(item.date), 'dd MMM');

        return (
            <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.transactionItem, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                onPress={() => router.push({ pathname: '/add', params: { id: item.id } })}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
                    {/* Category Icon */}
                    <View style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: (categoryData.color || Colors.primary) + '15',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <IconRenderer name={categoryData.icon} color={categoryData.color || Colors.primary} size={20} />
                    </View>

                    {/* Transaction Info */}
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.text }} numberOfLines={1}>
                            {item.category || (isTransfer ? 'Self Transfer' : 'Expense')}
                        </Text>
                        <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                            {formattedDate} • {accountDisplay}{item.note ? ` • ${item.note}` : ''}
                        </Text>
                    </View>

                    {/* Amount & Actions */}
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{
                            fontSize: 15,
                            fontWeight: '700',
                            color: item.type === 'INCOME' ? Colors.income : item.type === 'EXPENSE' ? Colors.expense : Colors.primary
                        }}>
                            {item.type === 'INCOME' ? '+' : item.type === 'EXPENSE' ? '-' : '⇄ '}₹{item.amount.toLocaleString('en-IN')}
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                            <TouchableOpacity
                                style={{ padding: 2 }}
                                onPress={(e: any) => { e?.stopPropagation?.(); handleDuplicate(item); }}
                            >
                                <Copy color={Colors.textMuted} size={14} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ padding: 2 }}
                                onPress={(e: any) => { e?.stopPropagation?.(); router.push({ pathname: '/add', params: { id: item.id } }); }}
                            >
                                <Pencil color={Colors.primary} size={14} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ padding: 2 }}
                                onPress={(e: any) => { e?.stopPropagation?.(); handleDelete(item); }}
                            >
                                <Trash2 color={Colors.expense} size={14} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: Colors.background }]}>
            {/* Top Sub-tab Segmented Control */}
            <View style={{
                flexDirection: 'row',
                backgroundColor: Colors.surface,
                borderRadius: 14,
                padding: 4,
                marginHorizontal: 16,
                marginTop: topMargin,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: Colors.border
            }}>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        paddingVertical: 8,
                        alignItems: 'center',
                        borderRadius: 10,
                        backgroundColor: activeSubTab === 'HISTORY' ? Colors.primary : 'transparent'
                    }}
                    onPress={() => setActiveSubTab('HISTORY')}
                >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: activeSubTab === 'HISTORY' ? '#fff' : Colors.textMuted }}>
                        📜 History
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={{
                        flex: 1,
                        paddingVertical: 8,
                        alignItems: 'center',
                        borderRadius: 10,
                        backgroundColor: activeSubTab === 'REPORTS' ? Colors.primary : 'transparent'
                    }}
                    onPress={() => setActiveSubTab('REPORTS')}
                >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: activeSubTab === 'REPORTS' ? '#fff' : Colors.textMuted }}>
                        📊 Analytics & Reports
                    </Text>
                </TouchableOpacity>
            </View>

            {activeSubTab === 'REPORTS' ? (
                <ReportsView />
            ) : (
                <>
                    <View style={[styles.header, { backgroundColor: Colors.background, borderBottomColor: Colors.border }]}>
                <View style={styles.yearRow}>
                    <TouchableOpacity onPress={() => changeYear(-1)} style={styles.arrowBtn}>
                        <ChevronLeft color={Colors.textMuted} size={20} />
                    </TouchableOpacity>
                    <Text style={[styles.yearText, { color: Colors.text }]}>{selectedDate.getFullYear()}</Text>
                    <TouchableOpacity onPress={() => changeYear(1)} style={styles.arrowBtn}>
                        <ChevronRight color={Colors.textMuted} size={20} />
                    </TouchableOpacity>
                </View>
                <FlatList
                    ref={monthListRef}
                    data={MONTHS}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.monthScroll}
                    contentContainerStyle={styles.monthContent}
                    keyExtractor={(item) => item}
                    getItemLayout={getItemLayout}
                    onScrollToIndexFailed={(info) => {
                        const promise = new Promise((resolve) => setTimeout(resolve, 50));
                        promise.then(() => {
                            monthListRef.current?.scrollToIndex({
                                index: info.index,
                                animated: true,
                                viewPosition: 0.5,
                            });
                        });
                    }}
                    renderItem={({ item, index }) => {
                        const isSelected = selectedDate.getMonth() === index;
                        return (
                            <HoverCard
                                key={item}
                                style={[
                                    styles.monthChip,
                                    isSelected && { backgroundColor: Colors.primary, borderColor: Colors.primary }
                                ]}
                                onPress={() => selectMonth(index)}
                            >
                                <Text style={[
                                    styles.monthText,
                                    { color: isSelected ? Colors.white : Colors.textMuted }
                                ]}>{item}</Text>
                            </HoverCard>
                        );
                    }}
                />

                {/* Sleek Single-Row Search & Action Controls */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 10, height: 42 }}>
                        <Search color={Colors.textMuted} size={18} />
                        <TextInput
                            style={{ flex: 1, fontSize: 16, color: Colors.text, marginLeft: 8, paddingVertical: 0 }}
                            placeholder="Search notes, categories..."
                            placeholderTextColor={Colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                                <X color={Colors.textMuted} size={16} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: (selectedCategories.length > 0 || selectedAccounts.length > 0) ? Colors.primary + '20' : Colors.surface, borderWidth: 1, borderColor: (selectedCategories.length > 0 || selectedAccounts.length > 0) ? Colors.primary : Colors.border, justifyContent: 'center', alignItems: 'center' }}
                        onPress={openModal}
                    >
                        <SlidersHorizontal color={Colors.primary} size={18} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' }}
                        onPress={handleExportCSV}
                    >
                        <Download color={Colors.primary} size={18} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' }}
                        onPress={handleExportPDF}
                    >
                        <FileText color={Colors.primary} size={18} />
                    </TouchableOpacity>
                </View>

                {/* Compact Horizontal Preset & Type Filter Bar */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingBottom: 8 }}
                >
                    {/* Active Filters */}
                    {selectedCategories.map(cat => (
                        <TouchableOpacity
                            key={`cat-${cat}`}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.primary + '20', borderWidth: 1, borderColor: Colors.primary }}
                            onPress={() => setSelectedCategories(selectedCategories.filter(c => c !== cat))}
                        >
                            <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.primary }}>{cat}</Text>
                            <X color={Colors.primary} size={12} />
                        </TouchableOpacity>
                    ))}
                    {selectedAccounts.map(accId => (
                        <TouchableOpacity
                            key={`acc-${accId}`}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.income + '20', borderWidth: 1, borderColor: Colors.income }}
                            onPress={() => setSelectedAccounts(selectedAccounts.filter(a => a !== accId))}
                        >
                            <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.income }}>{getAccountName(accId)}</Text>
                            <X color={Colors.income} size={12} />
                        </TouchableOpacity>
                    ))}

                    {/* Type Filters */}
                    {['ALL', 'INCOME', 'EXPENSE', 'TRANSFER'].map((t) => (
                        <TouchableOpacity
                            key={t}
                            style={[
                                { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
                                filterType === t && { backgroundColor: Colors.primary, borderColor: Colors.primary }
                            ]}
                            onPress={() => setFilterType(t as any)}
                        >
                            <Text style={[
                                { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
                                filterType === t && { color: Colors.white }
                            ]}>
                                {t === 'TRANSFER' ? 'Transfer' : t.charAt(0) + t.slice(1).toLowerCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}

                    {/* Date Presets */}
                    {[
                        { id: 'THIS_MONTH', label: 'This Month' },
                        { id: 'TODAY', label: 'Today' },
                        { id: 'THIS_WEEK', label: 'This Week' },
                        { id: 'ALL_TIME', label: 'All Time' }
                    ].map((preset) => (
                        <TouchableOpacity
                            key={preset.id}
                            style={[
                                { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
                                datePreset === preset.id && { backgroundColor: Colors.primary + '15', borderColor: Colors.primary }
                            ]}
                            onPress={() => setDatePreset(preset.id as any)}
                        >
                            <Text style={[
                                { fontSize: 12, fontWeight: '500', color: Colors.textMuted },
                                datePreset === preset.id && { color: Colors.primary, fontWeight: '700' }
                            ]}>
                                {preset.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Month & Filter Total Summary Card */}
                <View style={[styles.summaryCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <View style={styles.summaryCardHeader}>
                        <View style={styles.summaryTitleGroup}>
                            <Text style={[styles.summaryMonthTitle, { color: Colors.text }]}>
                                {format(selectedDate, 'MMMM yyyy')} Summary
                            </Text>
                            {hasActiveFilters && (
                                <View style={[styles.filteredBadge, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '30' }]}>
                                    <Text style={[styles.filteredBadgeText, { color: Colors.primary }]}>Filtered</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.summaryCountText, { color: Colors.textMuted }]}>
                            {totals.count} {totals.count === 1 ? 'transaction' : 'transactions'}
                        </Text>
                    </View>

                    {filterType === 'EXPENSE' ? (
                        <View style={styles.singleStatContainer}>
                            <Text style={[styles.singleStatLabel, { color: Colors.textMuted }]}>Total Filtered Expense</Text>
                            <Text style={[styles.singleStatAmount, { color: Colors.expense }]}>
                                -₹{formatAmount(totals.expense)}
                            </Text>
                        </View>
                    ) : filterType === 'INCOME' ? (
                        <View style={styles.singleStatContainer}>
                            <Text style={[styles.singleStatLabel, { color: Colors.textMuted }]}>Total Filtered Income</Text>
                            <Text style={[styles.singleStatAmount, { color: Colors.income }]}>
                                +₹{formatAmount(totals.income)}
                            </Text>
                        </View>
                    ) : filterType === 'TRANSFER' ? (
                        <View style={styles.singleStatContainer}>
                            <Text style={[styles.singleStatLabel, { color: Colors.textMuted }]}>Total Filtered Transfers</Text>
                            <Text style={[styles.singleStatAmount, { color: Colors.primary }]}>
                                ₹{formatAmount(totals.transfer)}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.multiStatGrid}>
                            <View style={styles.multiStatBox}>
                                <Text style={[styles.multiStatLabel, { color: Colors.textMuted }]}>Income</Text>
                                <Text style={[styles.multiStatAmount, { color: Colors.income }]}>
                                    +₹{formatAmount(totals.income)}
                                </Text>
                            </View>
                            <View style={[styles.statDividerVertical, { backgroundColor: Colors.border }]} />
                            <View style={styles.multiStatBox}>
                                <Text style={[styles.multiStatLabel, { color: Colors.textMuted }]}>Expense</Text>
                                <Text style={[styles.multiStatAmount, { color: Colors.expense }]}>
                                    -₹{formatAmount(totals.expense)}
                                </Text>
                            </View>
                            <View style={[styles.statDividerVertical, { backgroundColor: Colors.border }]} />
                            <View style={styles.multiStatBox}>
                                <Text style={[styles.multiStatLabel, { color: Colors.textMuted }]}>Net Total</Text>
                                <Text style={[
                                    styles.multiStatAmount,
                                    { color: totals.net >= 0 ? Colors.income : Colors.expense }
                                ]}>
                                    {totals.net >= 0 ? '+' : ''}₹{formatAmount(totals.net)}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>
            <FlatList
                data={filteredTransactions}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
                initialNumToRender={12}
                maxToRenderPerBatch={10}
                windowSize={7}
                removeClippedSubviews={Platform.OS !== 'web'}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, { color: Colors.textMuted }]}>No matching transactions found.</Text>
                    </View>
                }
            />

            {/* Modal filter overlay */}
            <Modal
                visible={isFilterModalOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={handleCancel}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                        {/* Modal Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: Colors.border }]}>
                            <Text style={[styles.modalTitle, { color: Colors.text }]}>Filter Transactions</Text>
                            <TouchableOpacity onPress={handleCancel} style={styles.modalCloseButton}>
                                <X color={Colors.textMuted} size={22} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            {/* Categories Section */}
                            <View style={styles.modalSection}>
                                <Text style={[styles.sectionTitle, { color: Colors.text }]}>Categories</Text>
                                <View style={styles.chipsGrid}>
                                    {categoriesToSelect.map(cat => {
                                        const isSelected = tempCategories.includes(cat.name);
                                        return (
                                            <TouchableOpacity
                                                key={`temp-cat-${cat.name}`}
                                                style={[
                                                    styles.modalChip,
                                                    { borderColor: Colors.border, backgroundColor: Colors.background },
                                                    isSelected && { backgroundColor: Colors.primary + '15', borderColor: Colors.primary }
                                                ]}
                                                onPress={() => toggleTempCategory(cat.name)}
                                            >
                                                <Text style={[
                                                    styles.modalChipText,
                                                    { color: Colors.text },
                                                    isSelected && { color: Colors.primary, fontWeight: '700' }
                                                ]}>
                                                    {cat.name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Accounts Section */}
                            <View style={styles.modalSection}>
                                <Text style={[styles.sectionTitle, { color: Colors.text }]}>Accounts / Banks</Text>
                                <View style={styles.chipsGrid}>
                                    {accountsToSelect.map(acc => {
                                        const isSelected = tempAccounts.includes(acc.id);
                                        return (
                                            <TouchableOpacity
                                                key={`temp-acc-${acc.id}`}
                                                style={[
                                                    styles.modalChip,
                                                    { borderColor: Colors.border, backgroundColor: Colors.background },
                                                    isSelected && { backgroundColor: Colors.income + '15', borderColor: Colors.income }
                                                ]}
                                                onPress={() => toggleTempAccount(acc.id)}
                                            >
                                                <Text style={[
                                                    styles.modalChipText,
                                                    { color: Colors.text },
                                                    isSelected && { color: Colors.income, fontWeight: '700' }
                                                ]}>
                                                    {acc.name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        </ScrollView>

                        {/* Modal Footer */}
                        <View style={[styles.modalFooter, { borderTopColor: Colors.border }]}>
                            <TouchableOpacity
                                style={[styles.modalResetButton, { borderColor: Colors.border }]}
                                onPress={handleReset}
                            >
                                <Text style={[styles.modalResetButtonText, { color: Colors.textMuted }]}>Reset All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalApplyButton, { backgroundColor: Colors.primary }]}
                                onPress={handleApply}
                            >
                                <Text style={styles.modalApplyButtonText}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
    },
    yearRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    yearText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginHorizontal: 20,
    },
    arrowBtn: {
        padding: 4,
    },
    monthScroll: {
        marginBottom: 16,
        marginHorizontal: -20,
    },
    monthContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 8,
    },
    monthChip: {
        width: 64,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    monthText: {
        fontSize: 14,
        fontWeight: '600',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 44,
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
        marginBottom: 16,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        gap: 8,
    },
    infoText: {
        fontSize: 12,
        fontWeight: '500',
        flex: 1,
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
        padding: 0, // Reset padding as internal views handle it
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        overflow: 'hidden', // Ensure header background doesn't bleed
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        gap: 8,
    },
    cardBody: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    actionBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 'auto',
        gap: 8,
    },
    actionIconButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateBlock: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingRight: 16,
        borderRightWidth: 1,
        width: 55,
    },
    iconContainer: {
        marginHorizontal: 16,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    txDetails: {
        flex: 1,
        paddingHorizontal: 12,
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
    txCategory: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    txNote: {
        fontSize: 12,
        marginTop: 2,
    },
    amountBlock: {
        alignItems: 'flex-start',
        flex: 1,
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
        marginLeft: 8,
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    editButton: {
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
    // New Filter Styles
    filterHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        marginBottom: 16,
        gap: 8,
    },
    activeChipsScroll: {
        flex: 1,
    },
    activeChipsContent: {
        alignItems: 'center',
        gap: 8,
    },
    noActiveFiltersText: {
        fontSize: 14,
        fontStyle: 'italic',
    },
    activeFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        gap: 4,
    },
    activeFilterChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    activeFilterChipIcon: {
        marginLeft: 2,
    },
    filterIconButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 16,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: '80%',
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalBody: {
        marginVertical: 16,
    },
    modalSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    chipsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    modalChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
    },
    modalChipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    modalResetButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalResetButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    modalApplyButton: {
        flex: 2,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalApplyButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    // Summary Card Styles
    summaryCard: {
        marginTop: 12,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    summaryCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    summaryTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    summaryMonthTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    filteredBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
    },
    filteredBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    summaryCountText: {
        fontSize: 12,
        fontWeight: '500',
    },
    singleStatContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 4,
    },
    singleStatLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    singleStatAmount: {
        fontSize: 20,
        fontWeight: '800',
    },
    multiStatGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingTop: 4,
    },
    multiStatBox: {
        flex: 1,
        alignItems: 'center',
    },
    multiStatLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 2,
    },
    multiStatAmount: {
        fontSize: 14,
        fontWeight: '700',
    },
    statDividerVertical: {
        width: 1,
        height: 24,
        marginHorizontal: 4,
    },
});
