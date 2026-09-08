import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Pressable, Platform, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '../../src/theme/colors';
import InteractiveDonut from '../../src/components/InteractiveDonut';
import { useFinance } from '../../src/context/FinanceContext';
import { parseISO, isSameMonth, isSameYear, format, subMonths, getDaysInMonth, getDate, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronDown, ArrowUpCircle, ArrowDownCircle, Wallet, Info, Tag, TrendingUp, TrendingDown, Activity, Zap, Award, Target, Calendar, ShoppingBag, X, SlidersHorizontal } from 'lucide-react-native';

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

const screenWidth = Dimensions.get('window').width;

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

interface ReportsProps {
    initialDate?: Date;
    onSubTabChange?: (tab: 'HISTORY' | 'REPORTS') => void;
}

export default function Reports({ initialDate, onSubTabChange }: ReportsProps = {}) {
    const Colors = useThemeColors();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const topMargin = Math.max(insets.top, Platform.OS === 'web' ? 10 : 6);

    const { transactions, bankAccounts, creditCards, cashAccountName, categoryBudgets } = useFinance();
    
    const [selectedExpenseCat, setSelectedExpenseCat] = useState<string | null>(null);
    const [selectedIncomeCat, setSelectedIncomeCat] = useState<string | null>(null);
    const [selectedDayInfo, setSelectedDayInfo] = useState<{ day: number; amount: number } | null>(null);

    const getAccountName = (id: string) => {
        if (id === 'cash') return cashAccountName;
        const bank = bankAccounts.find(b => b.id === id);
        if (bank) return bank.bankName;
        const card = creditCards.find(c => c.id === id);
        if (card) return card.cardName;
        return id;
    };

    const params = useLocalSearchParams();
    const [selectedAccount, setSelectedAccount] = useState((params.accountId as string) || 'all');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [tempSelectedAccount, setTempSelectedAccount] = useState((params.accountId as string) || 'all');
    
    // Controlled date state (preventing JS Date 31st overflow bugs)
    const [selectedDate, setSelectedDate] = useState(() => initialDate || new Date());
    const [pickerYear, setPickerYear] = useState(() => (initialDate || new Date()).getFullYear());
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

    useEffect(() => {
        if (initialDate) {
            setSelectedDate(initialDate);
            setPickerYear(initialDate.getFullYear());
        }
    }, [initialDate]);

    const navigateToHistory = (item: string | { name: string; accountId?: string }, type: 'EXPENSE' | 'INCOME') => {
        const itemName = typeof item === 'string' ? item : item.name;
        const accountId = typeof item === 'object' ? item.accountId : undefined;

        if (type === 'INCOME' && accountId) {
            router.push({
                pathname: '/transactions',
                params: {
                    accountId,
                    type,
                    date: selectedDate.toISOString()
                }
            });
        } else {
            router.push({
                pathname: '/transactions',
                params: {
                    category: itemName,
                    type,
                    date: selectedDate.toISOString()
                }
            });
        }
    };

    // Sync selectedAccount if params change
    useEffect(() => {
        if (params.accountId) {
            setSelectedAccount(params.accountId as string);
            setTempSelectedAccount(params.accountId as string);
            router.setParams({ accountId: '' });
        }
    }, [params.accountId, router]);

    const accountsToSelect = useMemo(() => {
        const list = [{ id: 'cash', name: `💵 ${cashAccountName}` }];
        bankAccounts.forEach(b => list.push({ id: b.id, name: `🏦 ${b.bankName}` }));
        creditCards.forEach(c => list.push({ id: c.id, name: `💳 ${c.cardName}` }));
        return list;
    }, [bankAccounts, creditCards, cashAccountName]);

    const isCustomFilterActive = selectedAccount !== 'all' && selectedAccount !== 'group_cash_bank' && selectedAccount !== 'group_credit';

    // Robust date filter with zero day overflow
    const filteredTransactionsByDate = useMemo(() => {
        return transactions.filter(t => {
            const txDate = parseISO(t.date);
            return isSameMonth(txDate, selectedDate) && isSameYear(txDate, selectedDate);
        });
    }, [transactions, selectedDate]);

    const filteredTransactions = useMemo(() => {
        if (selectedAccount === 'all') return filteredTransactionsByDate;

        if (selectedAccount === 'group_cash_bank') {
            return filteredTransactionsByDate.filter(t => {
                const isBank = bankAccounts.some(b => b.id === t.accountId || (t.type === 'TRANSFER' && b.id === t.toAccountId));
                const isCash = t.accountId === 'cash' || (t.type === 'TRANSFER' && t.toAccountId === 'cash');
                return isBank || isCash;
            });
        }

        if (selectedAccount === 'group_credit') {
            return filteredTransactionsByDate.filter(t => {
                return creditCards.some(c => c.id === t.accountId || c.id === t.toAccountId) || t.accountId === 'credit';
            });
        }

        return filteredTransactionsByDate.filter(t => t.accountId === selectedAccount || (t.type === 'TRANSFER' && t.toAccountId === selectedAccount));
    }, [filteredTransactionsByDate, selectedAccount, bankAccounts, creditCards]);

    const stats = useMemo(() => {
        let income = 0;
        let expense = 0;
        filteredTransactions.forEach(t => {
            if (t.category === 'Credit Card Payment' && t.type === 'INCOME') return;

            if (selectedAccount === 'all') {
                if (t.type === 'TRANSFER' || t.category === 'Self Transfer') return;

                if (t.type === 'INCOME' && t.category !== 'Credit Card Payment') income += Number(t.amount);
                else if (t.type === 'EXPENSE') expense += Number(t.amount);
            } else if (selectedAccount === 'group_cash_bank') {
                const fromIsCashOrBank = t.accountId === 'cash' || bankAccounts.some(b => b.id === t.accountId);
                const toIsCashOrBank = t.toAccountId === 'cash' || bankAccounts.some(b => b.id === t.toAccountId);

                if (t.type === 'TRANSFER' || t.category === 'Self Transfer') {
                    if (fromIsCashOrBank && toIsCashOrBank) {
                        return;
                    } else if (fromIsCashOrBank && !toIsCashOrBank) {
                        expense += Number(t.amount);
                    } else if (!fromIsCashOrBank && toIsCashOrBank) {
                        income += Number(t.amount);
                    }
                } else if (t.type === 'INCOME' && t.category !== 'Credit Card Payment') {
                    income += Number(t.amount);
                } else if (t.type === 'EXPENSE') {
                    expense += Number(t.amount);
                }
            } else if (selectedAccount === 'group_credit') {
                if (t.type === 'EXPENSE') {
                    expense += Number(t.amount);
                }
            } else {
                if (t.type === 'INCOME' && t.category !== 'Credit Card Payment') {
                    income += Number(t.amount);
                } else if (t.type === 'TRANSFER' && t.toAccountId === selectedAccount) {
                    income += Number(t.amount);
                } else if (t.type === 'EXPENSE' || (t.type === 'TRANSFER' && t.accountId === selectedAccount)) {
                    expense += Number(t.amount);
                }
            }
        });
        return { income, expense, net: income - expense };
    }, [filteredTransactions, selectedAccount, bankAccounts, creditCards]);

    // Rock solid month stepper (prevents overflow bugs)
    const stepMonth = (delta: number) => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const newDate = new Date(year, month + delta, 1);
        setSelectedDate(newDate);
        setPickerYear(newDate.getFullYear());
    };

    const openMonthPicker = () => {
        setPickerYear(selectedDate.getFullYear());
        setIsMonthPickerOpen(true);
    };

    const selectPickerMonth = (monthIndex: number) => {
        const newDate = new Date(pickerYear, monthIndex, 1);
        setSelectedDate(newDate);
        setIsMonthPickerOpen(false);
    };

    const expenseBreakdown = useMemo(() => {
        const expenses = filteredTransactions.filter(t => {
            if (t.category === 'Credit Card Payment' && t.type === 'INCOME') return false;
            if (selectedAccount === 'all') {
                return t.type === 'EXPENSE' && t.category !== 'Self Transfer';
            } else if (selectedAccount === 'group_cash_bank') {
                const fromIsCashOrBank = t.accountId === 'cash' || bankAccounts.some(b => b.id === t.accountId);
                const toIsCashOrBank = t.toAccountId === 'cash' || bankAccounts.some(b => b.id === t.toAccountId);
                if (t.type === 'TRANSFER' || t.category === 'Self Transfer') {
                    return fromIsCashOrBank && !toIsCashOrBank;
                }
                return t.type === 'EXPENSE';
            } else if (selectedAccount === 'group_credit') {
                return t.type === 'EXPENSE';
            } else {
                return t.type === 'EXPENSE' || (t.type === 'TRANSFER' && t.accountId === selectedAccount);
            }
        });

        const breakdown: Record<string, { amount: number, color: string }> = {};
        
        expenses.forEach(t => {
            const catName = (t.type === 'TRANSFER' || t.category === 'Self Transfer') ? 'Transfer Out / Payment' : t.category;
            if (!breakdown[catName]) {
                const isTransferCat = catName.includes('Transfer');
                breakdown[catName] = {
                    amount: 0,
                    color: isTransferCat ? Colors.primary : Colors.charts.pie[Object.keys(breakdown).length % Colors.charts.pie.length]
                };
            }
            breakdown[catName].amount += Number(t.amount);
        });

        const total = Object.values(breakdown).reduce((sum, item) => sum + item.amount, 0);

        return Object.keys(breakdown)
            .map((key) => ({
                name: key,
                amount: breakdown[key].amount,
                color: breakdown[key].color,
                percent: total > 0 ? (breakdown[key].amount / total) * 100 : 0
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [filteredTransactions, selectedAccount, bankAccounts, creditCards, Colors]);

    const incomeBreakdown = useMemo(() => {
        const incomes = filteredTransactions.filter(t => {
            if (t.category === 'Credit Card Payment') return false;
            if (selectedAccount === 'all') {
                return t.type === 'INCOME';
            } else if (selectedAccount === 'group_cash_bank') {
                const fromIsCashOrBank = t.accountId === 'cash' || bankAccounts.some(b => b.id === t.accountId);
                const toIsCashOrBank = t.toAccountId === 'cash' || bankAccounts.some(b => b.id === t.toAccountId);
                if (t.type === 'TRANSFER' || t.category === 'Self Transfer') {
                    return !fromIsCashOrBank && toIsCashOrBank;
                }
                return t.type === 'INCOME';
            } else if (selectedAccount === 'group_credit') {
                return false;
            } else {
                return (t.type === 'INCOME' && t.category !== 'Credit Card Payment') || (t.type === 'TRANSFER' && t.toAccountId === selectedAccount);
            }
        });

        const breakdown: Record<string, { accountId?: string; amount: number; color: string }> = {};
        
        incomes.forEach(t => {
            let label = '';
            let accountId: string | undefined = undefined;

            if (selectedAccount === 'all' || selectedAccount === 'group_cash_bank') {
                label = getAccountName(t.accountId);
                accountId = t.accountId;
            } else {
                if (t.type === 'TRANSFER' || t.category === 'Self Transfer') {
                    label = `Self Transfer (From ${getAccountName(t.accountId)})`;
                } else {
                    label = t.category;
                }
                accountId = t.accountId;
            }

            if (!breakdown[label]) {
                breakdown[label] = {
                    accountId,
                    amount: 0,
                    color: label.includes('Self Transfer') ? Colors.primary : (Object.keys(breakdown).length === 0 ? Colors.primary : Colors.income)
                };
            }
            breakdown[label].amount += Number(t.amount);
        });

        const total = Object.values(breakdown).reduce((sum, item) => sum + item.amount, 0);

        return Object.keys(breakdown)
            .map((key) => ({
                name: key,
                accountId: breakdown[key].accountId,
                amount: breakdown[key].amount,
                color: breakdown[key].color,
                percent: total > 0 ? (breakdown[key].amount / total) * 100 : 0
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [filteredTransactions, selectedAccount, bankAccounts, creditCards, Colors, cashAccountName]);

    const previousMonthStats = useMemo(() => {
        const prevDate = subMonths(selectedDate, 1);
        const prevTxns = transactions.filter(t => {
            const txDate = parseISO(t.date);
            return isSameMonth(txDate, prevDate) && isSameYear(txDate, prevDate);
        });

        let filteredPrev = prevTxns;
        if (selectedAccount === 'group_cash_bank') {
            filteredPrev = prevTxns.filter(t => {
                const isBank = bankAccounts.some(b => b.id === t.accountId || (t.type === 'TRANSFER' && b.id === t.toAccountId));
                const isCash = t.accountId === 'cash' || (t.type === 'TRANSFER' && t.toAccountId === 'cash');
                return isBank || isCash;
            });
        } else if (selectedAccount === 'group_credit') {
            filteredPrev = prevTxns.filter(t => {
                return creditCards.some(c => c.id === t.accountId || c.id === t.toAccountId) || t.accountId === 'credit';
            });
        } else if (selectedAccount !== 'all') {
            filteredPrev = prevTxns.filter(t => t.accountId === selectedAccount || (t.type === 'TRANSFER' && t.toAccountId === selectedAccount));
        }

        let income = 0;
        let expense = 0;

        filteredPrev.forEach(t => {
            if (t.category === 'Credit Card Payment' && t.type === 'INCOME') return;
            if (selectedAccount === 'all') {
                if (t.type === 'TRANSFER' || t.category === 'Self Transfer') return;
                if (t.type === 'INCOME' && t.category !== 'Credit Card Payment') income += Number(t.amount);
                else if (t.type === 'EXPENSE') expense += Number(t.amount);
            } else if (selectedAccount === 'group_cash_bank') {
                const fromIsCashOrBank = t.accountId === 'cash' || bankAccounts.some(b => b.id === t.accountId);
                const toIsCashOrBank = t.toAccountId === 'cash' || bankAccounts.some(b => b.id === t.toAccountId);
                if (t.type === 'TRANSFER' || t.category === 'Self Transfer') {
                    if (fromIsCashOrBank && toIsCashOrBank) return;
                    else if (fromIsCashOrBank && !toIsCashOrBank) expense += Number(t.amount);
                    else if (!fromIsCashOrBank && toIsCashOrBank) income += Number(t.amount);
                } else if (t.type === 'INCOME' && t.category !== 'Credit Card Payment') {
                    income += Number(t.amount);
                } else if (t.type === 'EXPENSE') {
                    expense += Number(t.amount);
                }
            } else if (selectedAccount === 'group_credit') {
                if (t.type === 'EXPENSE') expense += Number(t.amount);
            } else {
                if (t.type === 'INCOME' && t.category !== 'Credit Card Payment') {
                    income += Number(t.amount);
                } else if (t.type === 'TRANSFER' && t.toAccountId === selectedAccount) {
                    income += Number(t.amount);
                } else if (t.type === 'EXPENSE' || (t.type === 'TRANSFER' && t.accountId === selectedAccount)) {
                    expense += Number(t.amount);
                }
            }
        });

        return { income, expense };
    }, [transactions, selectedDate, selectedAccount, bankAccounts, creditCards]);

    const dailySpendingData = useMemo(() => {
        const daysInMonth = getDaysInMonth(selectedDate);
        const dailyTotals = new Array(daysInMonth).fill(0);

        filteredTransactions.forEach(t => {
            if (t.category === 'Credit Card Payment' && t.type === 'INCOME') return;
            let isExpenseItem = false;
            if (selectedAccount === 'all') {
                isExpenseItem = t.type === 'EXPENSE' && t.category !== 'Self Transfer';
            } else if (selectedAccount === 'group_cash_bank') {
                const fromIsCashOrBank = t.accountId === 'cash' || bankAccounts.some(b => b.id === t.accountId);
                const toIsCashOrBank = t.toAccountId === 'cash' || bankAccounts.some(b => b.id === t.toAccountId);
                if (t.type === 'TRANSFER' || t.category === 'Self Transfer') {
                    isExpenseItem = fromIsCashOrBank && !toIsCashOrBank;
                } else {
                    isExpenseItem = t.type === 'EXPENSE';
                }
            } else if (selectedAccount === 'group_credit') {
                isExpenseItem = t.type === 'EXPENSE';
            } else {
                isExpenseItem = t.type === 'EXPENSE' || (t.type === 'TRANSFER' && t.accountId === selectedAccount);
            }

            if (isExpenseItem) {
                const dayNum = getDate(parseISO(t.date));
                if (dayNum >= 1 && dayNum <= daysInMonth) {
                    dailyTotals[dayNum - 1] += Number(t.amount);
                }
            }
        });

        let maxSpending = 0;
        let peakDay = 0;
        dailyTotals.forEach((amt, idx) => {
            if (amt > maxSpending) {
                maxSpending = amt;
                peakDay = idx + 1;
            }
        });

        const activeDaysCount = dailyTotals.filter(a => a > 0).length || 1;
        const avgDaily = Math.round(stats.expense / activeDaysCount);

        return { dailyTotals, maxSpending, peakDay, avgDaily, daysInMonth };
    }, [filteredTransactions, selectedAccount, selectedDate, stats.expense]);

    const financialHealth = useMemo(() => {
        if (stats.income <= 0) return { label: 'No Income Recorded', rate: 0, color: Colors.textMuted };
        const rate = (stats.net / stats.income) * 100;
        if (rate >= 30) return { label: 'Excellent Health 🌟', rate: Math.round(rate), color: Colors.income };
        if (rate >= 10) return { label: 'Good Savings Pace 🚀', rate: Math.round(rate), color: Colors.primary };
        if (rate >= 0) return { label: 'Tight Budget Warning ⚠️', rate: Math.round(rate), color: '#F59E0B' };
        return { label: 'Deficit Warning 🚨', rate: Math.round(rate), color: Colors.expense };
    }, [stats, Colors]);

    const expDiffPct = useMemo(() => {
        if (previousMonthStats.expense <= 0) return 0;
        const diff = ((stats.expense - previousMonthStats.expense) / previousMonthStats.expense) * 100;
        return Math.round(diff * 10) / 10;
    }, [stats.expense, previousMonthStats.expense]);

    const topPurchases = useMemo(() => {
        const expensesOnly = filteredTransactions.filter(t => {
            if (t.category === 'Credit Card Payment' && t.type === 'INCOME') return false;
            if (selectedAccount === 'all') {
                return t.type === 'EXPENSE' && t.category !== 'Self Transfer';
            } else {
                return t.type === 'EXPENSE' || (t.type === 'TRANSFER' && t.accountId === selectedAccount);
            }
        });

        return [...expensesOnly]
            .sort((a, b) => Number(b.amount) - Number(a.amount))
            .slice(0, 3);
    }, [filteredTransactions, selectedAccount]);

    const weekdayWeekendStats = useMemo(() => {
        let weekday = 0;
        let weekend = 0;

        filteredTransactions.forEach(t => {
            if (t.category === 'Credit Card Payment' && t.type === 'INCOME') return;
            const isExpenseItem = selectedAccount === 'all'
                ? (t.type === 'EXPENSE' && t.category !== 'Self Transfer')
                : (t.type === 'EXPENSE' || (t.type === 'TRANSFER' && t.accountId === selectedAccount));

            if (isExpenseItem) {
                const dateObj = parseISO(t.date);
                const dayOfWeek = getDay(dateObj);
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    weekend += Number(t.amount);
                } else {
                    weekday += Number(t.amount);
                }
            }
        });

        const total = weekday + weekend;
        const weekdayPct = total > 0 ? Math.round((weekday / total) * 100) : 0;
        const weekendPct = total > 0 ? Math.round((weekend / total) * 100) : 0;

        return { weekday, weekend, weekdayPct, weekendPct, total };
    }, [filteredTransactions, selectedAccount]);

    const budgetProgressList = useMemo(() => {
        if (!categoryBudgets) return [];
        return expenseBreakdown
            .filter(item => categoryBudgets[item.name] && categoryBudgets[item.name] > 0)
            .map(item => {
                const budget = categoryBudgets[item.name];
                const pct = Math.round((item.amount / budget) * 100);
                return {
                    category: item.name,
                    spent: item.amount,
                    budget,
                    pct,
                    color: pct > 100 ? Colors.expense : pct >= 80 ? '#F59E0B' : Colors.income
                };
            })
            .sort((a, b) => b.pct - a.pct);
    }, [expenseBreakdown, categoryBudgets, Colors]);

    const handleSubTabClick = (tab: 'HISTORY' | 'REPORTS') => {
        if (onSubTabChange) {
            onSubTabChange(tab);
        } else {
            router.push(tab === 'HISTORY' ? '/transactions' : '/reports');
        }
    };

    const handleApplyModal = () => {
        setSelectedAccount(tempSelectedAccount);
        setIsFilterModalOpen(false);
    };

    const handleResetModal = () => {
        setTempSelectedAccount('all');
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: Colors.background }]}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
        >
            {/* UNIFIED COMPACT HEADER */}
            <View style={[styles.compactHeaderWrapper, { backgroundColor: Colors.background, paddingTop: topMargin }]}>
                {/* 1. TOP NAV: Subtabs + Interactive Month Stepper */}
                <View style={styles.topNavRow}>
                    <View style={[styles.subtabContainer, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                        <TouchableOpacity
                            style={styles.subtabBtn}
                            onPress={() => handleSubTabClick('HISTORY')}
                        >
                            <Text style={[styles.subtabText, { color: Colors.textMuted }]}>
                                📜 History
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.subtabBtn, { backgroundColor: Colors.primary }]}
                            onPress={() => handleSubTabClick('REPORTS')}
                        >
                            <Text style={[styles.subtabText, { color: '#fff' }]}>
                                📊 Reports
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Month Stepper & Modal Trigger */}
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

                {/* 2. ACCOUNT 3-TAB SEGMENT + FILTER BUTTON */}
                <View style={styles.accountControlRow}>
                    {/* Primary 3-tab Segmented Pill */}
                    <View style={[styles.segmentContainer, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                        {[
                            { id: 'all', label: 'All Accounts' },
                            { id: 'group_cash_bank', label: '💵 Non-Credit' },
                            { id: 'group_credit', label: '💳 Credit' },
                        ].map((item) => {
                            const isSelected = selectedAccount === item.id;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.segmentBtn,
                                        isSelected && { backgroundColor: Colors.primary }
                                    ]}
                                    onPress={() => setSelectedAccount(item.id)}
                                >
                                    <Text style={[
                                        styles.segmentText,
                                        { color: isSelected ? '#fff' : Colors.textMuted, fontWeight: isSelected ? '700' : '600' }
                                    ]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Filter Modal Trigger with Badge */}
                    <TouchableOpacity
                        style={[
                            styles.iconActionBtn,
                            {
                                backgroundColor: isCustomFilterActive ? Colors.primary + '18' : Colors.surface,
                                borderColor: isCustomFilterActive ? Colors.primary : Colors.border
                            }
                        ]}
                        onPress={() => {
                            setTempSelectedAccount(selectedAccount);
                            setIsFilterModalOpen(true);
                        }}
                        accessibilityLabel="Filter by specific account"
                    >
                        <SlidersHorizontal color={isCustomFilterActive ? Colors.primary : Colors.textMuted} size={16} />
                        {isCustomFilterActive && (
                            <View style={[styles.filterBadgeCircle, { backgroundColor: Colors.primary, borderColor: Colors.background }]}>
                                <Text style={styles.filterBadgeText}>1</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Active Specific Account Badge (shown if a specific bank/card is chosen from modal) */}
                {isCustomFilterActive && (
                    <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 6 }}>
                        <TouchableOpacity
                            style={[styles.activeBadge, { backgroundColor: Colors.primary + '18', borderColor: Colors.primary }]}
                            onPress={() => setSelectedAccount('all')}
                        >
                            <Text style={[styles.activeBadgeText, { color: Colors.primary }]}>
                                Account: {getAccountName(selectedAccount)}
                            </Text>
                            <X color={Colors.primary} size={11} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* 3. COMPACT FINANCIAL RIBBON (Income / Expense / Savings) */}
                <View style={[styles.summaryRibbon, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <View style={styles.ribbonStatItem}>
                        <Text style={[styles.ribbonStatLabel, { color: Colors.textMuted }]}>INCOME</Text>
                        <Text style={[styles.ribbonStatValue, { color: Colors.income }]}>
                            +₹{stats.income.toLocaleString('en-IN')}
                        </Text>
                    </View>

                    <View style={[styles.ribbonVerticalDivider, { backgroundColor: Colors.border }]} />

                    <View style={styles.ribbonStatItem}>
                        <Text style={[styles.ribbonStatLabel, { color: Colors.textMuted }]}>EXPENSE</Text>
                        <Text style={[styles.ribbonStatValue, { color: Colors.expense }]}>
                            -₹{stats.expense.toLocaleString('en-IN')}
                        </Text>
                    </View>

                    <View style={[styles.ribbonVerticalDivider, { backgroundColor: Colors.border }]} />

                    <View style={styles.ribbonStatItem}>
                        <Text style={[styles.ribbonStatLabel, { color: Colors.textMuted }]}>SAVINGS</Text>
                        <Text style={[
                            styles.ribbonStatValue,
                            { color: stats.net >= 0 ? Colors.income : Colors.expense }
                        ]}>
                            {stats.net >= 0 ? '+' : ''}₹{stats.net.toLocaleString('en-IN')}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Visual Analytics: Financial Health & Month-over-Month Comparison */}
            <HoverCard disabled={true} style={[styles.card, { backgroundColor: Colors.surface }]}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={[styles.cardTitle, { color: Colors.text }]}>Financial Performance & Trends</Text>
                        <Text style={{ fontSize: 11.5, color: Colors.textMuted, marginTop: 1 }}>
                            vs {format(subMonths(selectedDate, 1), 'MMMM yyyy')}
                        </Text>
                    </View>
                    <Activity size={18} color={Colors.primary} />
                </View>

                {/* Health Badge & Savings Rate Bar */}
                <View style={{ marginBottom: 12, backgroundColor: Colors.background, padding: 10, borderRadius: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Award size={15} color={financialHealth.color} />
                            <Text style={{ fontSize: 12.5, fontWeight: '700', color: Colors.text }}>{financialHealth.label}</Text>
                        </View>
                        <Text style={{ fontSize: 12.5, fontWeight: 'bold', color: financialHealth.color }}>
                            {financialHealth.rate}% Savings Rate
                        </Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: Colors.border + '40', borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${Math.min(100, Math.max(0, financialHealth.rate))}%`, backgroundColor: financialHealth.color, borderRadius: 3 }} />
                    </View>
                </View>

                {/* MoM Comparison Pills */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1, backgroundColor: Colors.background, padding: 10, borderRadius: 14 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                            {expDiffPct > 0 ? (
                                <TrendingUp size={13} color={Colors.expense} />
                            ) : (
                                <TrendingDown size={13} color={Colors.income} />
                            )}
                            <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.textMuted }}>Expense Trend</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: expDiffPct > 0 ? Colors.expense : Colors.income }}>
                            {expDiffPct > 0 ? `+${expDiffPct}%` : `${expDiffPct}%`}
                        </Text>
                        <Text style={{ fontSize: 9.5, color: Colors.textMuted, marginTop: 1 }}>
                            Last Mo: ₹{previousMonthStats.expense.toLocaleString()}
                        </Text>
                    </View>

                    <View style={{ flex: 1, backgroundColor: Colors.background, padding: 10, borderRadius: 14 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                            <Zap size={13} color={Colors.primary} />
                            <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.textMuted }}>Daily Avg Burn</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: Colors.text }}>
                            ₹{dailySpendingData.avgDaily.toLocaleString()}/day
                        </Text>
                        <Text style={{ fontSize: 9.5, color: Colors.textMuted, marginTop: 1 }}>
                            Peak: {dailySpendingData.peakDay ? `Day ${dailySpendingData.peakDay} (₹${dailySpendingData.maxSpending.toLocaleString()})` : 'None'}
                        </Text>
                    </View>
                </View>

                {/* Daily Spending Bar Chart with Clear Legend & Interactive Inspector */}
                <View style={{ marginTop: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: Colors.text }}>
                            Daily Expense Activity
                        </Text>
                        <View style={{ backgroundColor: Colors.background, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10.5, fontWeight: '600', color: selectedDayInfo ? Colors.primary : Colors.textMuted }}>
                                {selectedDayInfo
                                    ? `Day ${selectedDayInfo.day}: ₹${selectedDayInfo.amount.toLocaleString()}`
                                    : dailySpendingData.peakDay > 0
                                        ? `Peak: Day ${dailySpendingData.peakDay} (₹${dailySpendingData.maxSpending.toLocaleString()})`
                                        : 'Tap bar to inspect'}
                            </Text>
                        </View>
                    </View>

                    {/* Color Legend */}
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: Colors.primary }} />
                            <Text style={{ fontSize: 9.5, color: Colors.textMuted }}>Daily Expense</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: Colors.expense }} />
                            <Text style={{ fontSize: 9.5, color: Colors.textMuted }}>Peak Day</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: Colors.border + '60' }} />
                            <Text style={{ fontSize: 9.5, color: Colors.textMuted }}>No Expense</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 50, gap: 2 }}>
                        {dailySpendingData.dailyTotals.map((amt, idx) => {
                            const barHeight = dailySpendingData.maxSpending > 0 ? Math.max(4, (amt / dailySpendingData.maxSpending) * 46) : 4;
                            const isPeak = idx + 1 === dailySpendingData.peakDay && amt > 0;
                            const isSelected = selectedDayInfo && selectedDayInfo.day === idx + 1;
                            return (
                                <TouchableOpacity
                                    key={`day-${idx}`}
                                    onPress={() => setSelectedDayInfo({ day: idx + 1, amount: amt })}
                                    style={{
                                        flex: 1,
                                        height: barHeight,
                                        backgroundColor: isPeak ? Colors.expense : (amt > 0 ? Colors.primary : Colors.border + '50'),
                                        borderRadius: 2,
                                        opacity: selectedDayInfo ? (isSelected ? 1 : 0.4) : 1
                                    }}
                                />
                            );
                        })}
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
                        <Text style={{ fontSize: 8.5, color: Colors.textMuted }}>Day 1</Text>
                        <Text style={{ fontSize: 8.5, color: Colors.textMuted }}>Day 15</Text>
                        <Text style={{ fontSize: 8.5, color: Colors.textMuted }}>Day {dailySpendingData.daysInMonth}</Text>
                    </View>
                </View>
            </HoverCard>

            {/* 🏆 Top 3 Purchases of the Month & 📅 Weekday vs Weekend Analysis */}
            <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 4, marginBottom: 8 }}>
                {/* Top Purchases Card */}
                <View style={{ flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 12, borderColor: Colors.border, borderWidth: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                        <ShoppingBag size={14} color={Colors.primary} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.text }}>Top Purchases</Text>
                    </View>
                    {topPurchases.length > 0 ? (
                        topPurchases.map((tx, idx) => (
                            <View key={`top-${tx.id || idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <View style={{ flex: 1, marginRight: 4 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.text }} numberOfLines={1}>
                                        #{idx + 1} {tx.category}
                                    </Text>
                                    <Text style={{ fontSize: 9, color: Colors.textMuted }} numberOfLines={1}>
                                        {format(parseISO(tx.date), 'MMM dd')} {tx.note ? `• ${tx.note}` : ''}
                                    </Text>
                                </View>
                                <Text style={{ fontSize: 11, fontWeight: 'bold', color: Colors.expense }}>
                                    ₹{Number(tx.amount).toLocaleString()}
                                </Text>
                            </View>
                        ))
                    ) : (
                        <Text style={{ fontSize: 10, color: Colors.textMuted, marginTop: 2 }}>No major purchases</Text>
                    )}
                </View>

                {/* Weekday vs Weekend Card */}
                <View style={{ flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 12, borderColor: Colors.border, borderWidth: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                        <Calendar size={14} color={Colors.primary} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.text }}>Day Split</Text>
                    </View>
                    <View style={{ gap: 6 }}>
                        <View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                                <Text style={{ fontSize: 9.5, color: Colors.textMuted }}>Mon-Fri (Weekdays)</Text>
                                <Text style={{ fontSize: 9.5, fontWeight: '700', color: Colors.text }}>{weekdayWeekendStats.weekdayPct}%</Text>
                            </View>
                            <View style={{ height: 5, backgroundColor: Colors.border + '40', borderRadius: 2.5, overflow: 'hidden' }}>
                                <View style={{ height: '100%', width: `${weekdayWeekendStats.weekdayPct}%`, backgroundColor: Colors.primary, borderRadius: 2.5 }} />
                            </View>
                            <Text style={{ fontSize: 8.5, color: Colors.textMuted, marginTop: 1 }}>₹{weekdayWeekendStats.weekday.toLocaleString()}</Text>
                        </View>

                        <View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                                <Text style={{ fontSize: 9.5, color: Colors.textMuted }}>Sat-Sun (Weekends)</Text>
                                <Text style={{ fontSize: 9.5, fontWeight: '700', color: Colors.text }}>{weekdayWeekendStats.weekendPct}%</Text>
                            </View>
                            <View style={{ height: 5, backgroundColor: Colors.border + '40', borderRadius: 2.5, overflow: 'hidden' }}>
                                <View style={{ height: '100%', width: `${weekdayWeekendStats.weekendPct}%`, backgroundColor: '#F59E0B', borderRadius: 2.5 }} />
                            </View>
                            <Text style={{ fontSize: 8.5, color: Colors.textMuted, marginTop: 1 }}>₹{weekdayWeekendStats.weekend.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* 🎯 Category Budget Tracker */}
            {budgetProgressList.length > 0 && (
                <HoverCard disabled={true} style={[styles.card, { backgroundColor: Colors.surface, marginTop: 4 }]}>
                    <View style={styles.cardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Target size={16} color={Colors.primary} />
                            <Text style={[styles.cardTitle, { color: Colors.text }]}>Category Budget Tracker</Text>
                        </View>
                    </View>
                    <View style={{ gap: 10 }}>
                        {budgetProgressList.map(item => (
                            <View key={`bgt-${item.category}`}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: Colors.text }}>{item.category}</Text>
                                    <Text style={{ fontSize: 10.5, fontWeight: 'bold', color: item.color }}>
                                        ₹{item.spent.toLocaleString()} / ₹{item.budget.toLocaleString()} ({item.pct}%)
                                    </Text>
                                </View>
                                <View style={{ height: 6, backgroundColor: Colors.border + '40', borderRadius: 3, overflow: 'hidden' }}>
                                    <View style={{ height: '100%', width: `${Math.min(100, item.pct)}%`, backgroundColor: item.color, borderRadius: 3 }} />
                                </View>
                            </View>
                        ))}
                    </View>
                </HoverCard>
            )}

            {/* Context-Aware Financial Mindset Recommendation */}
            <View style={{
                backgroundColor: Colors.surface,
                borderRadius: 16,
                padding: 12,
                marginHorizontal: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: Colors.border,
                borderLeftWidth: 4,
                borderLeftColor: stats.net >= 0 ? Colors.income : Colors.expense,
                flexDirection: 'row',
                gap: 10,
                alignItems: 'center'
            }}>
                <View style={{
                    backgroundColor: (stats.net >= 0 ? Colors.income : Colors.expense) + '15',
                    padding: 8,
                    borderRadius: 10,
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    {stats.net >= 0 ? (
                        <ArrowUpCircle color={Colors.income} size={18} />
                    ) : (
                        <ArrowDownCircle color={Colors.expense} size={18} />
                    )}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{
                        color: Colors.text,
                        fontSize: 12,
                        fontWeight: '600',
                        lineHeight: 16
                    }}>
                        {stats.net >= 0 ? (
                            `Great job! You saved ₹${stats.net.toLocaleString()} this month. Keep up this healthy savings pace!`
                        ) : (
                            `You're in the red by ₹${Math.abs(stats.net).toLocaleString()} this month. Check your high-expense categories to balance your cashflow.`
                        )}
                    </Text>
                </View>
            </View>

            {/* Expense Breakdown */}
            <HoverCard disabled={true} style={[styles.card, { backgroundColor: Colors.surface }]}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={[styles.cardTitle, { color: Colors.text }]}>Expense Breakdown</Text>
                        <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 1 }}>{format(selectedDate, 'MMMM yyyy')}</Text>
                    </View>
                    <Tag size={16} color={Colors.expense} />
                </View>
                
                {expenseBreakdown.length > 0 ? (
                    <>
                        <View style={styles.chartWrapper}>
                            <InteractiveDonut 
                                data={expenseBreakdown}
                                size={Math.min(screenWidth - 64, 300)}
                                innerRadius={60}
                                onSelect={setSelectedExpenseCat as any}
                                selectedItem={expenseBreakdown.find(b => b.name === selectedExpenseCat) || null}
                                colors={Colors}
                                onCenterPress={(item) => navigateToHistory(item.name, 'EXPENSE')}
                            />
                        </View>

                        <View style={styles.breakdownList}>
                            {expenseBreakdown.map((item) => (
                                <TouchableOpacity 
                                    key={item.name} 
                                    style={[
                                        styles.breakdownItem, 
                                        selectedExpenseCat === item.name && { backgroundColor: item.color + '10', borderRadius: 10, padding: 6, marginHorizontal: -6 }
                                    ]}
                                    onPress={() => navigateToHistory({ name: item.name }, 'EXPENSE')}
                                >
                                    <View style={styles.itemHeader}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                                            <Text style={[styles.itemName, { color: Colors.text }]}>{item.name}</Text>
                                        </View>
                                        <Text style={[styles.itemAmount, { color: Colors.text }]}>₹{item.amount.toLocaleString()}</Text>
                                    </View>
                                    <View style={[styles.progressBg, { backgroundColor: Colors.border + '30' }]}>
                                        <View style={[styles.progressFill, { width: `${item.percent}%`, backgroundColor: item.color }]} />
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 }}>
                                        <Text style={styles.itemPercent}>{item.percent.toFixed(1)}%</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Info size={36} color={Colors.textMuted} />
                        <Text style={styles.emptyText}>No expenses recorded for this period.</Text>
                    </View>
                )}
            </HoverCard>

            {/* Income Sources */}
            <HoverCard disabled={true} style={[styles.card, { backgroundColor: Colors.surface }]}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={[styles.cardTitle, { color: Colors.text }]}>Income Sources</Text>
                        <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 1 }}>{format(selectedDate, 'MMMM yyyy')}</Text>
                    </View>
                    <ArrowUpCircle size={16} color={Colors.income} />
                </View>
                
                {incomeBreakdown.length > 0 ? (
                    <>
                        <View style={styles.chartWrapper}>
                            <InteractiveDonut 
                                data={incomeBreakdown}
                                size={Math.min(screenWidth - 64, 300)}
                                innerRadius={60}
                                onSelect={setSelectedIncomeCat as any}
                                selectedItem={incomeBreakdown.find(b => b.name === selectedIncomeCat) || null}
                                colors={Colors}
                                onCenterPress={(item) => navigateToHistory({ name: item.name, accountId: (item as any).accountId }, 'INCOME')}
                            />
                        </View>

                        <View style={styles.breakdownList}>
                            {incomeBreakdown.map((item) => (
                                <TouchableOpacity 
                                    key={item.name} 
                                    style={[
                                        styles.breakdownItem,
                                        selectedIncomeCat === item.name && { backgroundColor: item.color + '10', borderRadius: 10, padding: 6, marginHorizontal: -6 }
                                    ]}
                                    onPress={() => navigateToHistory({ name: item.name, accountId: item.accountId }, 'INCOME')}
                                >
                                    <View style={styles.itemHeader}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                                            <Text style={[styles.itemName, { color: Colors.text }]}>{item.name}</Text>
                                        </View>
                                        <Text style={[styles.itemAmount, { color: Colors.text }]}>₹{item.amount.toLocaleString()}</Text>
                                    </View>
                                    <View style={[styles.progressBg, { backgroundColor: Colors.border + '30' }]}>
                                        <View style={[styles.progressFill, { width: `${item.percent}%`, backgroundColor: item.color }]} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Info size={36} color={Colors.textMuted} />
                        <Text style={styles.emptyText}>No income recorded for this period.</Text>
                    </View>
                )}
            </HoverCard>

            {/* FILTER MODAL FOR REPORTS */}
            <Modal
                visible={isFilterModalOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsFilterModalOpen(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                        {/* Modal Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: Colors.border }]}>
                            <Text style={[styles.modalTitle, { color: Colors.text }]}>Filter by Account</Text>
                            <TouchableOpacity onPress={() => setIsFilterModalOpen(false)} style={styles.modalCloseButton}>
                                <X color={Colors.textMuted} size={22} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            {/* Classification Section */}
                            <View style={styles.modalSection}>
                                <Text style={[styles.sectionTitle, { color: Colors.text }]}>Account Classification</Text>
                                <View style={styles.chipsGrid}>
                                    {[
                                        { id: 'all', label: 'All Accounts' },
                                        { id: 'group_cash_bank', label: '💵 Non-Credit (Cash & Bank)' },
                                        { id: 'group_credit', label: '💳 Credit Cards' },
                                    ].map(item => {
                                        const isSelected = tempSelectedAccount === item.id;
                                        return (
                                            <TouchableOpacity
                                                key={`temp-grp-${item.id}`}
                                                style={[
                                                    styles.modalChip,
                                                    { borderColor: Colors.border, backgroundColor: Colors.background },
                                                    isSelected && { backgroundColor: Colors.primary + '15', borderColor: Colors.primary }
                                                ]}
                                                onPress={() => setTempSelectedAccount(item.id)}
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

                            {/* Specific Bank Accounts & Cards */}
                            <View style={styles.modalSection}>
                                <Text style={[styles.sectionTitle, { color: Colors.text }]}>Specific Bank Account / Card</Text>
                                <View style={styles.chipsGrid}>
                                    {accountsToSelect.map(acc => {
                                        const isSelected = tempSelectedAccount === acc.id;
                                        return (
                                            <TouchableOpacity
                                                key={`temp-acc-${acc.id}`}
                                                style={[
                                                    styles.modalChip,
                                                    { borderColor: Colors.border, backgroundColor: Colors.background },
                                                    isSelected && { backgroundColor: Colors.income + '15', borderColor: Colors.income }
                                                ]}
                                                onPress={() => setTempSelectedAccount(acc.id)}
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
                                onPress={handleResetModal}
                            >
                                <Text style={[styles.modalResetButtonText, { color: Colors.textMuted }]}>Reset All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalApplyButton, { backgroundColor: Colors.primary }]}
                                onPress={handleApplyModal}
                            >
                                <Text style={styles.modalApplyButtonText}>Apply Filter</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

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
                                setIsMonthPickerOpen(false);
                            }}
                        >
                            <Text style={[styles.thisMonthBtnText, { color: Colors.primary }]}>Jump to Current Month</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
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
    accountControlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 8,
        marginBottom: 8,
    },
    segmentContainer: {
        flex: 1,
        flexDirection: 'row',
        borderRadius: 10,
        padding: 2.5,
        borderWidth: 1,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 6,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    segmentText: {
        fontSize: 12,
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
    summaryRibbon: {
        marginHorizontal: 16,
        marginBottom: 6,
        borderRadius: 12,
        borderWidth: 1,
        paddingVertical: 7,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
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
    card: {
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 14.5,
        fontWeight: '700',
    },
    chartWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
        minHeight: 220,
    },
    breakdownList: {
        marginTop: 8,
        gap: 8,
    },
    breakdownItem: {
        paddingVertical: 3,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    colorIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    itemName: {
        fontSize: 12.5,
        fontWeight: '600',
    },
    itemAmount: {
        fontSize: 12.5,
        fontWeight: '700',
    },
    itemPercent: {
        fontSize: 10.5,
        color: '#6c757d',
    },
    progressBg: {
        height: 5,
        borderRadius: 2.5,
        width: '100%',
        overflow: 'hidden',
        marginTop: 3,
    },
    progressFill: {
        height: 5,
        borderRadius: 2.5,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
        gap: 8,
    },
    emptyText: {
        textAlign: 'center',
        color: '#6c757d',
        fontSize: 13,
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
});
