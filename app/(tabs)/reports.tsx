import React, { useMemo, useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Pressable, Platform, Modal, useWindowDimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseISO, isSameMonth, isSameYear, format, subMonths, getDaysInMonth, getDate, getDay } from 'date-fns';
import {
    ChevronLeft, ChevronRight, ChevronDown, ArrowUpCircle, ArrowDownCircle,
    Info, Tag, TrendingUp, TrendingDown, Activity, Zap, Award, Target,
    Calendar, ShoppingBag, X, SlidersHorizontal, ArrowUpRight, PieChart
} from 'lucide-react-native';

import { useThemeColors } from '../../src/theme/colors';
import InteractiveDonut from '../../src/components/InteractiveDonut';
import { useFinance } from '../../src/context/FinanceContext';

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
                isHovered && Platform.OS === 'web' ? { transform: [{ translateY: -2 }] } : undefined,
                pressed ? { transform: [{ scale: 0.99 }] } : undefined,
                Platform.OS === 'web' ? { transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' } : undefined
            ] as any}
        >
            {children}
        </Pressable>
    );
};

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
    const { width: windowWidth } = useWindowDimensions();
    const isDesktop = windowWidth >= 920;
    const isTablet = windowWidth >= 640 && windowWidth < 920;

    const topMargin = Math.max(insets.top, Platform.OS === 'web' ? 12 : 8);
    const bottomScrollPadding = Math.max(insets.bottom + 90, 120);

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
            contentContainerStyle={{ paddingBottom: bottomScrollPadding }}
            showsVerticalScrollIndicator={false}
        >
            {/* CONTAINER SHELL (Responsive max-width for desktop/laptop) */}
            <View style={[styles.mainWrapper, { paddingTop: topMargin }, isDesktop && styles.desktopContainer]}>
                
                {/* ── 1. UNIFIED COMMAND HEADER (Subtabs + Month Stepper + Account Pills) ── */}
                <View style={[styles.headerCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    
                    {/* Top Row: Navigation Subtabs + Month Stepper */}
                    <View style={styles.topNavRow}>
                        {/* Subtabs Switcher */}
                        <View style={[styles.subtabContainer, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
                            <TouchableOpacity
                                style={styles.subtabBtn}
                                onPress={() => handleSubTabClick('HISTORY')}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.subtabText, { color: Colors.textMuted }]}>
                                    📜 History
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.subtabBtn, { backgroundColor: Colors.primary }]}
                                onPress={() => handleSubTabClick('REPORTS')}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.subtabText, { color: '#ffffff' }]}>
                                    📊 Reports
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Interactive Month Stepper & Picker Modal Trigger */}
                        <View style={[styles.monthNavGroup, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
                            <TouchableOpacity onPress={() => stepMonth(-1)} style={styles.monthStepBtn} accessibilityLabel="Previous month" activeOpacity={0.6}>
                                <ChevronLeft color={Colors.textMuted} size={16} />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={openMonthPicker} style={styles.monthLabelBtn} activeOpacity={0.7}>
                                <Text style={[styles.monthNavText, { color: Colors.text }]}>
                                    {format(selectedDate, 'MMM yyyy')}
                                </Text>
                                <ChevronDown color={Colors.textMuted} size={14} style={{ marginLeft: 3 }} />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => stepMonth(1)} style={styles.monthStepBtn} accessibilityLabel="Next month" activeOpacity={0.6}>
                                <ChevronRight color={Colors.textMuted} size={16} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Bottom Row: 3-Tab Account Segment + Filter Trigger */}
                    <View style={styles.accountControlRow}>
                        {/* Primary 3-tab Segmented Pill */}
                        <View style={[styles.segmentContainer, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
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
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.segmentText,
                                            { color: isSelected ? '#ffffff' : Colors.textMuted, fontWeight: isSelected ? '700' : '600' }
                                        ]}>
                                            {item.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Custom Account Filter Trigger with Badge */}
                        <TouchableOpacity
                            style={[
                                styles.iconActionBtn,
                                {
                                    backgroundColor: isCustomFilterActive ? Colors.primary + '18' : Colors.surfaceElevated,
                                    borderColor: isCustomFilterActive ? Colors.primary : Colors.border
                                }
                            ]}
                            onPress={() => {
                                setTempSelectedAccount(selectedAccount);
                                setIsFilterModalOpen(true);
                            }}
                            accessibilityLabel="Filter by specific account"
                            activeOpacity={0.7}
                        >
                            <SlidersHorizontal color={isCustomFilterActive ? Colors.primary : Colors.textMuted} size={16} />
                            {isCustomFilterActive && (
                                <View style={[styles.filterBadgeCircle, { backgroundColor: Colors.primary, borderColor: Colors.surface }]}>
                                    <Text style={styles.filterBadgeText}>1</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Active Specific Account Chip (shown if a custom bank/card is chosen from modal) */}
                    {isCustomFilterActive && (
                        <View style={styles.activeBadgeRow}>
                            <TouchableOpacity
                                style={[styles.activeBadge, { backgroundColor: Colors.primary + '18', borderColor: Colors.primary }]}
                                onPress={() => setSelectedAccount('all')}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.activeBadgeText, { color: Colors.primary }]}>
                                    Filtered: {getAccountName(selectedAccount)}
                                </Text>
                                <X color={Colors.primary} size={12} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* ── 2. EXECUTIVE FINANCIAL PERFORMANCE BANNER ── */}
                <View style={[styles.ribbonCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <View style={styles.ribbonItem}>
                        <View style={styles.ribbonItemHeader}>
                            <View style={[styles.ribbonDot, { backgroundColor: Colors.income }]} />
                            <Text style={[styles.ribbonStatLabel, { color: Colors.textMuted }]}>INCOME</Text>
                        </View>
                        <Text style={[styles.ribbonStatValue, { color: Colors.income }]} numberOfLines={1}>
                            +₹{stats.income.toLocaleString('en-IN')}
                        </Text>
                        <Text style={[styles.ribbonSubtext, { color: Colors.textMuted }]}>
                            {incomeBreakdown.length} Source{incomeBreakdown.length !== 1 ? 's' : ''}
                        </Text>
                    </View>

                    <View style={[styles.ribbonDivider, { backgroundColor: Colors.border }]} />

                    <View style={styles.ribbonItem}>
                        <View style={styles.ribbonItemHeader}>
                            <View style={[styles.ribbonDot, { backgroundColor: Colors.expense }]} />
                            <Text style={[styles.ribbonStatLabel, { color: Colors.textMuted }]}>EXPENSE</Text>
                        </View>
                        <Text style={[styles.ribbonStatValue, { color: Colors.expense }]} numberOfLines={1}>
                            -₹{stats.expense.toLocaleString('en-IN')}
                        </Text>
                        <Text style={[styles.ribbonSubtext, { color: Colors.textMuted }]}>
                            {expDiffPct > 0 ? `+${expDiffPct}% MoM` : `${expDiffPct}% MoM`}
                        </Text>
                    </View>

                    <View style={[styles.ribbonDivider, { backgroundColor: Colors.border }]} />

                    <View style={styles.ribbonItem}>
                        <View style={styles.ribbonItemHeader}>
                            <View style={[styles.ribbonDot, { backgroundColor: stats.net >= 0 ? Colors.income : Colors.expense }]} />
                            <Text style={[styles.ribbonStatLabel, { color: Colors.textMuted }]}>NET SAVINGS</Text>
                        </View>
                        <Text style={[
                            styles.ribbonStatValue,
                            { color: stats.net >= 0 ? Colors.income : Colors.expense }
                        ]} numberOfLines={1}>
                            {stats.net >= 0 ? '+' : ''}₹{stats.net.toLocaleString('en-IN')}
                        </Text>
                        <Text style={[styles.ribbonSubtext, { color: financialHealth.color }]}>
                            {financialHealth.rate}% Savings Rate
                        </Text>
                    </View>
                </View>

                {/* ── 3. RESPONSIVE BENTO GRID (2 COLUMNS ON DESKTOP, 1 COLUMN ON MOBILE) ── */}
                <View style={[styles.bentoContainer, isDesktop ? styles.bentoGridDesktop : styles.bentoGridMobile]}>

                    {/* ════════ LEFT COLUMN: Trends, Daily Bars & Spending Habits ════════ */}
                    <View style={[styles.bentoColumn, isDesktop ? { flex: 1.05 } : undefined]}>

                        {/* Card 1: Financial Health & Month-Over-Month Performance */}
                        <HoverCard disabled={true} style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                            <View style={styles.cardHeader}>
                                <View>
                                    <Text style={[styles.cardTitle, { color: Colors.text }]}>Performance & Velocity</Text>
                                    <Text style={[styles.cardSubtitle, { color: Colors.textMuted }]}>
                                        Activity & comparison vs {format(subMonths(selectedDate, 1), 'MMMM yyyy')}
                                    </Text>
                                </View>
                                <View style={[styles.cardHeaderIconBadge, { backgroundColor: Colors.primary + '18' }]}>
                                    <Activity size={16} color={Colors.primary} />
                                </View>
                            </View>

                            {/* Savings Rate Progress Meter */}
                            <View style={[styles.healthTrackBox, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
                                <View style={styles.healthHeaderRow}>
                                    <View style={styles.healthLabelGroup}>
                                        <Award size={15} color={financialHealth.color} />
                                        <Text style={[styles.healthTitleText, { color: Colors.text }]}>{financialHealth.label}</Text>
                                    </View>
                                    <Text style={[styles.healthRateText, { color: financialHealth.color }]}>
                                        {financialHealth.rate}% Savings Rate
                                    </Text>
                                </View>
                                <View style={[styles.progressTrack, { backgroundColor: Colors.border }]}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                width: `${Math.min(100, Math.max(0, financialHealth.rate))}%`,
                                                backgroundColor: financialHealth.color
                                            }
                                        ]}
                                    />
                                </View>
                            </View>

                            {/* Quick Metrics (Expense Trend + Daily Avg Burn) */}
                            <View style={styles.dualPillRow}>
                                <View style={[styles.pillCard, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
                                    <View style={styles.pillCardHeader}>
                                        {expDiffPct > 0 ? (
                                            <TrendingUp size={13} color={Colors.expense} />
                                        ) : (
                                            <TrendingDown size={13} color={Colors.income} />
                                        )}
                                        <Text style={[styles.pillCardLabel, { color: Colors.textMuted }]}>Expense Trend</Text>
                                    </View>
                                    <Text style={[styles.pillCardValue, { color: expDiffPct > 0 ? Colors.expense : Colors.income }]}>
                                        {expDiffPct > 0 ? `+${expDiffPct}%` : `${expDiffPct}%`}
                                    </Text>
                                    <Text style={[styles.pillCardSub, { color: Colors.textMuted }]}>
                                        Last Mo: ₹{previousMonthStats.expense.toLocaleString('en-IN')}
                                    </Text>
                                </View>

                                <View style={[styles.pillCard, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
                                    <View style={styles.pillCardHeader}>
                                        <Zap size={13} color={Colors.primary} />
                                        <Text style={[styles.pillCardLabel, { color: Colors.textMuted }]}>Daily Avg Burn</Text>
                                    </View>
                                    <Text style={[styles.pillCardValue, { color: Colors.text }]}>
                                        ₹{dailySpendingData.avgDaily.toLocaleString('en-IN')}/day
                                    </Text>
                                    <Text style={[styles.pillCardSub, { color: Colors.textMuted }]}>
                                        {dailySpendingData.peakDay > 0 ? `Peak: Day ${dailySpendingData.peakDay} (₹${dailySpendingData.maxSpending.toLocaleString('en-IN')})` : 'Stable pacing'}
                                    </Text>
                                </View>
                            </View>

                            {/* Interactive Daily Spending Activity Bar Chart */}
                            <View style={styles.chartSection}>
                                <View style={styles.chartHeaderRow}>
                                    <Text style={[styles.chartSectionTitle, { color: Colors.text }]}>
                                        Daily Spending Activity
                                    </Text>
                                    <View style={[styles.inspectorChip, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
                                        <Text style={[styles.inspectorChipText, { color: selectedDayInfo ? Colors.primary : Colors.textMuted }]}>
                                            {selectedDayInfo
                                                ? `Day ${selectedDayInfo.day}: ₹${selectedDayInfo.amount.toLocaleString('en-IN')}`
                                                : dailySpendingData.peakDay > 0
                                                    ? `Peak: Day ${dailySpendingData.peakDay} (₹${dailySpendingData.maxSpending.toLocaleString('en-IN')})`
                                                    : 'Tap bar to inspect'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Legend Indicators */}
                                <View style={styles.legendRow}>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendSquare, { backgroundColor: Colors.primary }]} />
                                        <Text style={[styles.legendText, { color: Colors.textMuted }]}>Expense</Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendSquare, { backgroundColor: Colors.expense }]} />
                                        <Text style={[styles.legendText, { color: Colors.textMuted }]}>Peak Day</Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendSquare, { backgroundColor: Colors.border }]} />
                                        <Text style={[styles.legendText, { color: Colors.textMuted }]}>Zero</Text>
                                    </View>
                                </View>

                                {/* Bar Chart Grid */}
                                <View style={styles.barsContainer}>
                                    {dailySpendingData.dailyTotals.map((amt, idx) => {
                                        const barHeight = dailySpendingData.maxSpending > 0
                                            ? Math.max(4, (amt / dailySpendingData.maxSpending) * 52)
                                            : 4;
                                        const isPeak = idx + 1 === dailySpendingData.peakDay && amt > 0;
                                        const isSelected = selectedDayInfo && selectedDayInfo.day === idx + 1;
                                        return (
                                            <TouchableOpacity
                                                key={`day-${idx}`}
                                                onPress={() => setSelectedDayInfo({ day: idx + 1, amount: amt })}
                                                style={[
                                                    styles.dayBar,
                                                    {
                                                        height: barHeight,
                                                        backgroundColor: isPeak ? Colors.expense : (amt > 0 ? Colors.primary : Colors.border),
                                                        opacity: selectedDayInfo ? (isSelected ? 1 : 0.35) : 1
                                                    }
                                                ]}
                                                activeOpacity={0.8}
                                            />
                                        );
                                    })}
                                </View>

                                {/* Axis Labels */}
                                <View style={styles.axisLabelsRow}>
                                    <Text style={[styles.axisLabel, { color: Colors.textMuted }]}>Day 1</Text>
                                    <Text style={[styles.axisLabel, { color: Colors.textMuted }]}>Day 15</Text>
                                    <Text style={[styles.axisLabel, { color: Colors.textMuted }]}>Day {dailySpendingData.daysInMonth}</Text>
                                </View>
                            </View>
                        </HoverCard>

                        {/* Card 2: Top Purchases & Weekday vs Weekend Split */}
                        <View style={[styles.dualCardRow, isTablet || isDesktop ? styles.dualCardRowWide : undefined]}>
                            
                            {/* Top 3 Purchases */}
                            <View style={[styles.card, styles.flex1, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                                <View style={styles.miniCardHeader}>
                                    <View style={[styles.miniHeaderIcon, { backgroundColor: Colors.expense + '18' }]}>
                                        <ShoppingBag size={14} color={Colors.expense} />
                                    </View>
                                    <Text style={[styles.miniCardTitle, { color: Colors.text }]}>Top Purchases</Text>
                                </View>

                                {topPurchases.length > 0 ? (
                                    <View style={styles.topPurchasesList}>
                                        {topPurchases.map((tx, idx) => (
                                            <TouchableOpacity
                                                key={`top-${tx.id || idx}`}
                                                style={[styles.topPurchaseItem, { borderBottomColor: Colors.border }]}
                                                onPress={() => navigateToHistory({ name: tx.category }, 'EXPENSE')}
                                                activeOpacity={0.7}
                                            >
                                                <View style={{ flex: 1, marginRight: 6 }}>
                                                    <Text style={[styles.topPurchaseCategory, { color: Colors.text }]} numberOfLines={1}>
                                                        #{idx + 1} {tx.category}
                                                    </Text>
                                                    <Text style={[styles.topPurchaseMeta, { color: Colors.textMuted }]} numberOfLines={1}>
                                                        {format(parseISO(tx.date), 'MMM dd')} {tx.note ? `• ${tx.note}` : ''}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.topPurchaseAmount, { color: Colors.expense }]}>
                                                    ₹{Number(tx.amount).toLocaleString('en-IN')}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={styles.miniEmptyBox}>
                                        <Text style={[styles.miniEmptyText, { color: Colors.textMuted }]}>No major expenses recorded</Text>
                                    </View>
                                )}
                            </View>

                            {/* Weekday vs Weekend Distribution */}
                            <View style={[styles.card, styles.flex1, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                                <View style={styles.miniCardHeader}>
                                    <View style={[styles.miniHeaderIcon, { backgroundColor: Colors.primary + '18' }]}>
                                        <Calendar size={14} color={Colors.primary} />
                                    </View>
                                    <Text style={[styles.miniCardTitle, { color: Colors.text }]}>Day Distribution</Text>
                                </View>

                                <View style={styles.daySplitContent}>
                                    {/* Weekdays */}
                                    <View style={styles.daySplitItem}>
                                        <View style={styles.daySplitHeader}>
                                            <Text style={[styles.daySplitLabel, { color: Colors.textMuted }]}>Mon–Fri (Weekdays)</Text>
                                            <Text style={[styles.daySplitPct, { color: Colors.text }]}>{weekdayWeekendStats.weekdayPct}%</Text>
                                        </View>
                                        <View style={[styles.splitTrack, { backgroundColor: Colors.border }]}>
                                            <View style={[styles.splitFill, { width: `${weekdayWeekendStats.weekdayPct}%`, backgroundColor: Colors.primary }]} />
                                        </View>
                                        <Text style={[styles.daySplitAmount, { color: Colors.textMuted }]}>
                                            ₹{weekdayWeekendStats.weekday.toLocaleString('en-IN')}
                                        </Text>
                                    </View>

                                    {/* Weekends */}
                                    <View style={styles.daySplitItem}>
                                        <View style={styles.daySplitHeader}>
                                            <Text style={[styles.daySplitLabel, { color: Colors.textMuted }]}>Sat–Sun (Weekends)</Text>
                                            <Text style={[styles.daySplitPct, { color: Colors.text }]}>{weekdayWeekendStats.weekendPct}%</Text>
                                        </View>
                                        <View style={[styles.splitTrack, { backgroundColor: Colors.border }]}>
                                            <View style={[styles.splitFill, { width: `${weekdayWeekendStats.weekendPct}%`, backgroundColor: '#F59E0B' }]} />
                                        </View>
                                        <Text style={[styles.daySplitAmount, { color: Colors.textMuted }]}>
                                            ₹{weekdayWeekendStats.weekend.toLocaleString('en-IN')}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Card 3: Context-Aware Financial Insight */}
                        <View style={[
                            styles.insightCard,
                            {
                                backgroundColor: Colors.surface,
                                borderColor: Colors.border,
                                borderLeftColor: stats.net >= 0 ? Colors.income : Colors.expense
                            }
                        ]}>
                            <View style={[
                                styles.insightIconBadge,
                                { backgroundColor: (stats.net >= 0 ? Colors.income : Colors.expense) + '18' }
                            ]}>
                                {stats.net >= 0 ? (
                                    <ArrowUpCircle color={Colors.income} size={20} />
                                ) : (
                                    <ArrowDownCircle color={Colors.expense} size={20} />
                                )}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.insightTitle, { color: Colors.text }]}>
                                    {stats.net >= 0 ? 'Surplus Momentum' : 'Cash Flow Deficit Warning'}
                                </Text>
                                <Text style={[styles.insightMessage, { color: Colors.textMuted }]}>
                                    {stats.net >= 0
                                        ? `Great discipline! You retained ₹${stats.net.toLocaleString('en-IN')} (${financialHealth.rate}% savings rate) this month. Consider funneling this surplus into emergency buffers or long-term investments.`
                                        : `You are in deficit by ₹${Math.abs(stats.net).toLocaleString('en-IN')} this month. Review your top spending categories above to bring cash burn back in line with incoming earnings.`
                                    }
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* ════════ RIGHT COLUMN: Expense Donut, Budget Tracker & Income Sources ════════ */}
                    <View style={[styles.bentoColumn, isDesktop ? { flex: 0.95 } : undefined]}>

                        {/* Card 4: Expense Breakdown (Donut Chart + Ranked Categories) */}
                        <HoverCard disabled={true} style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                            <View style={styles.cardHeader}>
                                <View>
                                    <Text style={[styles.cardTitle, { color: Colors.text }]}>Expense Distribution</Text>
                                    <Text style={[styles.cardSubtitle, { color: Colors.textMuted }]}>
                                        {format(selectedDate, 'MMMM yyyy')} • ₹{stats.expense.toLocaleString('en-IN')} Total
                                    </Text>
                                </View>
                                <View style={[styles.cardHeaderIconBadge, { backgroundColor: Colors.expense + '18' }]}>
                                    <Tag size={16} color={Colors.expense} />
                                </View>
                            </View>

                            {expenseBreakdown.length > 0 ? (
                                <>
                                    {/* Donut Chart */}
                                    <View style={styles.chartWrapper}>
                                        <InteractiveDonut
                                            data={expenseBreakdown}
                                            size={Math.min(windowWidth - 64, 280)}
                                            innerRadius={65}
                                            onSelect={setSelectedExpenseCat as any}
                                            selectedItem={expenseBreakdown.find(b => b.name === selectedExpenseCat) || null}
                                            colors={Colors}
                                            onCenterPress={(item) => navigateToHistory(item.name, 'EXPENSE')}
                                        />
                                    </View>

                                    {/* Category Progress List */}
                                    <View style={styles.breakdownList}>
                                        {expenseBreakdown.map((item) => (
                                            <TouchableOpacity
                                                key={item.name}
                                                style={[
                                                    styles.breakdownItem,
                                                    { backgroundColor: selectedExpenseCat === item.name ? item.color + '15' : Colors.surfaceElevated, borderColor: selectedExpenseCat === item.name ? item.color : Colors.border }
                                                ]}
                                                onPress={() => navigateToHistory({ name: item.name }, 'EXPENSE')}
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.breakdownItemHeader}>
                                                    <View style={styles.breakdownLeftGroup}>
                                                        <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                                                        <Text style={[styles.itemName, { color: Colors.text }]} numberOfLines={1}>
                                                            {item.name}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.breakdownRightGroup}>
                                                        <Text style={[styles.itemAmount, { color: Colors.text }]}>
                                                            ₹{item.amount.toLocaleString('en-IN')}
                                                        </Text>
                                                        <ArrowUpRight size={13} color={Colors.textMuted} />
                                                    </View>
                                                </View>

                                                <View style={[styles.progressBg, { backgroundColor: Colors.border }]}>
                                                    <View style={[styles.progressFill, { width: `${item.percent}%`, backgroundColor: item.color }]} />
                                                </View>

                                                <View style={styles.percentFooter}>
                                                    <Text style={[styles.itemPercent, { color: Colors.textMuted }]}>
                                                        {item.percent.toFixed(1)}% of total expenses
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <Info size={36} color={Colors.textMuted} />
                                    <Text style={[styles.emptyText, { color: Colors.textMuted }]}>
                                        No expenses recorded for this month.
                                    </Text>
                                </View>
                            )}
                        </HoverCard>

                        {/* Card 5: Category Budget vs Actual Tracker (if budgets set) */}
                        {budgetProgressList.length > 0 && (
                            <HoverCard disabled={true} style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={[styles.cardTitle, { color: Colors.text }]}>Budget vs Actual</Text>
                                        <Text style={[styles.cardSubtitle, { color: Colors.textMuted }]}>
                                            Category spend against monthly budget targets
                                        </Text>
                                    </View>
                                    <View style={[styles.cardHeaderIconBadge, { backgroundColor: Colors.primary + '18' }]}>
                                        <Target size={16} color={Colors.primary} />
                                    </View>
                                </View>

                                <View style={styles.budgetList}>
                                    {budgetProgressList.map(item => (
                                        <View key={`bgt-${item.category}`} style={[styles.budgetItemCard, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
                                            <View style={styles.budgetItemHeader}>
                                                <Text style={[styles.budgetItemName, { color: Colors.text }]}>{item.category}</Text>
                                                <Text style={[styles.budgetItemSpend, { color: item.color }]}>
                                                    ₹{item.spent.toLocaleString('en-IN')} / ₹{item.budget.toLocaleString('en-IN')} ({item.pct}%)
                                                </Text>
                                            </View>
                                            <View style={[styles.progressBg, { backgroundColor: Colors.border }]}>
                                                <View style={[styles.progressFill, { width: `${Math.min(100, item.pct)}%`, backgroundColor: item.color }]} />
                                            </View>
                                            <View style={styles.budgetStatusRow}>
                                                <Text style={[styles.budgetStatusText, { color: item.color }]}>
                                                    {item.pct > 100 ? `Over budget by ₹${(item.spent - item.budget).toLocaleString('en-IN')}` : `₹${(item.budget - item.spent).toLocaleString('en-IN')} remaining`}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </HoverCard>
                        )}

                        {/* Card 6: Income Sources Breakdown */}
                        <HoverCard disabled={true} style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                            <View style={styles.cardHeader}>
                                <View>
                                    <Text style={[styles.cardTitle, { color: Colors.text }]}>Income Sources</Text>
                                    <Text style={[styles.cardSubtitle, { color: Colors.textMuted }]}>
                                        {format(selectedDate, 'MMMM yyyy')} • ₹{stats.income.toLocaleString('en-IN')} Total
                                    </Text>
                                </View>
                                <View style={[styles.cardHeaderIconBadge, { backgroundColor: Colors.income + '18' }]}>
                                    <ArrowUpCircle size={16} color={Colors.income} />
                                </View>
                            </View>

                            {incomeBreakdown.length > 0 ? (
                                <>
                                    {incomeBreakdown.length > 1 && (
                                        <View style={styles.chartWrapper}>
                                            <InteractiveDonut
                                                data={incomeBreakdown}
                                                size={Math.min(windowWidth - 64, 240)}
                                                innerRadius={55}
                                                onSelect={setSelectedIncomeCat as any}
                                                selectedItem={incomeBreakdown.find(b => b.name === selectedIncomeCat) || null}
                                                colors={Colors}
                                                onCenterPress={(item) => navigateToHistory({ name: item.name, accountId: (item as any).accountId }, 'INCOME')}
                                            />
                                        </View>
                                    )}

                                    <View style={styles.breakdownList}>
                                        {incomeBreakdown.map((item) => (
                                            <TouchableOpacity
                                                key={item.name}
                                                style={[
                                                    styles.breakdownItem,
                                                    { backgroundColor: selectedIncomeCat === item.name ? item.color + '15' : Colors.surfaceElevated, borderColor: selectedIncomeCat === item.name ? item.color : Colors.border }
                                                ]}
                                                onPress={() => navigateToHistory({ name: item.name, accountId: item.accountId }, 'INCOME')}
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.breakdownItemHeader}>
                                                    <View style={styles.breakdownLeftGroup}>
                                                        <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                                                        <Text style={[styles.itemName, { color: Colors.text }]} numberOfLines={1}>
                                                            {item.name}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.breakdownRightGroup}>
                                                        <Text style={[styles.itemAmount, { color: Colors.income }]}>
                                                            +₹{item.amount.toLocaleString('en-IN')}
                                                        </Text>
                                                        <ArrowUpRight size={13} color={Colors.textMuted} />
                                                    </View>
                                                </View>
                                                <View style={[styles.progressBg, { backgroundColor: Colors.border }]}>
                                                    <View style={[styles.progressFill, { width: `${item.percent}%`, backgroundColor: item.color }]} />
                                                </View>
                                                <View style={styles.percentFooter}>
                                                    <Text style={[styles.itemPercent, { color: Colors.textMuted }]}>
                                                        {item.percent.toFixed(1)}% of total income
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <Info size={36} color={Colors.textMuted} />
                                    <Text style={[styles.emptyText, { color: Colors.textMuted }]}>
                                        No income streams recorded for this month.
                                    </Text>
                                </View>
                            )}
                        </HoverCard>

                    </View>
                </View>
            </View>

            {/* ── 4. FILTER BY SPECIFIC ACCOUNT MODAL ── */}
            <Modal
                visible={isFilterModalOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsFilterModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                        {/* Modal Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: Colors.border }]}>
                            <View>
                                <Text style={[styles.modalTitle, { color: Colors.text }]}>Filter by Account</Text>
                                <Text style={[styles.modalSubtitle, { color: Colors.textMuted }]}>Select account scope for reports</Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsFilterModalOpen(false)} style={styles.modalCloseButton} activeOpacity={0.7}>
                                <X color={Colors.textMuted} size={20} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            {/* Classification Section */}
                            <View style={styles.modalSection}>
                                <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>Account Groups</Text>
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
                                                    { borderColor: Colors.border, backgroundColor: Colors.surfaceElevated },
                                                    isSelected && { backgroundColor: Colors.primary + '20', borderColor: Colors.primary }
                                                ]}
                                                onPress={() => setTempSelectedAccount(item.id)}
                                                activeOpacity={0.7}
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
                                <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>Specific Bank Accounts & Cards</Text>
                                <View style={styles.chipsGrid}>
                                    {accountsToSelect.map(acc => {
                                        const isSelected = tempSelectedAccount === acc.id;
                                        return (
                                            <TouchableOpacity
                                                key={`temp-acc-${acc.id}`}
                                                style={[
                                                    styles.modalChip,
                                                    { borderColor: Colors.border, backgroundColor: Colors.surfaceElevated },
                                                    isSelected && { backgroundColor: Colors.income + '20', borderColor: Colors.income }
                                                ]}
                                                onPress={() => setTempSelectedAccount(acc.id)}
                                                activeOpacity={0.7}
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
                                style={[styles.modalResetButton, { borderColor: Colors.border, backgroundColor: Colors.surfaceElevated }]}
                                onPress={handleResetModal}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.modalResetButtonText, { color: Colors.textMuted }]}>Reset All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalApplyButton, { backgroundColor: Colors.primary }]}
                                onPress={handleApplyModal}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.modalApplyButtonText}>Apply Scope</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── 5. MONTH & YEAR PICKER MODAL ── */}
            <Modal
                visible={isMonthPickerOpen}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsMonthPickerOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.monthPickerCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                        {/* Year Stepper Header */}
                        <View style={[styles.pickerYearHeader, { borderBottomColor: Colors.border }]}>
                            <TouchableOpacity onPress={() => setPickerYear(prev => prev - 1)} style={styles.yearArrowBtn} activeOpacity={0.7}>
                                <ChevronLeft color={Colors.text} size={20} />
                            </TouchableOpacity>
                            <Text style={[styles.pickerYearText, { color: Colors.text }]}>{pickerYear}</Text>
                            <TouchableOpacity onPress={() => setPickerYear(prev => prev + 1)} style={styles.yearArrowBtn} activeOpacity={0.7}>
                                <ChevronRight color={Colors.text} size={20} />
                            </TouchableOpacity>
                        </View>

                        {/* 12 Months Grid */}
                        <View style={styles.monthGrid}>
                            {MONTHS.map((m, idx) => {
                                const isCurrent = selectedDate.getFullYear() === pickerYear && selectedDate.getMonth() === idx;
                                return (
                                    <TouchableOpacity
                                        key={m}
                                        style={[
                                            styles.monthGridBtn,
                                            { borderColor: Colors.border, backgroundColor: Colors.surfaceElevated },
                                            isCurrent && { backgroundColor: Colors.primary, borderColor: Colors.primary }
                                        ]}
                                        onPress={() => selectPickerMonth(idx)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.monthGridText,
                                            { color: isCurrent ? '#ffffff' : Colors.text, fontWeight: isCurrent ? '700' : '600' }
                                        ]}>
                                            {m}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Current Month Shortcut Button */}
                        <TouchableOpacity
                            style={[styles.thisMonthBtn, { backgroundColor: Colors.primary + '18', borderColor: Colors.primary }]}
                            onPress={() => {
                                const now = new Date();
                                setSelectedDate(new Date(now.getFullYear(), now.getMonth(), 1));
                                setIsMonthPickerOpen(false);
                            }}
                            activeOpacity={0.8}
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
    container: {
        flex: 1,
    },
    mainWrapper: {
        width: '100%',
        paddingHorizontal: 16,
    },
    desktopContainer: {
        maxWidth: 1280,
        alignSelf: 'center',
        paddingHorizontal: 24,
    },
    
    // Command Header
    headerCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 12,
        marginBottom: 12,
        gap: 10,
    },
    topNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
    },
    subtabContainer: {
        flexDirection: 'row',
        borderRadius: 10,
        padding: 3,
        borderWidth: 1,
    },
    subtabBtn: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    subtabText: {
        fontSize: 12.5,
        fontWeight: '700',
    },
    monthNavGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 2,
        height: 36,
    },
    monthStepBtn: {
        paddingHorizontal: 8,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthLabelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    monthNavText: {
        fontSize: 13,
        fontWeight: '700',
    },
    accountControlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    segmentContainer: {
        flex: 1,
        flexDirection: 'row',
        borderRadius: 10,
        padding: 3,
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
        color: '#ffffff',
    },
    activeBadgeRow: {
        flexDirection: 'row',
        paddingTop: 2,
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    activeBadgeText: {
        fontSize: 11.5,
        fontWeight: '600',
    },

    // Ribbon
    ribbonCard: {
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    ribbonItem: {
        flex: 1,
        alignItems: 'center',
    },
    ribbonItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 2,
    },
    ribbonDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    ribbonStatLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    ribbonStatValue: {
        fontSize: 15,
        fontWeight: '800',
        marginTop: 1,
    },
    ribbonSubtext: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    ribbonDivider: {
        width: 1,
        height: 32,
    },

    // Bento Grid Layout
    bentoContainer: {
        width: '100%',
    },
    bentoGridDesktop: {
        flexDirection: 'row',
        gap: 16,
        alignItems: 'flex-start',
    },
    bentoGridMobile: {
        flexDirection: 'column',
        gap: 14,
    },
    bentoColumn: {
        gap: 14,
    },

    // Cards
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
    },
    flex1: {
        flex: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    cardSubtitle: {
        fontSize: 11.5,
        marginTop: 2,
    },
    cardHeaderIconBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Health Track
    healthTrackBox: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    healthHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    healthLabelGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    healthTitleText: {
        fontSize: 13,
        fontWeight: '700',
    },
    healthRateText: {
        fontSize: 13,
        fontWeight: '800',
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },

    // Dual Pills
    dualPillRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 14,
    },
    pillCard: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    pillCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 4,
    },
    pillCardLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    pillCardValue: {
        fontSize: 15,
        fontWeight: '800',
    },
    pillCardSub: {
        fontSize: 10,
        marginTop: 3,
    },

    // Daily Spending Chart Section
    chartSection: {
        marginTop: 4,
    },
    chartHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    chartSectionTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    inspectorChip: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    inspectorChipText: {
        fontSize: 11,
        fontWeight: '600',
    },
    legendRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    legendSquare: {
        width: 8,
        height: 8,
        borderRadius: 2,
    },
    legendText: {
        fontSize: 10,
        fontWeight: '500',
    },
    barsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 56,
        gap: 2,
    },
    dayBar: {
        flex: 1,
        borderRadius: 2,
    },
    axisLabelsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    axisLabel: {
        fontSize: 9.5,
        fontWeight: '500',
    },

    // Dual Cards (Top Purchases & Day Split)
    dualCardRow: {
        flexDirection: 'column',
        gap: 14,
    },
    dualCardRowWide: {
        flexDirection: 'row',
        gap: 14,
    },
    miniCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    miniHeaderIcon: {
        width: 24,
        height: 24,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniCardTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    topPurchasesList: {
        gap: 8,
    },
    topPurchaseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 6,
        borderBottomWidth: 0.5,
    },
    topPurchaseCategory: {
        fontSize: 12,
        fontWeight: '700',
    },
    topPurchaseMeta: {
        fontSize: 10,
        marginTop: 1,
    },
    topPurchaseAmount: {
        fontSize: 12.5,
        fontWeight: '800',
    },
    miniEmptyBox: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    miniEmptyText: {
        fontSize: 11,
    },

    // Day Split
    daySplitContent: {
        gap: 10,
    },
    daySplitItem: {
        gap: 3,
    },
    daySplitHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    daySplitLabel: {
        fontSize: 10.5,
        fontWeight: '600',
    },
    daySplitPct: {
        fontSize: 10.5,
        fontWeight: '700',
    },
    splitTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    splitFill: {
        height: '100%',
        borderRadius: 3,
    },
    daySplitAmount: {
        fontSize: 9.5,
        fontWeight: '500',
        marginTop: 1,
    },

    // Context Insight Card
    insightCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderLeftWidth: 4,
        padding: 14,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    insightIconBadge: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    insightTitle: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2,
    },
    insightMessage: {
        fontSize: 11.5,
        lineHeight: 16,
    },

    // Donut & Breakdowns
    chartWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 12,
        minHeight: 220,
    },
    breakdownList: {
        gap: 8,
    },
    breakdownItem: {
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        gap: 6,
    },
    breakdownItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    breakdownLeftGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        marginRight: 8,
    },
    colorIndicator: {
        width: 9,
        height: 9,
        borderRadius: 4.5,
    },
    itemName: {
        fontSize: 13,
        fontWeight: '700',
    },
    breakdownRightGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    itemAmount: {
        fontSize: 13,
        fontWeight: '800',
    },
    progressBg: {
        height: 5,
        borderRadius: 2.5,
        overflow: 'hidden',
    },
    percentFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    itemPercent: {
        fontSize: 10.5,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 36,
        gap: 10,
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 13,
    },

    // Budget Tracker
    budgetList: {
        gap: 10,
    },
    budgetItemCard: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 6,
    },
    budgetItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    budgetItemName: {
        fontSize: 12.5,
        fontWeight: '700',
    },
    budgetItemSpend: {
        fontSize: 11.5,
        fontWeight: '800',
    },
    budgetStatusRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    budgetStatusText: {
        fontSize: 10,
        fontWeight: '600',
    },

    // Filter Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    modalContent: {
        width: '100%',
        maxWidth: 600,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 18,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        maxHeight: '82%',
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
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
        fontWeight: '800',
    },
    modalSubtitle: {
        fontSize: 11.5,
        marginTop: 2,
    },
    modalCloseButton: {
        padding: 6,
        borderRadius: 8,
    },
    modalBody: {
        marginVertical: 14,
    },
    modalSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 11.5,
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
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    modalChipText: {
        fontSize: 12.5,
        fontWeight: '600',
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
        fontSize: 13,
        fontWeight: '700',
    },
    modalApplyButton: {
        flex: 2,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalApplyButtonText: {
        color: '#ffffff',
        fontSize: 13.5,
        fontWeight: '700',
    },

    // Month Picker Modal
    monthPickerCard: {
        width: 320,
        borderRadius: 20,
        borderWidth: 1,
        padding: 18,
        alignSelf: 'center',
        marginBottom: 'auto',
        marginTop: 'auto',
    },
    pickerYearHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 14,
        borderBottomWidth: 1,
        marginBottom: 14,
    },
    pickerYearText: {
        fontSize: 18,
        fontWeight: '800',
    },
    yearArrowBtn: {
        padding: 8,
        borderRadius: 8,
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'space-between',
    },
    monthGridBtn: {
        width: '30%',
        paddingVertical: 11,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthGridText: {
        fontSize: 13,
    },
    thisMonthBtn: {
        marginTop: 16,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
    },
    thisMonthBtnText: {
        fontSize: 12.5,
        fontWeight: '700',
    },
});
