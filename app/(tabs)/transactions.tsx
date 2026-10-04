import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView, Platform, Modal } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFinance } from '../../src/context/FinanceContext';
import { useThemeColors } from '../../src/theme/colors';
import {
    Search, Trash2, Calendar, ChevronLeft, ChevronRight, ChevronDown, Pencil,
    Briefcase, PiggyBank, Gift, TrendingUp, Laptop, Package,
    Utensils, Activity, Home, Car, User, PawPrint, Film, CreditCard, Wallet, Landmark,
    SlidersHorizontal, X, Download, Copy, FileText, RotateCcw,
    LayoutList, List, Zap, Award, Calculator as CalculatorIcon
} from 'lucide-react-native';
import { useCalculator } from '../../src/context/CalculatorContext';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, TRANSFER_CATEGORIES } from '../../src/models';
import { format, parseISO, isSameMonth, isSameYear, isToday, isYesterday, isSameWeek } from 'date-fns';
import ReportsView from './reports';

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

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
        case 'rotate-ccw': return <RotateCcw color={color} size={size} />;
        case 'package': return <Package color={color} size={size} />;
        default: return <Package color={color} size={size} />;
    }
};

export type CreditFilterType = 'ALL' | 'NON_CREDIT' | 'CREDIT';
export type ViewDensity = 'DETAILED' | 'COMPACT';

export interface TransactionGroup {
    key: string;
    title: string;
    date: string;
    totalIncome: number;
    totalExpense: number;
    net: number;
    items: any[];
}

export default function TransactionsHistory() {
    const Colors = useThemeColors();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const topMargin = Math.max(insets.top, Platform.OS === 'web' ? 10 : 6);
    const bottomPadding = Math.max(insets.bottom + 85, 105);

    const { transactions, deleteTransaction, bankAccounts, creditCards, cashAccountName } = useFinance();
    const { openCalculator } = useCalculator();
    const params = useLocalSearchParams<{ category?: string; accountId?: string; account?: string; date?: string; type?: string; mode?: string }>();
    const [activeSubTab, setActiveSubTab] = useState<'HISTORY' | 'REPORTS'>('HISTORY');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [creditFilter, setCreditFilter] = useState<CreditFilterType>('ALL');
    const [viewDensity, setViewDensity] = useState<ViewDensity>('DETAILED');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

    // Modal temp states
    const [tempCategories, setTempCategories] = useState<string[]>([]);
    const [tempAccounts, setTempAccounts] = useState<string[]>([]);
    const [tempCreditFilter, setTempCreditFilter] = useState<CreditFilterType>('ALL');

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'>('ALL');
    const [datePreset, setDatePreset] = useState<'THIS_MONTH' | 'TODAY' | 'THIS_WEEK' | 'ALL_TIME'>('THIS_MONTH');

    // Date state
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());

    const getAccountName = useCallback((id: string) => {
        if (id === 'cash') return cashAccountName;
        const bank = bankAccounts.find(b => b.id === id);
        if (bank) return bank.bankName;
        const card = creditCards.find(c => c.id === id);
        if (card) return card.cardName;
        return id;
    }, [cashAccountName, bankAccounts, creditCards]);

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
                    if (rawAcc === 'NON_CREDIT' || rawAcc === 'CREDIT' || rawAcc === 'ALL') {
                        setCreditFilter(rawAcc);
                    } else {
                        const accObj = bankAccounts.find(b => b.id === rawAcc || b.bankName === rawAcc) ||
                            creditCards.find(c => c.id === rawAcc || c.cardName === rawAcc) ||
                            (rawAcc === 'cash' || rawAcc === cashAccountName ? { id: 'cash' } : null);

                        if (accObj) {
                            setSelectedAccounts([accObj.id]);
                        } else if (rawAcc) {
                            setSelectedAccounts([rawAcc as string]);
                        }
                    }
                }
                if (hasType) {
                    setFilterType(params.type as 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER');
                }
                if (hasDate) {
                    const parsed = new Date(params.date as string);
                    setSelectedDate(parsed);
                    setPickerYear(parsed.getFullYear());
                }
                router.setParams({ category: '', accountId: '', account: '', date: '', type: '' });
            }
        }
    }, [params.category, params.accountId, params.account, params.date, params.type, bankAccounts, creditCards, cashAccountName, router]);

    const filteredTransactions = useMemo(() => {
        const now = new Date();
        const result = transactions.filter(tx => {
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

            const isCardAccount = creditCards.some(c => c.id === tx.accountId) || tx.accountId === 'credit';
            const isCardPayment = tx.category === 'Credit Card Payment';
            const effectiveType = (isCardAccount && isCardPayment) ? 'TRANSFER' : tx.type;
            const matchesType = filterType === 'ALL' || effectiveType === filterType;
            const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(tx.category);
            const matchesAccount = selectedAccounts.length === 0 || selectedAccounts.includes(tx.accountId);

            const isCreditTx = isCardAccount || (tx.type === 'TRANSFER' && creditCards.some(c => c.id === tx.toAccountId));

            let matchesCreditFilter = true;
            if (creditFilter === 'NON_CREDIT') {
                matchesCreditFilter = !isCreditTx;
            } else if (creditFilter === 'CREDIT') {
                matchesCreditFilter = isCreditTx;
            }

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

            return matchesDate && matchesType && matchesCategory && matchesAccount && matchesCreditFilter && matchesSearch;
        });

        return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, filterType, selectedDate, selectedCategories, selectedAccounts, creditFilter, searchQuery, datePreset, getAccountName, creditCards]);

    const totals = useMemo(() => {
        let income = 0;
        let expense = 0;
        let transfer = 0;

        filteredTransactions.forEach(tx => {
            const amt = Number(tx.amount) || 0;
            const isCardAccount = creditCards.some(c => c.id === tx.accountId) || tx.accountId === 'credit';
            const isCardPayment = tx.category === 'Credit Card Payment';

            if (isCardAccount && isCardPayment) {
                transfer += amt;
            } else if (tx.type === 'INCOME') {
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
    }, [filteredTransactions, creditCards]);

    const insights = useMemo(() => {
        const expenseDates = new Set<string>();
        const categoryExpenses: Record<string, number> = {};
        let maxExpense = 0;

        filteredTransactions.forEach(tx => {
            const isCardAccount = creditCards.some(c => c.id === tx.accountId) || tx.accountId === 'credit';
            const isCardPayment = tx.category === 'Credit Card Payment';
            const amt = Number(tx.amount) || 0;

            if (tx.type === 'EXPENSE' && !(isCardAccount && isCardPayment)) {
                if (tx.date) expenseDates.add(tx.date.split('T')[0]);
                categoryExpenses[tx.category] = (categoryExpenses[tx.category] || 0) + amt;
                if (amt > maxExpense) {
                    maxExpense = amt;
                }
            }
        });

        const activeDays = Math.max(expenseDates.size, 1);
        const dailyAvg = totals.expense > 0 ? Math.round(totals.expense / activeDays) : 0;

        let topCategoryName = 'None';
        let topCategoryAmount = 0;
        Object.entries(categoryExpenses).forEach(([cat, sum]) => {
            if (sum > topCategoryAmount) {
                topCategoryAmount = sum;
                topCategoryName = cat;
            }
        });

        const topCategoryPercent = totals.expense > 0 ? Math.round((topCategoryAmount / totals.expense) * 100) : 0;

        return {
            dailyAvg,
            topCategoryName,
            topCategoryAmount,
            topCategoryPercent,
            maxExpense,
            activeDays
        };
    }, [filteredTransactions, totals.expense, creditCards]);

    const formatDateHeader = (dateStr: string) => {
        try {
            const d = parseISO(dateStr);
            if (isToday(d)) return `Today, ${format(d, 'dd MMM')}`;
            if (isYesterday(d)) return `Yesterday, ${format(d, 'dd MMM')}`;
            return format(d, 'EEE, dd MMM yyyy');
        } catch {
            return dateStr;
        }
    };

    const groupedTransactions = useMemo<TransactionGroup[]>(() => {
        if (filteredTransactions.length === 0) return [];

        const groupsMap = new Map<string, TransactionGroup>();

        filteredTransactions.forEach(tx => {
            const dateKey = tx.date ? tx.date.split('T')[0] : 'Unknown';
            if (!groupsMap.has(dateKey)) {
                groupsMap.set(dateKey, {
                    key: dateKey,
                    title: formatDateHeader(dateKey),
                    date: dateKey,
                    totalIncome: 0,
                    totalExpense: 0,
                    net: 0,
                    items: []
                });
            }
            const grp = groupsMap.get(dateKey)!;
            grp.items.push(tx);
            const amt = Number(tx.amount) || 0;
            const isCardAccount = creditCards.some(c => c.id === tx.accountId) || tx.accountId === 'credit';
            const isCardPayment = tx.category === 'Credit Card Payment';
            if (!(isCardAccount && isCardPayment)) {
                if (tx.type === 'INCOME') grp.totalIncome += amt;
                else if (tx.type === 'EXPENSE') grp.totalExpense += amt;
            }
            grp.net = Math.round((grp.totalIncome - grp.totalExpense) * 100) / 100;
        });

        return Array.from(groupsMap.values());
    }, [filteredTransactions, creditCards]);

    const activeFilterCount = (selectedCategories.length) +
        (selectedAccounts.length) +
        (creditFilter !== 'ALL' ? 1 : 0) +
        (filterType !== 'ALL' ? 1 : 0) +
        (datePreset !== 'THIS_MONTH' ? 1 : 0);

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
        setTempCreditFilter(creditFilter);
        setIsFilterModalOpen(true);
    };

    const handleApply = () => {
        setSelectedCategories([...tempCategories]);
        setSelectedAccounts([...tempAccounts]);
        setCreditFilter(tempCreditFilter);
        setIsFilterModalOpen(false);
    };

    const handleReset = () => {
        setTempCategories([]);
        setTempAccounts([]);
        setTempCreditFilter('ALL');
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

    // Zero-overflow month stepper
    const stepMonth = (delta: number) => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const newDate = new Date(year, month + delta, 1);
        setSelectedDate(newDate);
        setPickerYear(newDate.getFullYear());
        setDatePreset('THIS_MONTH');
    };

    const openMonthPicker = () => {
        setPickerYear(selectedDate.getFullYear());
        setIsMonthPickerOpen(true);
    };

    const selectPickerMonth = (monthIndex: number) => {
        const newDate = new Date(pickerYear, monthIndex, 1);
        setSelectedDate(newDate);
        setDatePreset('THIS_MONTH');
        setIsMonthPickerOpen(false);
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

    const renderDetailedItem = (item: any) => {
        const isCardAccount = creditCards.some(c => c.id === item.accountId) || item.accountId === 'credit';
        const isCardPayment = item.category === 'Credit Card Payment';
        const displayType = (isCardAccount && isCardPayment) ? 'TRANSFER' : item.type;
        const isTransfer = displayType === 'TRANSFER';
        const categoryData = categoryMap.get(`${displayType}_${item.category}`) ||
            categoryMap.get(item.category) ||
            { icon: isTransfer ? (isCardPayment ? 'credit-card' : 'rotate-ccw') : (isCardPayment ? 'credit-card' : 'package'), color: isTransfer ? Colors.primary : Colors.textMuted };

        const fromAccName = getAccountName(item.accountId);
        const toAccName = item.toAccountId ? getAccountName(item.toAccountId) : '';
        const accountDisplay = isTransfer && toAccName && toAccName !== fromAccName ? `${fromAccName} ➔ ${toAccName}` : fromAccName;
        const formattedDate = format(new Date(item.date), 'dd MMM');

        return (
            <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                style={[styles.transactionItem, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                onPress={() => router.push({ pathname: '/add', params: { id: item.id } })}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 }}>
                    {/* Category Icon */}
                    <View style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        backgroundColor: (categoryData.color || Colors.primary) + '15',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <IconRenderer name={categoryData.icon} color={categoryData.color || Colors.primary} size={18} />
                    </View>

                    {/* Transaction Info */}
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '700', color: Colors.text }} numberOfLines={1}>
                            {item.category || (isTransfer ? 'Self Transfer' : 'Expense')}
                        </Text>
                        <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 1 }} numberOfLines={1}>
                            {formattedDate} • {accountDisplay}{item.note ? ` • ${item.note}` : ''}
                        </Text>
                    </View>

                    {/* Amount & Actions */}
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{
                            fontSize: 14.5,
                            fontWeight: '700',
                            color: displayType === 'INCOME' ? Colors.income : displayType === 'EXPENSE' ? Colors.expense : Colors.primary
                        }}>
                            {displayType === 'INCOME' ? '+' : displayType === 'EXPENSE' ? '-' : '⇄ '}₹{item.amount.toLocaleString('en-IN')}
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 3 }}>
                            <TouchableOpacity
                                style={{ padding: 2 }}
                                onPress={(e: any) => { e?.stopPropagation?.(); handleDuplicate(item); }}
                            >
                                <Copy color={Colors.textMuted} size={13} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ padding: 2 }}
                                onPress={(e: any) => { e?.stopPropagation?.(); router.push({ pathname: '/add', params: { id: item.id } }); }}
                            >
                                <Pencil color={Colors.primary} size={13} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ padding: 2 }}
                                onPress={(e: any) => { e?.stopPropagation?.(); handleDelete(item); }}
                            >
                                <Trash2 color={Colors.expense} size={13} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderCompactItem = (item: any) => {
        const isCardAccount = creditCards.some(c => c.id === item.accountId) || item.accountId === 'credit';
        const isCardPayment = item.category === 'Credit Card Payment';
        const displayType = (isCardAccount && isCardPayment) ? 'TRANSFER' : item.type;
        const isTransfer = displayType === 'TRANSFER';
        const categoryData = categoryMap.get(`${displayType}_${item.category}`) ||
            categoryMap.get(item.category) ||
            { icon: isTransfer ? 'rotate-ccw' : 'package', color: Colors.primary };

        const fromAccName = getAccountName(item.accountId);
        const toAccName = item.toAccountId ? getAccountName(item.toAccountId) : '';
        const accountDisplay = isTransfer && toAccName && toAccName !== fromAccName ? `${fromAccName} ➔ ${toAccName}` : fromAccName;

        return (
            <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                style={[styles.compactItem, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                onPress={() => router.push({ pathname: '/add', params: { id: item.id } })}
            >
                <View style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: (categoryData.color || Colors.primary) + '15',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 8,
                }}>
                    <IconRenderer name={categoryData.icon} color={categoryData.color || Colors.primary} size={14} />
                </View>

                <View style={{ flex: 1, marginRight: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: Colors.text }} numberOfLines={1}>
                            {item.category || (isTransfer ? 'Transfer' : 'Expense')}
                        </Text>
                        <Text style={{ fontSize: 11, color: Colors.textMuted }} numberOfLines={1}>
                            • {accountDisplay}
                        </Text>
                    </View>
                    {item.note ? (
                        <Text style={{ fontSize: 10.5, color: Colors.textMuted, marginTop: 1 }} numberOfLines={1}>
                            {item.note}
                        </Text>
                    ) : null}
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{
                        fontSize: 13.5,
                        fontWeight: '700',
                        color: displayType === 'INCOME' ? Colors.income : displayType === 'EXPENSE' ? Colors.expense : Colors.primary
                    }}>
                        {displayType === 'INCOME' ? '+' : displayType === 'EXPENSE' ? '-' : '⇄ '}₹{item.amount.toLocaleString('en-IN')}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderGroup = ({ item: group }: { item: TransactionGroup }) => {
        return (
            <View style={styles.groupContainer} key={group.key}>
                {/* Day Timeline Header Banner */}
                {group.title ? (
                    <View style={styles.groupHeaderRow}>
                        <View style={styles.groupHeaderLeft}>
                            <Calendar size={12} color={Colors.primary} />
                            <Text style={[styles.groupDateText, { color: Colors.text }]}>
                                {group.title}
                            </Text>
                            <View style={[styles.groupCountBadge, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                                <Text style={[styles.groupCountText, { color: Colors.textMuted }]}>
                                    {group.items.length} {group.items.length === 1 ? 'txn' : 'txns'}
                                </Text>
                            </View>
                        </View>

                        {/* Daily Subtotal Badge */}
                        <View style={styles.groupHeaderRight}>
                            {group.totalExpense > 0 && (
                                <Text style={[styles.groupExpenseText, { color: Colors.expense }]}>
                                    -₹{formatAmount(group.totalExpense)}
                                </Text>
                            )}
                            {group.totalIncome > 0 && (
                                <Text style={[styles.groupIncomeText, { color: Colors.income }]}>
                                    +₹{formatAmount(group.totalIncome)}
                                </Text>
                            )}
                        </View>
                    </View>
                ) : null}

                {/* List of items inside this group */}
                <View style={styles.groupItemsContainer}>
                    {group.items.map((tx: any) => (
                        <React.Fragment key={tx.id}>
                            {viewDensity === 'COMPACT' ? renderCompactItem(tx) : renderDetailedItem(tx)}
                        </React.Fragment>
                    ))}
                </View>
            </View>
        );
    };

    if (activeSubTab === 'REPORTS') {
        return <ReportsView initialDate={selectedDate} onSubTabChange={setActiveSubTab} />;
    }

    return (
        <View style={[styles.container, { backgroundColor: Colors.background }]}>
            {/* COMPACT UNIFIED HEADER CONTAINER */}
            <View style={[styles.compactHeaderWrapper, { backgroundColor: Colors.background, paddingTop: topMargin }]}>
                
                {/* 1. TOP BAR: SubTabs + Interactive Month Navigator */}
                <View style={styles.topNavRow}>
                    {/* Compact Subtab Pills */}
                    <View style={[styles.subtabContainer, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                        <TouchableOpacity
                            style={[styles.subtabBtn, { backgroundColor: Colors.primary }]}
                            onPress={() => setActiveSubTab('HISTORY')}
                        >
                            <Text style={[styles.subtabText, { color: '#fff' }]}>
                                📜 History
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.subtabBtn}
                            onPress={() => setActiveSubTab('REPORTS')}
                        >
                            <Text style={[styles.subtabText, { color: Colors.textMuted }]}>
                                📊 Reports
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Month Navigator Stepper + Modal Trigger */}
                    <View style={[styles.monthNavGroup, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                        <TouchableOpacity onPress={() => stepMonth(-1)} style={styles.monthStepBtn} accessibilityLabel="Previous month">
                            <ChevronLeft color={Colors.textMuted} size={16} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={openMonthPicker} style={styles.monthLabelBtn} activeOpacity={0.7}>
                            <Text style={[styles.monthNavText, { color: Colors.text }]}>
                                {format(selectedDate, 'MMM yyyy')}
                            </Text>
                            <ChevronDown color={Colors.textMuted} size={14} style={{ marginLeft: 3 }} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => stepMonth(1)} style={styles.monthStepBtn} accessibilityLabel="Next month">
                            <ChevronRight color={Colors.textMuted} size={16} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 2. COMMAND ACTION ROW: Search + Density + Filter + Export */}
                <View style={styles.commandBarRow}>
                    {/* Search Input */}
                    <View style={[styles.searchBox, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                        <Search color={Colors.textMuted} size={16} />
                        <TextInput
                            style={[styles.searchInput, { color: Colors.text }]}
                            placeholder="Search note, category, account, ₹..."
                            placeholderTextColor={Colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 2 }}>
                                <X color={Colors.textMuted} size={14} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Density View Toggle Button */}
                    <TouchableOpacity
                        style={[
                            styles.iconActionBtn,
                            { backgroundColor: viewDensity === 'COMPACT' ? Colors.primary + '18' : Colors.surface, borderColor: viewDensity === 'COMPACT' ? Colors.primary : Colors.border }
                        ]}
                        onPress={() => setViewDensity(prev => prev === 'DETAILED' ? 'COMPACT' : 'DETAILED')}
                        accessibilityLabel="Toggle list density"
                    >
                        {viewDensity === 'COMPACT' ? (
                            <List color={Colors.primary} size={16} />
                        ) : (
                            <LayoutList color={Colors.textMuted} size={16} />
                        )}
                    </TouchableOpacity>

                    {/* Filter Modal Trigger with Badge */}
                    <TouchableOpacity
                        style={[
                            styles.iconActionBtn,
                            { backgroundColor: activeFilterCount > 0 ? Colors.primary + '18' : Colors.surface, borderColor: activeFilterCount > 0 ? Colors.primary : Colors.border }
                        ]}
                        onPress={openModal}
                        accessibilityLabel="Filter options"
                    >
                        <SlidersHorizontal color={activeFilterCount > 0 ? Colors.primary : Colors.textMuted} size={16} />
                        {activeFilterCount > 0 && (
                            <View style={[styles.filterBadgeCircle, { backgroundColor: Colors.primary, borderColor: Colors.background }]}>
                                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* CSV Export Button */}
                    <TouchableOpacity
                        style={[styles.iconActionBtn, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                        onPress={handleExportCSV}
                        accessibilityLabel="Export CSV"
                    >
                        <Download color={Colors.primary} size={16} />
                    </TouchableOpacity>

                    {/* Calculator Quick Action Button */}
                    <TouchableOpacity
                        style={[styles.iconActionBtn, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                        onPress={() => openCalculator()}
                        accessibilityLabel="Open Calculator"
                    >
                        <CalculatorIcon color={Colors.primary} size={16} />
                    </TouchableOpacity>
                </View>

                {/* 3. COMPACT ACCOUNT & TYPE FILTER PILLS STRIP */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterStripContent}
                >
                    {/* Account Classification Pills */}
                    {[
                        { id: 'ALL', label: 'All Accounts' },
                        { id: 'NON_CREDIT', label: '💵 Non-Credit' },
                        { id: 'CREDIT', label: '💳 Credit' },
                    ].map((item) => {
                        const isSelected = creditFilter === item.id;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[
                                    styles.miniFilterPill,
                                    { borderColor: Colors.border, backgroundColor: Colors.surface },
                                    isSelected && { backgroundColor: Colors.primary, borderColor: Colors.primary }
                                ]}
                                onPress={() => setCreditFilter(item.id as CreditFilterType)}
                            >
                                <Text style={[
                                    styles.miniFilterPillText,
                                    { color: isSelected ? '#fff' : Colors.textMuted, fontWeight: isSelected ? '700' : '500' }
                                ]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}

                    <View style={[styles.stripDivider, { backgroundColor: Colors.border }]} />

                    {/* Type Filter Pills */}
                    {['ALL', 'INCOME', 'EXPENSE', 'TRANSFER'].map((t) => (
                        <TouchableOpacity
                            key={t}
                            style={[
                                styles.miniFilterPill,
                                { borderColor: Colors.border, backgroundColor: Colors.surface },
                                filterType === t && { backgroundColor: Colors.primary + '18', borderColor: Colors.primary }
                            ]}
                            onPress={() => setFilterType(t as any)}
                        >
                            <Text style={[
                                styles.miniFilterPillText,
                                { color: filterType === t ? Colors.primary : Colors.textMuted, fontWeight: filterType === t ? '700' : '500' }
                            ]}>
                                {t === 'ALL' ? 'All Types' : t === 'TRANSFER' ? 'Transfer' : t.charAt(0) + t.slice(1).toLowerCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}

                    <View style={[styles.stripDivider, { backgroundColor: Colors.border }]} />

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
                                styles.miniFilterPill,
                                { borderColor: Colors.border, backgroundColor: Colors.surface },
                                datePreset === preset.id && { backgroundColor: Colors.primary + '18', borderColor: Colors.primary }
                            ]}
                            onPress={() => setDatePreset(preset.id as any)}
                        >
                            <Text style={[
                                styles.miniFilterPillText,
                                { color: datePreset === preset.id ? Colors.primary : Colors.textMuted, fontWeight: datePreset === preset.id ? '700' : '500' }
                            ]}>
                                {preset.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Active Filter Dismissible Badges (Category & Account) */}
                {(selectedCategories.length > 0 || selectedAccounts.length > 0) && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingBottom: 6 }}
                    >
                        {selectedCategories.map(cat => (
                            <TouchableOpacity
                                key={`cat-${cat}`}
                                style={[styles.activeBadge, { backgroundColor: Colors.primary + '18', borderColor: Colors.primary }]}
                                onPress={() => setSelectedCategories(selectedCategories.filter(c => c !== cat))}
                            >
                                <Text style={[styles.activeBadgeText, { color: Colors.primary }]}>{cat}</Text>
                                <X color={Colors.primary} size={11} />
                            </TouchableOpacity>
                        ))}
                        {selectedAccounts.map(accId => (
                            <TouchableOpacity
                                key={`acc-${accId}`}
                                style={[styles.activeBadge, { backgroundColor: Colors.income + '18', borderColor: Colors.income }]}
                                onPress={() => setSelectedAccounts(selectedAccounts.filter(a => a !== accId))}
                            >
                                <Text style={[styles.activeBadgeText, { color: Colors.income }]}>{getAccountName(accId)}</Text>
                                <X color={Colors.income} size={11} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* 4. SLEEK COMPACT FINANCIAL SUMMARY RIBBON */}
                <View style={[styles.summaryRibbon, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    {/* Primary Stats Row */}
                    <View style={styles.ribbonPrimaryRow}>
                        <View style={styles.ribbonStatItem}>
                            <Text style={[styles.ribbonStatLabel, { color: Colors.textMuted }]}>INCOME</Text>
                            <Text style={[styles.ribbonStatValue, { color: Colors.income }]}>
                                +₹{formatAmount(totals.income)}
                            </Text>
                        </View>

                        <View style={[styles.ribbonVerticalDivider, { backgroundColor: Colors.border }]} />

                        <View style={styles.ribbonStatItem}>
                            <Text style={[styles.ribbonStatLabel, { color: Colors.textMuted }]}>EXPENSE</Text>
                            <Text style={[styles.ribbonStatValue, { color: Colors.expense }]}>
                                -₹{formatAmount(totals.expense)}
                            </Text>
                        </View>

                        <View style={[styles.ribbonVerticalDivider, { backgroundColor: Colors.border }]} />

                        <View style={styles.ribbonStatItem}>
                            <Text style={[styles.ribbonStatLabel, { color: Colors.textMuted }]}>NET TOTAL</Text>
                            <Text style={[
                                styles.ribbonStatValue,
                                { color: totals.net >= 0 ? Colors.income : Colors.expense }
                            ]}>
                                {totals.net >= 0 ? '+' : ''}₹{formatAmount(totals.net)}
                            </Text>
                        </View>

                        <View style={[styles.ribbonVerticalDivider, { backgroundColor: Colors.border }]} />

                        <View style={[styles.ribbonStatItem, { flex: 0.8 }]}>
                            <Text style={[styles.ribbonStatLabel, { color: Colors.textMuted }]}>COUNT</Text>
                            <Text style={[styles.ribbonStatValue, { color: Colors.text }]}>
                                {totals.count} txns
                            </Text>
                        </View>
                    </View>

                    {/* Secondary Micro-Insight Strip */}
                    {totals.expense > 0 && (
                        <View style={[styles.ribbonInsightRow, { borderTopColor: Colors.border }]}>
                            <View style={styles.microInsightGroup}>
                                <Zap size={11} color="#F59E0B" />
                                <Text style={[styles.microInsightText, { color: Colors.textMuted }]}>
                                    Burn: <Text style={{ color: Colors.text, fontWeight: '700' }}>₹{formatAmount(insights.dailyAvg)}/d</Text>
                                </Text>
                            </View>

                            <Text style={{ color: Colors.border, fontSize: 10 }}>•</Text>

                            <View style={styles.microInsightGroup}>
                                <Award size={11} color="#8B5CF6" />
                                <Text style={[styles.microInsightText, { color: Colors.textMuted }]} numberOfLines={1}>
                                    Top: <Text style={{ color: Colors.text, fontWeight: '700' }}>{insights.topCategoryName} ({insights.topCategoryPercent}%)</Text>
                                </Text>
                            </View>

                            <Text style={{ color: Colors.border, fontSize: 10 }}>•</Text>

                            <View style={styles.microInsightGroup}>
                                <TrendingUp size={11} color={Colors.expense} />
                                <Text style={[styles.microInsightText, { color: Colors.textMuted }]}>
                                    Max: <Text style={{ color: Colors.expense, fontWeight: '700' }}>₹{formatAmount(insights.maxExpense)}</Text>
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>

            {/* MAIN FLATLIST */}
            <FlatList
                data={groupedTransactions}
                keyExtractor={(item) => item.key}
                renderItem={renderGroup}
                contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
                initialNumToRender={10}
                maxToRenderPerBatch={8}
                windowSize={7}
                removeClippedSubviews={Platform.OS !== 'web'}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, { color: Colors.textMuted }]}>No matching transactions found.</Text>
                    </View>
                }
            />

            {/* POPUP MONTH / YEAR PICKER MODAL */}
            <Modal
                visible={isMonthPickerOpen}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsMonthPickerOpen(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.monthPickerCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                        {/* Year Stepper Header */}
                        <View style={[styles.pickerYearHeader, { borderBottomColor: Colors.border }]}>
                            <TouchableOpacity onPress={() => setPickerYear(prev => prev - 1)} style={styles.yearArrowBtn}>
                                <ChevronLeft color={Colors.text} size={20} />
                            </TouchableOpacity>
                            <Text style={[styles.pickerYearText, { color: Colors.text }]}>{pickerYear}</Text>
                            <TouchableOpacity onPress={() => setPickerYear(prev => prev + 1)} style={styles.yearArrowBtn}>
                                <ChevronRight color={Colors.text} size={20} />
                            </TouchableOpacity>
                        </View>

                        {/* 12 Months 4x3 Grid */}
                        <View style={styles.monthGrid}>
                            {MONTHS.map((m, idx) => {
                                const isCurrent = selectedDate.getFullYear() === pickerYear && selectedDate.getMonth() === idx;
                                return (
                                    <TouchableOpacity
                                        key={m}
                                        style={[
                                            styles.monthGridBtn,
                                            { borderColor: Colors.border, backgroundColor: Colors.background },
                                            isCurrent && { backgroundColor: Colors.primary, borderColor: Colors.primary }
                                        ]}
                                        onPress={() => selectPickerMonth(idx)}
                                    >
                                        <Text style={[
                                            styles.monthGridText,
                                            { color: isCurrent ? '#fff' : Colors.text, fontWeight: isCurrent ? '700' : '600' }
                                        ]}>
                                            {m}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Current Month Shortcut Button */}
                        <TouchableOpacity
                            style={[styles.thisMonthBtn, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary }]}
                            onPress={() => {
                                const now = new Date();
                                setSelectedDate(new Date(now.getFullYear(), now.getMonth(), 1));
                                setDatePreset('THIS_MONTH');
                                setIsMonthPickerOpen(false);
                            }}
                        >
                            <Text style={[styles.thisMonthBtnText, { color: Colors.primary }]}>Jump to Current Month</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* COMPREHENSIVE FILTER MODAL */}
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
                            {/* Account Classification Section */}
                            <View style={styles.modalSection}>
                                <Text style={[styles.sectionTitle, { color: Colors.text }]}>Account Classification</Text>
                                <View style={styles.chipsGrid}>
                                    {[
                                        { id: 'ALL', label: 'All Transactions' },
                                        { id: 'NON_CREDIT', label: '💵 Non-Credit (Cash & Bank)' },
                                        { id: 'CREDIT', label: '💳 Credit Cards' },
                                    ].map(item => {
                                        const isSelected = tempCreditFilter === item.id;
                                        return (
                                            <TouchableOpacity
                                                key={`temp-grp-${item.id}`}
                                                style={[
                                                    styles.modalChip,
                                                    { borderColor: Colors.border, backgroundColor: Colors.background },
                                                    isSelected && { backgroundColor: Colors.primary + '15', borderColor: Colors.primary }
                                                ]}
                                                onPress={() => setTempCreditFilter(item.id as CreditFilterType)}
                                            >
                                                <Text style={[
                                                    styles.modalChipText,
                                                    { color: Colors.text },
                                                    isSelected && { color: Colors.primary, fontWeight: '700' }
                                                ]}>
                                                    {item.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

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

                            {/* Specific Accounts Section */}
                            <View style={styles.modalSection}>
                                <Text style={[styles.sectionTitle, { color: Colors.text }]}>Specific Accounts / Cards</Text>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    compactHeaderWrapper: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.06)',
        paddingBottom: 4,
    },
    topNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    subtabContainer: {
        flexDirection: 'row',
        borderRadius: 10,
        padding: 2.5,
        borderWidth: 1,
    },
    subtabBtn: {
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    subtabText: {
        fontSize: 12,
        fontWeight: '700',
    },
    monthNavGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 2,
        height: 32,
    },
    monthStepBtn: {
        paddingHorizontal: 6,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthLabelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    monthNavText: {
        fontSize: 12.5,
        fontWeight: '700',
    },
    commandBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 6,
        marginBottom: 8,
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        marginLeft: 6,
        paddingVertical: 0,
    },
    iconActionBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    filterBadgeCircle: {
        position: 'absolute',
        top: -3,
        right: -3,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
    },
    filterBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#fff',
    },
    filterStripContent: {
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 5,
        paddingBottom: 6,
    },
    miniFilterPill: {
        paddingHorizontal: 10,
        paddingVertical: 4.5,
        borderRadius: 12,
        borderWidth: 1,
    },
    miniFilterPillText: {
        fontSize: 11.5,
    },
    stripDivider: {
        width: 1,
        height: 14,
        marginHorizontal: 3,
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1,
    },
    activeBadgeText: {
        fontSize: 10.5,
        fontWeight: '600',
    },
    // Summary Ribbon Styles
    summaryRibbon: {
        marginHorizontal: 16,
        marginBottom: 6,
        borderRadius: 12,
        borderWidth: 1,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    ribbonPrimaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    ribbonStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    ribbonStatLabel: {
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    ribbonStatValue: {
        fontSize: 13,
        fontWeight: '800',
        marginTop: 1,
    },
    ribbonVerticalDivider: {
        width: 1,
        height: 20,
    },
    ribbonInsightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        paddingTop: 5,
        marginTop: 5,
    },
    microInsightGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    microInsightText: {
        fontSize: 10.5,
    },
    // List & Timeline Groups
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    groupContainer: {
        marginBottom: 14,
    },
    groupHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
        paddingHorizontal: 2,
    },
    groupHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    groupDateText: {
        fontSize: 12.5,
        fontWeight: '700',
    },
    groupCountBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        borderRadius: 6,
        borderWidth: 1,
    },
    groupCountText: {
        fontSize: 9.5,
        fontWeight: '600',
    },
    groupHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    groupExpenseText: {
        fontSize: 11.5,
        fontWeight: '700',
    },
    groupIncomeText: {
        fontSize: 11.5,
        fontWeight: '700',
    },
    groupItemsContainer: {
        gap: 6,
    },
    transactionItem: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    compactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 7.5,
        borderRadius: 10,
        borderWidth: 1,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 14,
    },
    // Month Picker Modal
    monthPickerCard: {
        width: 300,
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    pickerYearHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 12,
        borderBottomWidth: 1,
        marginBottom: 12,
    },
    pickerYearText: {
        fontSize: 17,
        fontWeight: '800',
    },
    yearArrowBtn: {
        padding: 6,
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'space-between',
    },
    monthGridBtn: {
        width: '30%',
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthGridText: {
        fontSize: 13,
    },
    thisMonthBtn: {
        marginTop: 14,
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
    },
    thisMonthBtnText: {
        fontSize: 12.5,
        fontWeight: '700',
    },
    // Filter Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    modalContent: {
        width: '100%',
        maxWidth: 600,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 16,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
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
        paddingBottom: 14,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: 'bold',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalBody: {
        marginVertical: 14,
    },
    modalSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 12.5,
        fontWeight: '700',
        marginBottom: 10,
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
        paddingVertical: 7,
        borderRadius: 12,
        borderWidth: 1,
    },
    modalChipText: {
        fontSize: 12.5,
        fontWeight: '500',
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 10,
        paddingTop: 14,
        borderTopWidth: 1,
    },
    modalResetButton: {
        flex: 1,
        height: 44,
        borderRadius: 10,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalResetButtonText: {
        fontSize: 13.5,
        fontWeight: '600',
    },
    modalApplyButton: {
        flex: 2,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalApplyButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
});
