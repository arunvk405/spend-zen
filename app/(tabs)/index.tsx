import React, { useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Platform, Modal, Pressable, ActivityIndicator, Animated, TextInput, Alert, useWindowDimensions
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFinance } from '../../src/context/FinanceContext';
import { useThemeColors } from '../../src/theme/colors';
import {
    Wallet, Landmark, CreditCard, TrendingUp, TrendingDown,
    ArrowRight, Briefcase, RotateCcw, Plus, AlertCircle, Pencil, X,
    PiggyBank, Gift, Laptop, Package, Utensils, Activity, Home, Car, User, PawPrint, FileText, Film,
    Trash2, CheckCircle, ChevronDown, Bell, Sparkles, ChevronRight, ChevronLeft
} from 'lucide-react-native';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, TRANSFER_CATEGORIES } from '../../src/models';
import { format, isSameMonth, isSameYear, parseISO, subWeeks, isSameWeek } from 'date-fns';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
                isHovered && !disabled ? { shadowOpacity: 0.12, shadowRadius: 16, elevation: 6, transform: [{ translateY: -2 }] } : undefined,
                pressed && !disabled ? { transform: [{ scale: 0.985 }] } : undefined,
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
    const insets = useSafeAreaInsets();
    const { width: windowWidth } = useWindowDimensions();
    const isDesktop = windowWidth >= 860;

    const topPadding = Math.max(insets.top + 6, Platform.OS === 'ios' ? 52 : 14);
    const bottomPadding = Math.max(insets.bottom + 85, 105);

    const {
        totalBalance, cashBalance, monthlyIncome, monthlyExpenses,
        bankAccounts, totalBankBalance,
        creditCards, totalCreditDue,
        transactions, loading, hasFetchedOnce, hasError, refreshData, addTransaction,
        cashAccountName, renameCashAccount,
        categoryBudgets, customCategories,
        recurringBills, addRecurringBill, deleteRecurringBill, payRecurringBill,
        savingsGoals, addSavingsGoal, deleteSavingsGoal, allocateToGoal
    } = useFinance();

    const [fadeAnim] = useState(new Animated.Value(1));
    const [currentQuoteIndex, setCurrentQuoteIndex] = useState(() => {
        return new Date().getDate() % MOTIVATIONAL_QUOTES.length;
    });

    // Modal states for Savings Goals
    const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);
    const [showBillCategoryDropdown, setShowBillCategoryDropdown] = useState(false);
    const [showBillAccountDropdown, setShowBillAccountDropdown] = useState(false);
    const [showAllocateAccountDropdown, setShowAllocateAccountDropdown] = useState(false);
    const [newGoalName, setNewGoalName] = useState('');
    const [newGoalTarget, setNewGoalTarget] = useState('');
    const [newGoalColor, setNewGoalColor] = useState('#2196F3');

    const [isAllocateOpen, setIsAllocateOpen] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<any>(null);
    const [allocateAmount, setAllocateAmount] = useState('');
    const [allocateAccountId, setAllocateAccountId] = useState('cash');

    // Modal states for Recurring Bills
    const [isAddBillOpen, setIsAddBillOpen] = useState(false);
    const [newBillName, setNewBillName] = useState('');
    const [newBillAmount, setNewBillAmount] = useState('');
    const [newBillCategory, setNewBillCategory] = useState('Utilities');
    const [newBillDueDate, setNewBillDueDate] = useState('1');
    const [newBillAccountId, setNewBillAccountId] = useState('cash');

    const [confirmCardId, setConfirmCardId] = useState<string | null>(null);
    const [selectedSourceAccountId, setSelectedSourceAccountId] = useState<string | null>(null);
    const [clearing, setClearing] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');

    const bankScrollRef = React.useRef<ScrollView>(null);
    const creditScrollRef = React.useRef<ScrollView>(null);

    const scrollBank = (direction: 'left' | 'right') => {
        const scrollAmount = 220;
        if (bankScrollRef.current) {
            if (Platform.OS === 'web') {
                const node = (bankScrollRef.current as any)?.getScrollableNode?.() || (bankScrollRef.current as any);
                if (node) {
                    if (typeof node.scrollBy === 'function') {
                        node.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
                        return;
                    } else if (node.scrollLeft !== undefined) {
                        node.scrollLeft += direction === 'left' ? -scrollAmount : scrollAmount;
                        return;
                    }
                }
            }
            bankScrollRef.current.scrollTo({
                x: direction === 'left' ? -scrollAmount : scrollAmount,
                animated: true
            });
        }
    };

    const scrollCredit = (direction: 'left' | 'right') => {
        const scrollAmount = 240;
        if (creditScrollRef.current) {
            if (Platform.OS === 'web') {
                const node = (creditScrollRef.current as any)?.getScrollableNode?.() || (creditScrollRef.current as any);
                if (node) {
                    if (typeof node.scrollBy === 'function') {
                        node.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
                        return;
                    } else if (node.scrollLeft !== undefined) {
                        node.scrollLeft += direction === 'left' ? -scrollAmount : scrollAmount;
                        return;
                    }
                }
            }
            creditScrollRef.current.scrollTo({
                x: direction === 'left' ? -scrollAmount : scrollAmount,
                animated: true
            });
        }
    };

    // Desktop / Laptop mouse drag & wheel scrolling setup
    React.useEffect(() => {
        if (Platform.OS !== 'web') return;

        const getDomElement = (ref: React.RefObject<any>) => {
            if (!ref?.current) return null;
            if (typeof ref.current.getScrollableNode === 'function') {
                return ref.current.getScrollableNode();
            }
            if (typeof HTMLElement !== 'undefined' && ref.current instanceof HTMLElement) {
                return ref.current;
            }
            if (ref.current._inputRef) {
                return ref.current._inputRef;
            }
            return ref.current;
        };

        const setupScrollListeners = (ref: React.RefObject<any>) => {
            const node = getDomElement(ref);
            if (!node || typeof node.addEventListener !== 'function') return () => {};

            let isDown = false;
            let startX = 0;
            let startScrollLeft = 0;
            let didDrag = false;

            const onMouseDown = (e: MouseEvent) => {
                if (e.button !== 0) return;
                isDown = true;
                didDrag = false;
                startX = e.pageX - node.offsetLeft;
                startScrollLeft = node.scrollLeft;
                node.style.cursor = 'grabbing';
                node.style.userSelect = 'none';
            };

            const onMouseLeave = () => {
                if (isDown) {
                    isDown = false;
                    node.style.cursor = 'grab';
                    node.style.removeProperty('user-select');
                }
            };

            const onMouseUp = () => {
                if (isDown) {
                    isDown = false;
                    node.style.cursor = 'grab';
                    node.style.removeProperty('user-select');
                }
            };

            const onMouseMove = (e: MouseEvent) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - node.offsetLeft;
                const walk = (x - startX) * 1.3;
                if (Math.abs(walk) > 4) {
                    didDrag = true;
                }
                node.scrollLeft = startScrollLeft - walk;
            };

            const onClickCapture = (e: MouseEvent) => {
                if (didDrag) {
                    e.stopPropagation();
                    e.preventDefault();
                    didDrag = false;
                }
            };

            const onWheel = (e: WheelEvent) => {
                if (node.scrollWidth > node.clientWidth) {
                    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
                        e.preventDefault();
                        node.scrollLeft += e.deltaY;
                    }
                }
            };

            node.style.cursor = 'grab';

            node.addEventListener('mousedown', onMouseDown);
            node.addEventListener('mouseleave', onMouseLeave);
            node.addEventListener('mouseup', onMouseUp);
            node.addEventListener('mousemove', onMouseMove);
            node.addEventListener('click', onClickCapture, true);
            node.addEventListener('wheel', onWheel, { passive: false });

            return () => {
                node.removeEventListener('mousedown', onMouseDown);
                node.removeEventListener('mouseleave', onMouseLeave);
                node.removeEventListener('mouseup', onMouseUp);
                node.removeEventListener('mousemove', onMouseMove);
                node.removeEventListener('click', onClickCapture, true);
                node.removeEventListener('wheel', onWheel);
            };
        };

        const cleanupBank = setupScrollListeners(bankScrollRef);
        const cleanupCredit = setupScrollListeners(creditScrollRef);

        return () => {
            cleanupBank?.();
            cleanupCredit?.();
        };
    }, [bankAccounts, creditCards]);

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
            triggerNewQuote();
            const interval = setInterval(() => {
                triggerNewQuote();
            }, 12000);
            return () => clearInterval(interval);
        }, [triggerNewQuote])
    );

    const currentMonthExpensesByCategory = useMemo(() => {
        const now = new Date();
        const expenses: Record<string, number> = {};

        transactions.forEach(t => {
            if (t.type === 'EXPENSE') {
                const txDate = parseISO(t.date);
                if (isSameMonth(txDate, now) && isSameYear(txDate, now)) {
                    expenses[t.category] = (expenses[t.category] || 0) + Number(t.amount);
                }
            }
        });
        return expenses;
    }, [transactions]);

    const expenseCategories = useMemo(() => {
        const customExpense = customCategories ? customCategories.filter((c: any) => c.type === 'EXPENSE') : [];
        return [...EXPENSE_CATEGORIES, ...customExpense];
    }, [customCategories]);

    const activeBudgets = useMemo(() => {
        if (!categoryBudgets) return [];
        return Object.entries(categoryBudgets)
            .map(([name, limit]) => {
                const spent = currentMonthExpensesByCategory[name] || 0;
                const category = expenseCategories.find(c => c.name === name) || { icon: 'package', color: Colors.primary };
                const ratio = spent / limit;
                return {
                    name,
                    limit,
                    spent,
                    ratio,
                    percent: Math.min(100, ratio * 100),
                    icon: category.icon,
                    color: category.color
                };
            })
            .sort((a, b) => b.ratio - a.ratio);
    }, [categoryBudgets, currentMonthExpensesByCategory, expenseCategories, Colors.primary]);

    const totalMasterBudget = useMemo(() => {
        if (!categoryBudgets) return 0;
        return Object.values(categoryBudgets).reduce((sum, limit) => sum + Number(limit), 0);
    }, [categoryBudgets]);

    const masterBudgetRatio = useMemo(() => {
        if (totalMasterBudget <= 0) return 0;
        return monthlyExpenses / totalMasterBudget;
    }, [monthlyExpenses, totalMasterBudget]);

    const upcomingBillsDue = useMemo(() => {
        const today = new Date().getDate();
        const currentMonthStr = format(new Date(), 'yyyy-MM');

        return recurringBills.filter(bill => {
            if (bill.lastPaidMonth === currentMonthStr) return false;
            const dueDay = Number(bill.dueDate);
            const daysLeft = dueDay - today;
            return daysLeft <= 7;
        }).map(bill => {
            const dueDay = Number(bill.dueDate);
            const daysLeft = dueDay - today;
            let badgeText = '';
            let isUrgent = false;

            if (daysLeft === 0) {
                badgeText = 'Due Today';
                isUrgent = true;
            } else if (daysLeft > 0) {
                badgeText = `Due in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`;
                isUrgent = daysLeft <= 2;
            } else {
                badgeText = `Overdue (${Math.abs(daysLeft)}d ago)`;
                isUrgent = true;
            }

            return { ...bill, daysLeft, badgeText, isUrgent };
        });
    }, [recurringBills]);

    const aiFinancialTip = useMemo(() => {
        const now = new Date();
        const lastWeek = subWeeks(now, 1);

        let thisWeekExp = 0;
        let lastWeekExp = 0;

        transactions.forEach(t => {
            if (t.type === 'EXPENSE' && t.category !== 'Self Transfer' && t.category !== 'Credit Card Payment') {
                const dateObj = parseISO(t.date);
                if (isSameWeek(dateObj, now, { weekStartsOn: 1 })) {
                    thisWeekExp += Number(t.amount);
                } else if (isSameWeek(dateObj, lastWeek, { weekStartsOn: 1 })) {
                    lastWeekExp += Number(t.amount);
                }
            }
        });

        const netSavings = monthlyIncome - monthlyExpenses;
        const savingsRate = monthlyIncome > 0 ? Math.round((netSavings / monthlyIncome) * 100) : 0;

        if (lastWeekExp > 0 && thisWeekExp < lastWeekExp) {
            const pctLess = Math.round(((lastWeekExp - thisWeekExp) / lastWeekExp) * 100);
            return {
                title: "Spending Velocity Down! 🚀",
                message: `You spent ${pctLess}% less this week compared to last week! On track to save ₹${netSavings > 0 ? netSavings.toLocaleString('en-IN') : '0'} this month.`,
                type: 'positive'
            };
        } else if (lastWeekExp > 0 && thisWeekExp > lastWeekExp) {
            const pctMore = Math.round(((thisWeekExp - lastWeekExp) / lastWeekExp) * 100);
            return {
                title: "Weekly Spending Alert ⚠️",
                message: `Weekly spending is up ${pctMore}% compared to last week (₹${thisWeekExp.toLocaleString('en-IN')} vs ₹${lastWeekExp.toLocaleString('en-IN')}). Pause non-essentials to preserve your budget.`,
                type: 'warning'
            };
        } else if (savingsRate >= 30) {
            return {
                title: "High Savings Rate Achieved 🌟",
                message: `Outstanding! Your savings rate is ${savingsRate}%. You are exceeding standard wealth-building benchmarks!`,
                type: 'positive'
            };
        } else if (netSavings < 0) {
            return {
                title: "Budget Deficit Notice 🚨",
                message: `Expenses exceed income by ₹${Math.abs(netSavings).toLocaleString('en-IN')}. Review top spending categories to restore balance.`,
                type: 'danger'
            };
        } else {
            return {
                title: "Financial AI Insight ✨",
                message: `Log your daily expenses consistently to unlock real-time spending velocity and predictive savings trends.`,
                type: 'info'
            };
        }
    }, [transactions, monthlyIncome, monthlyExpenses]);

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
        return 'Unknown';
    };

    const targetAccounts = useMemo(() => {
        const list = [{ id: 'cash', name: cashAccountName }];
        if (bankAccounts) bankAccounts.forEach(b => list.push({ id: b.id, name: b.bankName }));
        if (creditCards) creditCards.forEach(c => list.push({ id: c.id, name: c.cardName }));
        return list;
    }, [bankAccounts, creditCards, cashAccountName]);

    const handleCreateGoal = async () => {
        if (!newGoalName || !newGoalTarget) return;
        const target = parseFloat(newGoalTarget);
        if (isNaN(target) || target <= 0) return;

        await addSavingsGoal({
            name: newGoalName,
            targetAmount: target,
            color: newGoalColor,
        });

        setNewGoalName('');
        setNewGoalTarget('');
        setIsCreateGoalOpen(false);
    };

    const handleAllocate = async () => {
        if (!selectedGoal || !allocateAmount) return;
        const amount = parseFloat(allocateAmount);
        if (isNaN(amount) || amount <= 0) return;

        await allocateToGoal(selectedGoal.id, amount, allocateAccountId);

        setAllocateAmount('');
        setIsAllocateOpen(false);
        setSelectedGoal(null);
    };

    const handleCreateBill = async () => {
        if (!newBillName || !newBillAmount || !newBillDueDate) return;
        const amount = parseFloat(newBillAmount);
        const due = parseInt(newBillDueDate);
        if (isNaN(amount) || amount <= 0 || isNaN(due) || due < 1 || due > 31) return;

        await addRecurringBill({
            name: newBillName,
            amount: amount,
            category: newBillCategory,
            dueDate: due,
            accountId: newBillAccountId,
            period: 'monthly',
        });

        setNewBillName('');
        setNewBillAmount('');
        setNewBillDueDate('1');
        setIsAddBillOpen(false);
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

        setSelectedSourceAccountId('cash');
        setPaymentAmount(card.dueAmount.toString());
        setConfirmCardId(cardId);
    };

    const confirmClear = async () => {
        if (!confirmCardId) return;
        const card = creditCards.find(c => c.id === confirmCardId);
        if (!card) return;

        const payAmt = parseFloat(paymentAmount);
        if (isNaN(payAmt) || payAmt <= 0) {
            if (Platform.OS === 'web') {
                window.alert("Please enter a valid payment amount.");
            } else {
                Alert.alert("Invalid Amount", "Please enter a valid payment amount.");
            }
            return;
        }

        setConfirmCardId(null);
        setClearing(true);
        try {
            if (selectedSourceAccountId) {
                await addTransaction({
                    amount: payAmt,
                    type: 'EXPENSE',
                    category: 'Credit Card Payment',
                    date: new Date().toISOString(),
                    accountId: selectedSourceAccountId,
                    toAccountId: confirmCardId,
                    note: `Paid ${card.cardName} due`
                });

                const sourceName = getAccountName(selectedSourceAccountId);
                await addTransaction({
                    amount: payAmt,
                    type: 'TRANSFER',
                    category: 'Credit Card Payment',
                    date: new Date().toISOString(),
                    accountId: confirmCardId,
                    toAccountId: confirmCardId,
                    note: `Settled using ${sourceName}`
                });
            } else {
                await addTransaction({
                    amount: payAmt,
                    type: 'TRANSFER',
                    category: 'Credit Card Payment',
                    date: new Date().toISOString(),
                    accountId: confirmCardId,
                    toAccountId: confirmCardId,
                    note: 'Direct Reset'
                });
            }

            if (Platform.OS !== 'web') {
                try {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (e) { }
            }
        } catch (error) {
            console.error("Error settling card:", error);
        } finally {
            setClearing(false);
            setSelectedSourceAccountId(null);
            setPaymentAmount('');
        }
    };

    const netSavings = monthlyIncome - monthlyExpenses;
    const isNetPositive = netSavings >= 0;

    // ── Individual Section Renderers ─────────────────────────────

    const renderHeroBalance = () => (
        <HoverCard
            disabled={true}
            style={[
                s.heroBalanceCard,
                {
                    backgroundColor: Colors.surface,
                    borderColor: Colors.border,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.06,
                    shadowRadius: 14,
                    elevation: 4
                }
            ]}
        >
            <View style={s.heroHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[s.heroTagLabel, { color: Colors.textMuted }]}>AVAILABLE BALANCE</Text>
                </View>
                <View style={[s.accountsBadgePill, { backgroundColor: Colors.primary + '12', borderColor: Colors.primary + '30' }]}>
                    <Text style={[s.accountsBadgeText, { color: Colors.primary }]}>
                        {bankAccounts.length + 1} Accounts Active
                    </Text>
                </View>
            </View>

            <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[s.heroBalanceText, { color: Colors.text }]}
            >
                ₹{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>

            <View style={s.dualAccountsRow}>
                <View style={[s.dualAccountCard, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
                    <View style={[s.accountBadgeIcon, { backgroundColor: Colors.income + '18' }]}>
                        <Landmark color={Colors.income} size={15} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[s.dualAccountLabel, { color: Colors.textMuted }]} numberOfLines={1}>
                            Bank ({bankAccounts.length})
                        </Text>
                        <Text style={[s.dualAccountValue, { color: Colors.income }]} numberOfLines={1}>
                            ₹{totalBankBalance.toLocaleString('en-IN')}
                        </Text>
                    </View>
                </View>

                <View style={[s.dualAccountCard, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
                    <View style={[s.accountBadgeIcon, { backgroundColor: Colors.primary + '18' }]}>
                        <Wallet color={Colors.primary} size={15} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[s.dualAccountLabel, { color: Colors.textMuted }]} numberOfLines={1}>
                            {cashAccountName || 'Cash'}
                        </Text>
                        <Text style={[s.dualAccountValue, { color: Colors.primary }]} numberOfLines={1}>
                            ₹{cashBalance.toLocaleString('en-IN')}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={[s.monthlyFlowStrip, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
                <View style={s.monthlyFlowItem}>
                    <Text style={[s.monthlyFlowLabel, { color: Colors.textMuted }]}>
                        {format(new Date(), 'MMM')} INFLOW
                    </Text>
                    <Text style={[s.monthlyFlowValue, { color: Colors.income }]}>
                        +₹{monthlyIncome.toLocaleString('en-IN')}
                    </Text>
                </View>

                <View style={[s.verticalDivider, { backgroundColor: Colors.border }]} />

                <View style={s.monthlyFlowItem}>
                    <Text style={[s.monthlyFlowLabel, { color: Colors.textMuted }]}>
                        {format(new Date(), 'MMM')} OUTFLOW
                    </Text>
                    <Text style={[s.monthlyFlowValue, { color: Colors.expense }]}>
                        -₹{monthlyExpenses.toLocaleString('en-IN')}
                    </Text>
                </View>

                <View style={[s.verticalDivider, { backgroundColor: Colors.border }]} />

                <View style={s.monthlyFlowItem}>
                    <Text style={[s.monthlyFlowLabel, { color: Colors.textMuted }]}>
                        NET SAVED
                    </Text>
                    <Text style={[s.monthlyFlowValue, { color: isNetPositive ? Colors.income : Colors.expense }]}>
                        {isNetPositive ? '+' : ''}₹{netSavings.toLocaleString('en-IN')}
                    </Text>
                </View>
            </View>

            {totalMasterBudget > 0 && (
                <View style={[s.budgetProgressBarContainer, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={[s.budgetBarHeaderLabel, { color: Colors.text }]}>Monthly Budget Used</Text>
                        <Text style={[
                            s.budgetBarHeaderValue,
                            { color: masterBudgetRatio >= 1 ? Colors.expense : masterBudgetRatio >= 0.8 ? '#F59E0B' : Colors.income }
                        ]}>
                            ₹{monthlyExpenses.toLocaleString('en-IN')} / ₹{totalMasterBudget.toLocaleString('en-IN')} ({Math.round(masterBudgetRatio * 100)}%)
                        </Text>
                    </View>
                    <View style={[s.budgetBarTrackBg, { backgroundColor: Colors.border + '50' }]}>
                        <View style={[
                            s.budgetBarFillColor,
                            {
                                width: `${Math.min(100, Math.round(masterBudgetRatio * 100))}%`,
                                backgroundColor: masterBudgetRatio >= 1 ? Colors.expense : masterBudgetRatio >= 0.8 ? '#F59E0B' : Colors.income
                            }
                        ]} />
                    </View>
                </View>
            )}

            {totalCreditDue > 0 && (
                <View style={[s.dueAlertBanner, { backgroundColor: Colors.expense + '12', borderColor: Colors.expense + '30' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <AlertCircle size={15} color={Colors.expense} />
                        <Text style={[s.dueAlertText, { color: Colors.expense }]} numberOfLines={1}>
                            Total Credit Due: ₹{totalCreditDue.toLocaleString('en-IN')}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[s.dueAlertBtn, { backgroundColor: Colors.expense }]}
                        onPress={() => {
                            const cardWithDue = creditCards.find(c => c.dueAmount > 0) || creditCards[0];
                            if (cardWithDue) handleClearCard(cardWithDue.id);
                        }}
                    >
                        <Text style={s.dueAlertBtnText}>Settle Due</Text>
                    </TouchableOpacity>
                </View>
            )}
        </HoverCard>
    );

    const renderUpcomingBills = () => {
        if (upcomingBillsDue.length === 0) return null;
        return (
            <View style={[s.billsAlertCard, { backgroundColor: Colors.surface, borderColor: '#F59E0B', borderLeftColor: '#F59E0B' }]}>
                <View style={s.billsAlertHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Bell size={15} color="#F59E0B" />
                        <Text style={[s.billsAlertTitle, { color: Colors.text }]}>
                            Upcoming Bill Reminders ({upcomingBillsDue.length})
                        </Text>
                    </View>
                    <Text style={[s.billsAlertSubtitle, { color: Colors.textMuted }]}>Next 7 days</Text>
                </View>

                <View style={{ gap: 8 }}>
                    {upcomingBillsDue.map(bill => (
                        <View key={`alert-${bill.id}`} style={[s.billAlertItem, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={[s.billAlertName, { color: Colors.text }]}>{bill.name}</Text>
                                    <View style={[
                                        s.billUrgencyBadge,
                                        { backgroundColor: bill.isUrgent ? Colors.expense + '15' : '#F59E0B15' }
                                    ]}>
                                        <Text style={[
                                            s.billUrgencyBadgeText,
                                            { color: bill.isUrgent ? Colors.expense : '#F59E0B' }
                                        ]}>
                                            {bill.badgeText}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[s.billAlertMeta, { color: Colors.textMuted }]}>
                                    ₹{bill.amount.toLocaleString('en-IN')} • {getAccountName(bill.accountId)}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={[s.payBillActionBtn, { backgroundColor: Colors.primary }]}
                                onPress={() => payRecurringBill(bill)}
                            >
                                <Text style={s.payBillActionBtnText}>Mark Paid</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const renderMindfulness = () => (
        <Pressable
            onPress={triggerNewQuote}
            style={({ pressed }) => [
                s.mindfulnessCard,
                {
                    backgroundColor: Colors.surface,
                    borderColor: Colors.border,
                    borderLeftColor: Colors.primary,
                },
                pressed ? { transform: [{ scale: 0.99 }] } : undefined,
                Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.15s ease' } : undefined
            ] as any}
        >
            <View style={[s.quoteIconCircle, { backgroundColor: Colors.primary + '15' }]}>
                <PiggyBank color={Colors.primary} size={20} />
            </View>
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <View style={s.quoteHeaderRow}>
                    <Text style={[s.quoteCategoryTag, { color: Colors.textMuted }]}>
                        — {MOTIVATIONAL_QUOTES[currentQuoteIndex].category} Spark
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <RotateCcw size={10} color={Colors.primary} />
                        <Text style={[s.quoteRotateHint, { color: Colors.primary }]}>
                            Tap to rotate
                        </Text>
                    </View>
                </View>
                <Text style={[s.quoteBodyText, { color: Colors.text }]}>
                    "{MOTIVATIONAL_QUOTES[currentQuoteIndex].quote}"
                </Text>
                <Text style={[s.quoteAuthorText, { color: Colors.textMuted }]}>
                    — {MOTIVATIONAL_QUOTES[currentQuoteIndex].author}
                </Text>
            </Animated.View>
        </Pressable>
    );

    const renderAiInsight = () => (
        <View style={[
            s.aiInsightCard,
            {
                backgroundColor: Colors.surface,
                borderColor: Colors.border,
                borderLeftColor: aiFinancialTip.type === 'positive' ? Colors.income : aiFinancialTip.type === 'warning' ? '#F59E0B' : aiFinancialTip.type === 'danger' ? Colors.expense : Colors.primary,
            }
        ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <View style={[
                    s.aiInsightIconBadge,
                    {
                        backgroundColor: (aiFinancialTip.type === 'positive' ? Colors.income : aiFinancialTip.type === 'warning' ? '#F59E0B' : aiFinancialTip.type === 'danger' ? Colors.expense : Colors.primary) + '15'
                    }
                ]}>
                    <Sparkles size={15} color={aiFinancialTip.type === 'positive' ? Colors.income : aiFinancialTip.type === 'warning' ? '#F59E0B' : aiFinancialTip.type === 'danger' ? Colors.expense : Colors.primary} />
                </View>
                <Text style={[s.aiInsightTitle, { color: Colors.text }]}>
                    {aiFinancialTip.title}
                </Text>
            </View>
            <Text style={[s.aiInsightMessage, { color: Colors.textMuted }]}>
                {aiFinancialTip.message}
            </Text>
        </View>
    );

    const renderCategoryBudgets = () => (
        <View style={{ marginBottom: 16 }}>
            <View style={s.sectionHeader}>
                <Text style={[s.sectionTitle, { color: Colors.text }]}>Category Budgets</Text>
                <TouchableOpacity
                    onPress={() => router.push('/set-budgets')}
                    style={[s.addAccountBtn, { backgroundColor: Colors.primary }]}
                    accessibilityLabel="Set category budgets"
                >
                    <Pencil size={13} color="#fff" />
                </TouchableOpacity>
            </View>

            {activeBudgets.length === 0 ? (
                <TouchableOpacity
                    onPress={() => router.push('/set-budgets')}
                    style={[s.emptyCard, { borderColor: Colors.border, backgroundColor: Colors.surface }]}
                >
                    <Plus size={16} color={Colors.textMuted} />
                    <Text style={[s.emptyText, { color: Colors.textMuted }]}>Set your monthly budgets</Text>
                </TouchableOpacity>
            ) : (
                <HoverCard disabled={true} style={[s.budgetContainerCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <View style={{ gap: 14 }}>
                        {activeBudgets.map(budget => {
                            const isExceeded = budget.ratio >= 1.0;
                            const isWarning = budget.ratio >= 0.8 && budget.ratio < 1.0;

                            let barColor = budget.color;
                            if (isExceeded) barColor = Colors.expense;
                            else if (isWarning) barColor = '#FF9800';

                            return (
                                <View key={budget.name} style={s.budgetRow}>
                                    <View style={s.budgetInfoRow}>
                                        <View style={s.budgetLabelCol}>
                                            <View style={[s.budgetIconBg, { backgroundColor: budget.color + '18' }]}>
                                                <IconRenderer name={budget.icon} color={budget.color} size={15} />
                                            </View>
                                            <Text style={[s.budgetName, { color: Colors.text }]}>{budget.name}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={[s.budgetAmountText, { color: Colors.text }]}>
                                                ₹{budget.spent.toLocaleString('en-IN')} <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: 'normal' }}>of ₹{budget.limit.toLocaleString('en-IN')}</Text>
                                            </Text>
                                            {isExceeded && (
                                                <Text style={{ fontSize: 9.5, color: Colors.expense, fontWeight: '700', marginTop: 1 }}>
                                                    Over by ₹{(budget.spent - budget.limit).toLocaleString('en-IN')}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    <View style={[s.budgetBarTrack, { backgroundColor: Colors.border + '40' }]}>
                                        <View style={[s.budgetBarFill, { width: `${budget.percent}%`, backgroundColor: barColor }]} />
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </HoverCard>
            )}
        </View>
    );

    const renderSavingsGoals = () => (
        <View style={{ marginBottom: 16 }}>
            <View style={s.sectionHeader}>
                <Text style={[s.sectionTitle, { color: Colors.text }]}>Savings Goals</Text>
                <TouchableOpacity
                    onPress={() => setIsCreateGoalOpen(true)}
                    style={[s.addAccountBtn, { backgroundColor: Colors.primary }]}
                    accessibilityLabel="Create savings goal"
                >
                    <Plus size={14} color="#fff" />
                </TouchableOpacity>
            </View>

            {savingsGoals.length === 0 ? (
                <TouchableOpacity
                    onPress={() => setIsCreateGoalOpen(true)}
                    style={[s.emptyCard, { borderColor: Colors.border, backgroundColor: Colors.surface }]}
                >
                    <Plus size={16} color={Colors.textMuted} />
                    <Text style={[s.emptyText, { color: Colors.textMuted }]}>Create your first savings goal</Text>
                </TouchableOpacity>
            ) : (
                <View style={{ gap: 10 }}>
                    {savingsGoals.map(goal => {
                        const progress = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;
                        const percent = Math.min(100, Math.round(progress * 100));
                        return (
                            <HoverCard key={goal.id} disabled={true} style={[s.goalCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                                <View style={s.goalHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <View style={[s.goalColorDot, { backgroundColor: goal.color }]} />
                                        <Text style={[s.goalName, { color: Colors.text }]}>{goal.name}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => deleteSavingsGoal(goal.id)} style={{ padding: 4 }}>
                                        <Trash2 size={13} color={Colors.expense} />
                                    </TouchableOpacity>
                                </View>

                                <View style={s.goalDetails}>
                                    <Text style={[s.goalAmountText, { color: Colors.text }]}>
                                        ₹{goal.currentAmount.toLocaleString('en-IN')} <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: 'normal' }}>of ₹{goal.targetAmount.toLocaleString('en-IN')}</Text>
                                    </Text>
                                    <Text style={[s.goalPercent, { color: goal.color, fontWeight: '700' }]}>{percent}%</Text>
                                </View>

                                <View style={[s.goalTrack, { backgroundColor: Colors.border + '40' }]}>
                                    <View style={[s.goalFill, { width: `${percent}%`, backgroundColor: goal.color }]} />
                                </View>

                                <TouchableOpacity
                                    style={[s.allocateBtn, { borderColor: goal.color + '40', backgroundColor: goal.color + '12' }]}
                                    onPress={() => {
                                        setSelectedGoal(goal);
                                        setAllocateAmount('');
                                        setAllocateAccountId('cash');
                                        setIsAllocateOpen(true);
                                    }}
                                >
                                    <Plus size={12} color={goal.color} style={{ marginRight: 4 }} />
                                    <Text style={[s.allocateBtnText, { color: goal.color }]}>Allocate Funds</Text>
                                </TouchableOpacity>
                            </HoverCard>
                        );
                    })}
                </View>
            )}
        </View>
    );

    const renderRecurringBills = () => (
        <View style={{ marginBottom: 16 }}>
            <View style={s.sectionHeader}>
                <Text style={[s.sectionTitle, { color: Colors.text }]}>Recurring Bills & Subs</Text>
                <TouchableOpacity
                    onPress={() => setIsAddBillOpen(true)}
                    style={[s.addAccountBtn, { backgroundColor: Colors.primary }]}
                    accessibilityLabel="Add recurring bill"
                >
                    <Plus size={14} color="#fff" />
                </TouchableOpacity>
            </View>

            {recurringBills.length === 0 ? (
                <TouchableOpacity
                    onPress={() => setIsAddBillOpen(true)}
                    style={[s.emptyCard, { borderColor: Colors.border, backgroundColor: Colors.surface }]}
                >
                    <Plus size={16} color={Colors.textMuted} />
                    <Text style={[s.emptyText, { color: Colors.textMuted }]}>Add your first subscription or bill</Text>
                </TouchableOpacity>
            ) : (
                <View style={{ gap: 10 }}>
                    {recurringBills.map(bill => {
                        const currentMonthStr = format(new Date(), 'yyyy-MM');
                        const isPaid = bill.lastPaidMonth === currentMonthStr;
                        const accountName = getAccountName(bill.accountId);

                        return (
                            <HoverCard key={bill.id} disabled={true} style={[s.billCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                                <View style={s.billInfo}>
                                    <View style={{ flex: 1, marginRight: 8 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={[s.billName, { color: Colors.text }]} numberOfLines={1}>{bill.name}</Text>
                                            <View style={[s.billCategoryTag, { backgroundColor: Colors.border + '50' }]}>
                                                <Text style={[s.billCategoryTagText, { color: Colors.textMuted }]}>{bill.category}</Text>
                                            </View>
                                        </View>
                                        <Text style={{ fontSize: 10.5, color: Colors.textMuted, marginTop: 3 }}>
                                            Due day {bill.dueDate} • via {accountName}
                                        </Text>
                                    </View>

                                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 10 }}>
                                        <Text style={[s.billAmount, { color: Colors.text }]}>₹{bill.amount.toLocaleString('en-IN')}</Text>

                                        {isPaid ? (
                                            <View style={s.paidStatusBadge}>
                                                <CheckCircle size={16} color="#4CAF50" />
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={[s.payBillBtn, { backgroundColor: Colors.primary }]}
                                                onPress={() => payRecurringBill(bill)}
                                            >
                                                <Text style={s.payBillBtnText}>Pay</Text>
                                            </TouchableOpacity>
                                        )}

                                        <TouchableOpacity onPress={() => deleteRecurringBill(bill.id)} style={{ padding: 4 }}>
                                            <Trash2 size={13} color={Colors.expense} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </HoverCard>
                        );
                    })}
                </View>
            )}
        </View>
    );

    const renderCashAccount = () => (
        <View style={{ marginBottom: 16 }}>
            <View style={[s.sectionHeader]}>
                <Text style={[s.sectionTitle, { color: Colors.text }]}>{cashAccountName}</Text>
                <TouchableOpacity onPress={handleRenameCash} style={{ padding: 4 }} accessibilityLabel="Rename cash account">
                    <Pencil size={13} color={Colors.textMuted} />
                </TouchableOpacity>
            </View>
            <HoverCard
                style={[s.cashCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                onPress={() => router.push({ pathname: '/reports', params: { accountId: 'cash' } })}
            >
                <View style={[s.accountIcon, { backgroundColor: '#4CAF5018', marginBottom: 0 }]}>
                    <Wallet color="#4CAF50" size={20} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[s.accountName, { color: Colors.textMuted }]}>{cashAccountName}</Text>
                    <Text style={[s.accountBalance, { color: Colors.text }]}>₹{cashBalance.toLocaleString('en-IN')}</Text>
                </View>
                <ChevronRight size={16} color={Colors.textMuted} />
            </HoverCard>
        </View>
    );

    const renderBankAccounts = () => (
        <View style={{ marginBottom: 16 }}>
            <View style={s.sectionHeader}>
                <Text style={[s.sectionTitle, { color: Colors.text }]}>Bank Accounts</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[s.sectionTotal, { color: Colors.income }]}>₹{totalBankBalance.toLocaleString('en-IN')}</Text>

                    {bankAccounts.length >= 1 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <TouchableOpacity
                                onPress={() => scrollBank('left')}
                                style={[s.scrollArrowBtn, { borderColor: Colors.border, backgroundColor: Colors.surface }]}
                                accessibilityLabel="Scroll bank accounts left"
                            >
                                <ChevronLeft size={14} color={Colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => scrollBank('right')}
                                style={[s.scrollArrowBtn, { borderColor: Colors.border, backgroundColor: Colors.surface }]}
                                accessibilityLabel="Scroll bank accounts right"
                            >
                                <ChevronRight size={14} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={() => router.push('/manage-accounts')}
                        style={[s.addAccountBtn, { backgroundColor: Colors.primary }]}
                        accessibilityLabel="Manage bank accounts"
                    >
                        <Plus size={14} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
            {bankAccounts.length === 0 ? (
                <TouchableOpacity
                    onPress={() => router.push('/manage-accounts')}
                    style={[s.emptyCard, { borderColor: Colors.border, backgroundColor: Colors.surface }]}
                >
                    <Plus size={16} color={Colors.textMuted} />
                    <Text style={[s.emptyText, { color: Colors.textMuted }]}>Add your first bank account</Text>
                </TouchableOpacity>
            ) : (
                <ScrollView
                    ref={bankScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={s.hScroll}
                >
                    {bankAccounts.map(acc => (
                        <HoverCard
                            key={acc.id}
                            style={[s.bankCard, { backgroundColor: Colors.surface, borderColor: Colors.border, borderTopColor: acc.color, borderTopWidth: 3.5 }]}
                            onPress={() => router.push({ pathname: '/reports', params: { accountId: acc.id } })}
                        >
                            <View style={[s.accountIcon, { backgroundColor: acc.color + '18' }]}>
                                <Landmark color={acc.color} size={18} />
                            </View>
                            <Text style={[s.accountName, { color: Colors.text }]} numberOfLines={1}>{acc.bankName}</Text>
                            <Text style={[s.accountType, { color: Colors.textMuted }]}>{acc.accountType}</Text>
                            <Text style={[s.accountBalance, { color: Colors.text }]}>₹{acc.computedBalance.toLocaleString('en-IN')}</Text>
                        </HoverCard>
                    ))}
                    <HoverCard
                        onPress={() => router.push('/manage-accounts')}
                        style={[s.bankCard, s.addCard, { borderColor: Colors.border, backgroundColor: Colors.surface }]}
                    >
                        <Plus size={22} color={Colors.textMuted} />
                        <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 4, fontWeight: '600' }}>Add Bank</Text>
                    </HoverCard>
                </ScrollView>
            )}
        </View>
    );

    const renderCreditCards = () => (
        <View style={{ marginBottom: 16 }}>
            <View style={s.sectionHeader}>
                <Text style={[s.sectionTitle, { color: Colors.text }]}>Credit Cards</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {totalCreditDue > 0 && (
                        <Text style={[s.sectionTotal, { color: Colors.expense }]}>Due ₹{totalCreditDue.toLocaleString('en-IN')}</Text>
                    )}

                    {creditCards.length >= 1 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <TouchableOpacity
                                onPress={() => scrollCredit('left')}
                                style={[s.scrollArrowBtn, { borderColor: Colors.border, backgroundColor: Colors.surface }]}
                                accessibilityLabel="Scroll credit cards left"
                            >
                                <ChevronLeft size={14} color={Colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => scrollCredit('right')}
                                style={[s.scrollArrowBtn, { borderColor: Colors.border, backgroundColor: Colors.surface }]}
                                accessibilityLabel="Scroll credit cards right"
                            >
                                <ChevronRight size={14} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={() => router.push('/manage-accounts?tab=credit')}
                        style={[s.addAccountBtn, { backgroundColor: '#EF4444' }]}
                        accessibilityLabel="Manage credit cards"
                    >
                        <Plus size={14} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
            {creditCards.length === 0 ? (
                <TouchableOpacity
                    onPress={() => router.push('/manage-accounts?tab=credit')}
                    style={[s.emptyCard, { borderColor: Colors.border, backgroundColor: Colors.surface }]}
                >
                    <Plus size={16} color={Colors.textMuted} />
                    <Text style={[s.emptyText, { color: Colors.textMuted }]}>Add your first credit card</Text>
                </TouchableOpacity>
            ) : (
                <ScrollView
                    ref={creditScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={s.hScroll}
                >
                    {creditCards.map(card => (
                        <HoverCard
                            key={card.id}
                            style={[
                                s.bankCard,
                                {
                                    width: 175,
                                    padding: 12,
                                    backgroundColor: Colors.surface,
                                    borderColor: Colors.border,
                                    borderTopColor: card.color,
                                    borderTopWidth: 3.5
                                }
                            ]}
                            onPress={() => router.push({ pathname: '/reports', params: { accountId: card.id } })}
                        >
                            <View style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                                <Pressable onPress={() => handleClearCard(card.id)} hitSlop={8}>
                                    <RotateCcw size={11} color={Colors.textMuted} />
                                </Pressable>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <View style={[s.accountIcon, { width: 28, height: 28, marginBottom: 0, backgroundColor: card.color + '18' }]}>
                                    <CreditCard color={card.color} size={14} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.accountName, { color: Colors.text, fontWeight: '700' }]} numberOfLines={1}>{card.cardName}</Text>
                                    <Text style={{ fontSize: 9.5, color: Colors.textMuted }}>Due on {card.dueDay}</Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                                <View>
                                    <Text style={{ fontSize: 8.5, color: Colors.textMuted, textTransform: 'uppercase' }}>Limit</Text>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.text }}>₹{card.creditLimit.toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ fontSize: 8.5, color: Colors.textMuted, textTransform: 'uppercase' }}>Used</Text>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.expense }}>₹{card.usedAmount.toLocaleString('en-IN')}</Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View>
                                    <Text style={{ fontSize: 8.5, color: Colors.textMuted, textTransform: 'uppercase' }}>Avail</Text>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.income }}>₹{card.availableBalance.toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ fontSize: 8.5, color: Colors.textMuted, textTransform: 'uppercase' }}>Due</Text>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: card.dueAmount > 0 ? Colors.expense : Colors.text }}>₹{card.dueAmount.toLocaleString('en-IN')}</Text>
                                </View>
                            </View>

                            {card.usedAmount > 0 && (
                                <TouchableOpacity
                                    style={[s.payCardBtn, { backgroundColor: Colors.primary + '14', borderColor: Colors.primary + '30' }]}
                                    onPress={(e: any) => {
                                        if (e && e.stopPropagation) e.stopPropagation();
                                        router.push({
                                            pathname: '/add',
                                            params: {
                                                type: 'TRANSFER',
                                                toAccountId: card.id,
                                                amount: card.usedAmount.toString(),
                                                category: 'Credit Card Payment'
                                            }
                                        });
                                    }}
                                >
                                    <Text style={[s.payCardBtnText, { color: Colors.primary }]}>Pay Card Bill</Text>
                                </TouchableOpacity>
                            )}
                        </HoverCard>
                    ))}
                    <HoverCard
                        onPress={() => router.push('/manage-accounts?tab=credit')}
                        style={[s.bankCard, s.addCard, { width: 110, borderColor: Colors.border, backgroundColor: Colors.surface }]}
                    >
                        <Plus size={22} color={Colors.textMuted} />
                        <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 4, fontWeight: '600' }}>Add Card</Text>
                    </HoverCard>
                </ScrollView>
            )}
        </View>
    );

    const renderRecentTransactions = () => {
        const allCategories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES, ...TRANSFER_CATEGORIES];
        return (
            <View style={{ marginBottom: 20 }}>
                <View style={[s.sectionHeader, { marginTop: 4 }]}>
                    <Text style={[s.sectionTitle, { color: Colors.text }]}>Recent Transactions</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {loading && <ActivityIndicator size="small" color={Colors.primary} />}
                        <TouchableOpacity onPress={refreshData} accessibilityLabel="Refresh data">
                            <RotateCcw size={15} color={Colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/transactions')}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={[s.seeAll, { color: Colors.primary }]}>See All </Text>
                                <ArrowRight size={13} color={Colors.primary} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {currentMonthTransactions.slice(0, 5).map(tx => {
                    const isTransfer = tx.type === 'TRANSFER';
                    const categoryData = allCategories.find(c => c.name === tx.category && c.type === tx.type) ||
                        allCategories.find(c => c.name === tx.category) ||
                        { icon: isTransfer ? 'rotate-ccw' : 'package', color: isTransfer ? Colors.primary : Colors.textMuted };

                    const fromAccName = getAccountName(tx.accountId);
                    const toAccName = tx.toAccountId ? getAccountName(tx.toAccountId) : '';
                    const accountDisplay = isTransfer && toAccName ? `${fromAccName} ➔ ${toAccName}` : fromAccName;

                    return (
                        <HoverCard
                            disabled={true}
                            key={tx.id}
                            style={[s.txItem, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                        >
                            <View style={[s.txHeader, {
                                borderBottomColor: Colors.border + '30',
                                backgroundColor: Colors.isDark ? '#ffffff05' : '#00000003'
                            }]}>
                                <Text style={[s.txCategory, { color: Colors.text }]}>{tx.category || (isTransfer ? 'Self Transfer' : '')}</Text>
                                {tx.note && (
                                    <Text style={[s.txNote, { color: Colors.textMuted }]} numberOfLines={1}>
                                        • {tx.note}
                                    </Text>
                                )}
                            </View>

                            <View style={s.txBody}>
                                <View style={[s.txIcon, { backgroundColor: (categoryData.color || Colors.primary) + '15' }]}>
                                    <IconRenderer name={categoryData.icon} color={categoryData.color || Colors.primary} size={16} />
                                </View>

                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Text style={[s.txAccountTag, { color: Colors.textMuted }]} numberOfLines={1}>
                                        {accountDisplay} • {format(new Date(tx.date), 'MMM d')}
                                    </Text>
                                </View>

                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[s.txAmount, { color: tx.type === 'INCOME' ? Colors.income : tx.type === 'EXPENSE' ? Colors.expense : Colors.primary }]}>
                                        {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : '⇄ '}₹{Number(tx.amount).toLocaleString('en-IN')}
                                    </Text>
                                </View>
                            </View>
                        </HoverCard>
                    );
                })}

                {currentMonthTransactions.length === 0 && (
                    <View style={[s.emptyCard, { borderColor: Colors.border, backgroundColor: Colors.surface, flexDirection: 'column', gap: 4, padding: 28 }]}>
                        <Text style={[s.emptyText, { color: Colors.textMuted }]}>No transactions this month.</Text>
                        <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Tap '+' or quick actions to start tracking!</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <>
            {/* Settle / Pay Card Modal */}
            <Modal visible={!!confirmCardId} transparent animationType="fade" onRequestClose={() => setConfirmCardId(null)}>
                <Pressable style={s.modalOverlay} onPress={() => setConfirmCardId(null)}>
                    <Pressable style={[s.modalBox, { backgroundColor: Colors.surface, width: '92%', maxWidth: 400 }]} onPress={(e) => e.stopPropagation()}>
                        <View style={s.modalHeaderRow}>
                            <Text style={[s.modalTitle, { color: Colors.text }]}>Record Card Payment</Text>
                            <TouchableOpacity onPress={() => setConfirmCardId(null)} hitSlop={8}>
                                <X size={20} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {(() => {
                            const card = creditCards.find(c => c.id === confirmCardId);
                            if (!card) return null;
                            return (
                                <>
                                    <Text style={[s.modalMsg, { color: Colors.textMuted }]}>
                                        Settle balance on <Text style={{ color: Colors.text, fontWeight: '700' }}>{card.cardName}</Text> (Total Due: <Text style={{ color: Colors.expense, fontWeight: '700' }}>₹{card.dueAmount.toLocaleString('en-IN')}</Text>):
                                    </Text>

                                    <Text style={[s.modalFieldLabel, { color: Colors.textMuted }]}>Payment Amount (₹)</Text>
                                    <TextInput
                                        style={[s.modalInput, { color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.background, marginBottom: 14 }]}
                                        placeholder="e.g. 5000"
                                        placeholderTextColor={Colors.textMuted}
                                        keyboardType="numeric"
                                        value={paymentAmount}
                                        onChangeText={setPaymentAmount}
                                    />

                                    <Text style={[s.modalFieldLabel, { color: Colors.textMuted, marginBottom: 8 }]}>Select Funding Account</Text>

                                    <ScrollView style={{ maxHeight: 180, marginBottom: 16 }} showsVerticalScrollIndicator={false}>
                                        <Pressable
                                            style={[
                                                s.fundingOptionItem,
                                                {
                                                    borderColor: selectedSourceAccountId === 'cash' ? Colors.primary : Colors.border,
                                                    backgroundColor: selectedSourceAccountId === 'cash' ? Colors.primary + '10' : Colors.surface,
                                                }
                                            ]}
                                            onPress={() => setSelectedSourceAccountId('cash')}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                <View style={[s.fundingOptionIconBg, { backgroundColor: Colors.income + '15' }]}>
                                                    <Wallet size={16} color={Colors.income} />
                                                </View>
                                                <Text style={{ color: Colors.text, fontSize: 13, fontWeight: '600' }}>{cashAccountName}</Text>
                                            </View>
                                            <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: '600' }}>₹{cashBalance.toLocaleString('en-IN')}</Text>
                                        </Pressable>

                                        {bankAccounts.map(bank => (
                                            <Pressable
                                                key={bank.id}
                                                style={[
                                                    s.fundingOptionItem,
                                                    {
                                                        borderColor: selectedSourceAccountId === bank.id ? Colors.primary : Colors.border,
                                                        backgroundColor: selectedSourceAccountId === bank.id ? Colors.primary + '10' : Colors.surface,
                                                    }
                                                ]}
                                                onPress={() => setSelectedSourceAccountId(bank.id)}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
                                                    <View style={[s.fundingOptionIconBg, { backgroundColor: bank.color + '15' }]}>
                                                        <Landmark size={16} color={bank.color} />
                                                    </View>
                                                    <Text style={{ color: Colors.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{bank.bankName}</Text>
                                                </View>
                                                <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: '600' }}>₹{bank.computedBalance.toLocaleString('en-IN')}</Text>
                                            </Pressable>
                                        ))}

                                        <Pressable
                                            style={[
                                                s.fundingOptionItem,
                                                {
                                                    borderColor: selectedSourceAccountId === null ? Colors.primary : Colors.border,
                                                    backgroundColor: selectedSourceAccountId === null ? Colors.primary + '10' : Colors.surface,
                                                }
                                            ]}
                                            onPress={() => setSelectedSourceAccountId(null)}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                <View style={[s.fundingOptionIconBg, { backgroundColor: Colors.textMuted + '15' }]}>
                                                    <RotateCcw size={16} color={Colors.textMuted} />
                                                </View>
                                                <Text style={{ color: Colors.text, fontSize: 13, fontWeight: '600' }}>Direct Reset (No Account)</Text>
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

            <ScrollView
                style={[s.container, { backgroundColor: Colors.background }]}
                contentContainerStyle={[
                    s.content,
                    {
                        paddingTop: topPadding,
                        paddingBottom: bottomPadding,
                        maxWidth: isDesktop ? 1200 : 680,
                        width: '100%',
                        alignSelf: 'center',
                    }
                ]}
                showsVerticalScrollIndicator={false}
            >

                {/* ── 1. Top Quick Action Command Bar ─────────────────────── */}
                <View style={s.quickActionsRow}>
                    <HoverCard
                        style={[s.quickActionCard, { backgroundColor: Colors.expense + '12', borderColor: Colors.expense + '25' }]}
                        onPress={() => router.push({ pathname: '/add', params: { type: 'EXPENSE' } })}
                    >
                        <View style={[s.quickActionIconCircle, { backgroundColor: Colors.expense + '20' }]}>
                            <TrendingDown size={15} color={Colors.expense} />
                        </View>
                        <Text style={[s.quickActionLabel, { color: Colors.expense }]}>Expense</Text>
                    </HoverCard>

                    <HoverCard
                        style={[s.quickActionCard, { backgroundColor: Colors.income + '12', borderColor: Colors.income + '25' }]}
                        onPress={() => router.push({ pathname: '/add', params: { type: 'INCOME' } })}
                    >
                        <View style={[s.quickActionIconCircle, { backgroundColor: Colors.income + '20' }]}>
                            <TrendingUp size={15} color={Colors.income} />
                        </View>
                        <Text style={[s.quickActionLabel, { color: Colors.income }]}>Income</Text>
                    </HoverCard>

                    <HoverCard
                        style={[s.quickActionCard, { backgroundColor: Colors.primary + '12', borderColor: Colors.primary + '25' }]}
                        onPress={() => router.push({ pathname: '/add', params: { type: 'TRANSFER' } })}
                    >
                        <View style={[s.quickActionIconCircle, { backgroundColor: Colors.primary + '20' }]}>
                            <RotateCcw size={15} color={Colors.primary} />
                        </View>
                        <Text style={[s.quickActionLabel, { color: Colors.primary }]}>Transfer</Text>
                    </HoverCard>

                    <HoverCard
                        style={[s.quickActionCard, { backgroundColor: '#8B5CF614', borderColor: '#8B5CF630' }]}
                        onPress={() => router.push('/ai-planner')}
                    >
                        <View style={[s.quickActionIconCircle, { backgroundColor: '#8B5CF622' }]}>
                            <Sparkles size={15} color="#8B5CF6" />
                        </View>
                        <Text style={[s.quickActionLabel, { color: '#8B5CF6' }]}>AI Planner</Text>
                    </HoverCard>
                </View>

                {/* ── 2. Responsive Content Layout (2-Column Desktop Grid or 1-Column Mobile) ── */}
                {isDesktop ? (
                    <View style={s.desktopGridContainer}>
                        {/* Left Column (Primary Financial Flow & Accounts) */}
                        <View style={s.desktopLeftCol}>
                            {renderHeroBalance()}
                            {renderBankAccounts()}
                            {renderCreditCards()}
                            {renderRecentTransactions()}
                        </View>

                        {/* Right Column (Intelligence, Budgets & Goals) */}
                        <View style={s.desktopRightCol}>
                            {renderMindfulness()}
                            {renderAiInsight()}
                            {renderUpcomingBills()}
                            {renderCategoryBudgets()}
                            {renderSavingsGoals()}
                            {renderRecurringBills()}
                            {renderCashAccount()}
                        </View>
                    </View>
                ) : (
                    <View style={s.mobileContainer}>
                        {renderHeroBalance()}
                        {renderUpcomingBills()}
                        {renderMindfulness()}
                        {renderAiInsight()}
                        {renderCategoryBudgets()}
                        {renderSavingsGoals()}
                        {renderRecurringBills()}
                        {renderCashAccount()}
                        {renderBankAccounts()}
                        {renderCreditCards()}
                        {renderRecentTransactions()}
                    </View>
                )}
            </ScrollView>

            {/* Create Goal Modal */}
            <Modal
                visible={isCreateGoalOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsCreateGoalOpen(false)}
            >
                <View style={s.modalOverlay}>
                    <View style={[s.modalBox, { backgroundColor: Colors.surface }]}>
                        <View style={s.modalHeaderRow}>
                            <Text style={[s.modalTitle, { color: Colors.text }]}>New Savings Goal</Text>
                            <TouchableOpacity onPress={() => setIsCreateGoalOpen(false)} hitSlop={8}>
                                <X size={20} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[s.modalFieldLabel, { color: Colors.textMuted, marginBottom: 4 }]}>Goal Name</Text>
                        <TextInput
                            style={[s.modalInput, { color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.background }]}
                            placeholder="e.g. Vacation Fund"
                            placeholderTextColor={Colors.textMuted}
                            value={newGoalName}
                            onChangeText={setNewGoalName}
                        />

                        <Text style={[s.modalFieldLabel, { color: Colors.textMuted, marginBottom: 4, marginTop: 12 }]}>Target Amount (₹)</Text>
                        <TextInput
                            style={[s.modalInput, { color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.background }]}
                            placeholder="e.g. 50000"
                            placeholderTextColor={Colors.textMuted}
                            keyboardType="numeric"
                            value={newGoalTarget}
                            onChangeText={setNewGoalTarget}
                        />

                        <Text style={[s.modalFieldLabel, { color: Colors.textMuted, marginBottom: 8, marginTop: 12 }]}>Color Theme</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                            {['#2196F3', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'].map(cColor => (
                                <TouchableOpacity
                                    key={cColor}
                                    style={[
                                        s.colorSelectCircle,
                                        { backgroundColor: cColor },
                                        newGoalColor === cColor && { borderWidth: 2, borderColor: Colors.text }
                                    ]}
                                    onPress={() => setNewGoalColor(cColor)}
                                />
                            ))}
                        </View>

                        <View style={s.modalBtns}>
                            <TouchableOpacity
                                style={[s.modalBtn, { borderWidth: 1, borderColor: Colors.border }]}
                                onPress={() => setIsCreateGoalOpen(false)}
                            >
                                <Text style={{ color: Colors.textMuted, fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.modalBtn, { backgroundColor: Colors.primary }]}
                                onPress={handleCreateGoal}
                            >
                                <Text style={{ color: '#fff', fontWeight: '700' }}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Allocate Funds Modal */}
            <Modal
                visible={isAllocateOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsAllocateOpen(false)}
            >
                <View style={s.modalOverlay}>
                    <View style={[s.modalBox, { backgroundColor: Colors.surface }]}>
                        <View style={s.modalHeaderRow}>
                            <Text style={[s.modalTitle, { color: Colors.text }]}>Allocate Funds</Text>
                            <TouchableOpacity onPress={() => setIsAllocateOpen(false)} hitSlop={8}>
                                <X size={20} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 13, color: Colors.textMuted, marginBottom: 14 }}>
                            Move money towards: <Text style={{ fontWeight: '700', color: Colors.text }}>{selectedGoal?.name}</Text>
                        </Text>

                        <Text style={[s.modalFieldLabel, { color: Colors.textMuted, marginBottom: 4 }]}>Amount (₹)</Text>
                        <TextInput
                            style={[s.modalInput, { color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.background }]}
                            placeholder="e.g. 5000"
                            placeholderTextColor={Colors.textMuted}
                            keyboardType="numeric"
                            value={allocateAmount}
                            onChangeText={setAllocateAmount}
                        />

                        <Text style={[s.modalFieldLabel, { color: Colors.textMuted, marginBottom: 4, marginTop: 12 }]}>Deduct From Account</Text>
                        <View style={{ zIndex: 100 }}>
                            <TouchableOpacity
                                style={[s.dropdownTrigger, { borderColor: Colors.border, backgroundColor: Colors.background }]}
                                onPress={() => setShowAllocateAccountDropdown(!showAllocateAccountDropdown)}
                            >
                                <Text style={{ color: Colors.text, fontSize: 13.5 }}>
                                    {targetAccounts.find(a => a.id === allocateAccountId)?.name || 'Select Account'}
                                </Text>
                                <ChevronDown size={16} color={Colors.textMuted} />
                            </TouchableOpacity>

                            {showAllocateAccountDropdown && (
                                <View style={[s.dropdownMenu, { borderColor: Colors.border, backgroundColor: Colors.surface }]}>
                                    <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                                        {targetAccounts.map(acc => (
                                            <TouchableOpacity
                                                key={acc.id}
                                                style={[s.dropdownItem, allocateAccountId === acc.id && { backgroundColor: Colors.primary + '15' }]}
                                                onPress={() => {
                                                    setAllocateAccountId(acc.id);
                                                    setShowAllocateAccountDropdown(false);
                                                }}
                                            >
                                                <Text style={{ color: Colors.text, fontSize: 13 }}>{acc.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        <View style={[s.modalBtns, { marginTop: 18 }]}>
                            <TouchableOpacity
                                style={[s.modalBtn, { borderWidth: 1, borderColor: Colors.border }]}
                                onPress={() => setIsAllocateOpen(false)}
                            >
                                <Text style={{ color: Colors.textMuted, fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.modalBtn, { backgroundColor: Colors.primary }]}
                                onPress={handleAllocate}
                            >
                                <Text style={{ color: '#fff', fontWeight: '700' }}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add Bill Modal */}
            <Modal
                visible={isAddBillOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsAddBillOpen(false)}
            >
                <View style={s.modalOverlay}>
                    <View style={[s.modalBox, { backgroundColor: Colors.surface }]}>
                        <View style={s.modalHeaderRow}>
                            <Text style={[s.modalTitle, { color: Colors.text }]}>New Recurring Bill</Text>
                            <TouchableOpacity onPress={() => setIsAddBillOpen(false)} hitSlop={8}>
                                <X size={20} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[s.modalFieldLabel, { color: Colors.textMuted, marginBottom: 4 }]}>Bill Name</Text>
                        <TextInput
                            style={[s.modalInput, { color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.background }]}
                            placeholder="e.g. Netflix, Rent"
                            placeholderTextColor={Colors.textMuted}
                            value={newBillName}
                            onChangeText={setNewBillName}
                        />

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.modalFieldLabel, { color: Colors.textMuted, marginBottom: 4 }]}>Amount (₹)</Text>
                                <TextInput
                                    style={[s.modalInput, { color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.background }]}
                                    placeholder="199"
                                    placeholderTextColor={Colors.textMuted}
                                    keyboardType="numeric"
                                    value={newBillAmount}
                                    onChangeText={setNewBillAmount}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.modalFieldLabel, { color: Colors.textMuted, marginBottom: 4 }]}>Due Day (1-31)</Text>
                                <TextInput
                                    style={[s.modalInput, { color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.background }]}
                                    placeholder="16"
                                    placeholderTextColor={Colors.textMuted}
                                    keyboardType="numeric"
                                    value={newBillDueDate}
                                    onChangeText={setNewBillDueDate}
                                />
                            </View>
                        </View>

                        <Text style={[s.modalFieldLabel, { color: Colors.textMuted, marginBottom: 4, marginTop: 12 }]}>Category</Text>
                        <View style={{ zIndex: 110, marginBottom: 12 }}>
                            <TouchableOpacity
                                style={[s.dropdownTrigger, { borderColor: Colors.border, backgroundColor: Colors.background }]}
                                onPress={() => {
                                    setShowBillCategoryDropdown(!showBillCategoryDropdown);
                                    setShowBillAccountDropdown(false);
                                }}
                            >
                                <Text style={{ color: Colors.text, fontSize: 13.5 }}>{newBillCategory}</Text>
                                <ChevronDown size={16} color={Colors.textMuted} />
                            </TouchableOpacity>

                            {showBillCategoryDropdown && (
                                <View style={[s.dropdownMenu, { borderColor: Colors.border, backgroundColor: Colors.surface }]}>
                                    <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                                        {expenseCategories.map(cat => (
                                            <TouchableOpacity
                                                key={cat.name}
                                                style={[s.dropdownItem, newBillCategory === cat.name && { backgroundColor: Colors.primary + '15' }]}
                                                onPress={() => {
                                                    setNewBillCategory(cat.name);
                                                    setShowBillCategoryDropdown(false);
                                                }}
                                            >
                                                <Text style={{ color: Colors.text, fontSize: 13 }}>{cat.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        <Text style={[s.modalFieldLabel, { color: Colors.textMuted, marginBottom: 4 }]}>Primary Payment Account</Text>
                        <View style={{ zIndex: 100, marginBottom: 20 }}>
                            <TouchableOpacity
                                style={[s.dropdownTrigger, { borderColor: Colors.border, backgroundColor: Colors.background }]}
                                onPress={() => {
                                    setShowBillAccountDropdown(!showBillAccountDropdown);
                                    setShowBillCategoryDropdown(false);
                                }}
                            >
                                <Text style={{ color: Colors.text, fontSize: 13.5 }}>
                                    {targetAccounts.find(a => a.id === newBillAccountId)?.name || 'Select Account'}
                                </Text>
                                <ChevronDown size={16} color={Colors.textMuted} />
                            </TouchableOpacity>

                            {showBillAccountDropdown && (
                                <View style={[s.dropdownMenu, { borderColor: Colors.border, backgroundColor: Colors.surface }]}>
                                    <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                                        {targetAccounts.map(acc => (
                                            <TouchableOpacity
                                                key={acc.id}
                                                style={[s.dropdownItem, newBillAccountId === acc.id && { backgroundColor: Colors.primary + '15' }]}
                                                onPress={() => {
                                                    setNewBillAccountId(acc.id);
                                                    setShowBillAccountDropdown(false);
                                                }}
                                            >
                                                <Text style={{ color: Colors.text, fontSize: 13 }}>{acc.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        <View style={s.modalBtns}>
                            <TouchableOpacity
                                style={[s.modalBtn, { borderWidth: 1, borderColor: Colors.border }]}
                                onPress={() => setIsAddBillOpen(false)}
                            >
                                <Text style={{ color: Colors.textMuted, fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.modalBtn, { backgroundColor: Colors.primary }]}
                                onPress={handleCreateBill}
                            >
                                <Text style={{ color: '#fff', fontWeight: '700' }}>Add Bill</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: 16, paddingBottom: 100 },

    // Responsive Containers
    desktopGridContainer: {
        flexDirection: 'row',
        gap: 20,
        alignItems: 'flex-start',
        width: '100%',
    },
    desktopLeftCol: {
        flex: 1.15,
        minWidth: 0,
        maxWidth: '100%',
        overflow: 'hidden',
    },
    desktopRightCol: {
        flex: 0.85,
        minWidth: 0,
    },
    mobileContainer: {
        width: '100%',
    },

    // Quick Action Bar
    quickActionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14,
        marginTop: 4,
    },
    quickActionCard: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 9,
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    quickActionIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActionLabel: {
        fontSize: 11.5,
        fontWeight: '700',
    },

    // Executive Hero Balance Card
    heroBalanceCard: {
        borderRadius: 22,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
    },
    heroHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    heroTagLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    accountsBadgePill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1,
    },
    accountsBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    heroBalanceText: {
        fontSize: 30,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 14,
    },

    // Dual Micro-Cards
    dualAccountsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    dualAccountCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 9,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    accountBadgeIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dualAccountLabel: {
        fontSize: 10.5,
        fontWeight: '600',
    },
    dualAccountValue: {
        fontSize: 13,
        fontWeight: '800',
        marginTop: 1,
    },

    // Monthly Flow Strip
    monthlyFlowStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 10,
    },
    monthlyFlowItem: {
        flex: 1,
        alignItems: 'center',
    },
    monthlyFlowLabel: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    monthlyFlowValue: {
        fontSize: 12,
        fontWeight: '800',
        marginTop: 2,
    },
    verticalDivider: {
        width: 1,
        height: 22,
    },

    // Budget Progress Bar inside Hero
    budgetProgressBarContainer: {
        borderRadius: 12,
        padding: 9,
        borderWidth: 1,
        marginBottom: 8,
    },
    budgetBarHeaderLabel: {
        fontSize: 10.5,
        fontWeight: '700',
    },
    budgetBarHeaderValue: {
        fontSize: 10.5,
        fontWeight: '700',
    },
    budgetBarTrackBg: {
        height: 5,
        borderRadius: 2.5,
        overflow: 'hidden',
    },
    budgetBarFillColor: {
        height: 5,
        borderRadius: 2.5,
    },

    // Credit Due Banner inside Hero
    dueAlertBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 7,
        paddingHorizontal: 10,
        borderRadius: 10,
        borderWidth: 1,
        marginTop: 4,
    },
    dueAlertText: {
        fontSize: 11.5,
        fontWeight: '700',
    },
    dueAlertBtn: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    dueAlertBtnText: {
        color: '#fff',
        fontSize: 10.5,
        fontWeight: '700',
    },

    // Bill Reminders Alert Card
    billsAlertCard: {
        borderRadius: 16,
        padding: 13,
        marginBottom: 14,
        borderWidth: 1,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    billsAlertHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    billsAlertTitle: {
        fontSize: 12.5,
        fontWeight: '700',
    },
    billsAlertSubtitle: {
        fontSize: 10,
    },
    billAlertItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 9,
        borderRadius: 10,
        borderWidth: 1,
    },
    billAlertName: {
        fontSize: 12,
        fontWeight: '700',
    },
    billUrgencyBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        borderRadius: 5,
    },
    billUrgencyBadgeText: {
        fontSize: 8.5,
        fontWeight: '700',
    },
    billAlertMeta: {
        fontSize: 9.5,
        marginTop: 2,
    },
    payBillActionBtn: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 7,
    },
    payBillActionBtnText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#fff',
    },

    // Mindfulness Spark Card
    mindfulnessCard: {
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderLeftWidth: 4,
        marginBottom: 10,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    quoteIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quoteHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 3,
    },
    quoteCategoryTag: {
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    quoteRotateHint: {
        fontSize: 8.5,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    quoteBodyText: {
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 17,
        fontStyle: 'italic',
    },
    quoteAuthorText: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 3,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },

    // AI Insight Card
    aiInsightCard: {
        borderRadius: 16,
        padding: 13,
        borderWidth: 1,
        borderLeftWidth: 4,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 2,
    },
    aiInsightIconBadge: {
        padding: 4,
        borderRadius: 6,
    },
    aiInsightTitle: {
        fontSize: 12.5,
        fontWeight: '700',
    },
    aiInsightMessage: {
        fontSize: 11.5,
        lineHeight: 16,
    },

    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    sectionTotal: {
        fontSize: 13,
        fontWeight: '700',
    },
    addAccountBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollArrowBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            web: { cursor: 'pointer' },
            default: {}
        })
    } as any,

    // Category Budgets
    budgetContainerCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        marginBottom: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
    },
    budgetRow: { width: '100%' },
    budgetInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    budgetLabelCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    budgetIconBg: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    budgetName: {
        fontSize: 13,
        fontWeight: '600',
    },
    budgetAmountText: {
        fontSize: 12,
        fontWeight: '700',
    },
    budgetBarTrack: {
        height: 6,
        borderRadius: 3,
        width: '100%',
        overflow: 'hidden',
    },
    budgetBarFill: {
        height: 6,
        borderRadius: 3,
    },

    // Savings Goals
    goalCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 13,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    goalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    goalColorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    goalName: {
        fontSize: 13,
        fontWeight: '700',
    },
    goalDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    goalAmountText: {
        fontSize: 12,
        fontWeight: '700',
    },
    goalPercent: {
        fontSize: 12,
    },
    goalTrack: {
        height: 5,
        borderRadius: 2.5,
        width: '100%',
        overflow: 'hidden',
        marginBottom: 10,
    },
    goalFill: {
        height: 5,
        borderRadius: 2.5,
    },
    allocateBtn: {
        height: 28,
        borderRadius: 7,
        borderWidth: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    allocateBtnText: {
        fontSize: 11,
        fontWeight: '700',
    },

    // Recurring Bills
    billCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    billInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    billName: {
        fontSize: 13,
        fontWeight: '700',
    },
    billCategoryTag: {
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        borderRadius: 4,
    },
    billCategoryTagText: {
        fontSize: 8.5,
        fontWeight: '700',
    },
    billAmount: {
        fontSize: 13,
        fontWeight: '700',
    },
    payBillBtn: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    payBillBtnText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    paidStatusBadge: {
        padding: 2,
    },

    // Cash Card
    cashCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 14,
        padding: 13,
        borderWidth: 1,
        marginBottom: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },

    // Horizontal Scroll for Banks & Cards
    hScroll: {
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        marginBottom: 18,
        paddingBottom: 8,
        paddingTop: 4,
    },
    bankCard: {
        width: 142,
        padding: 12,
        borderRadius: 14,
        marginRight: 10,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    addCard: {
        justifyContent: 'center',
        alignItems: 'center',
        borderStyle: 'dashed',
        shadowOpacity: 0,
        elevation: 0,
    },
    accountIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    accountName: {
        fontSize: 12,
        fontWeight: '600',
    },
    accountType: {
        fontSize: 10,
        marginTop: 1,
    },
    accountBalance: {
        fontSize: 14.5,
        fontWeight: '800',
        marginTop: 3,
    },
    payCardBtn: {
        marginTop: 6,
        borderWidth: 1,
        borderRadius: 6,
        paddingVertical: 3.5,
        alignItems: 'center',
    },
    payCardBtnText: {
        fontSize: 9.5,
        fontWeight: '700',
    },

    // Empty state
    emptyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
    },
    emptyText: {
        fontSize: 12.5,
    },
    seeAll: {
        fontWeight: '600',
        fontSize: 12.5,
    },

    // Transactions list
    txItem: {
        padding: 0,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        overflow: 'hidden',
    },
    txHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderBottomWidth: 1,
        gap: 6,
    },
    txBody: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    txIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    txCategory: {
        fontSize: 12.5,
        fontWeight: '700',
    },
    txNote: {
        fontSize: 10.5,
        fontWeight: '500',
    },
    txAmount: {
        fontSize: 13.5,
        fontWeight: '800',
    },
    txAccountTag: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },

    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalBox: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 18,
        padding: 18,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    modalMsg: {
        fontSize: 12.5,
        lineHeight: 18,
        marginBottom: 12,
    },
    modalFieldLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    modalInput: {
        borderWidth: 1,
        borderRadius: 8,
        height: 38,
        paddingHorizontal: 10,
        fontSize: 13,
        ...Platform.select({
            web: { outlineStyle: 'none' },
            default: {}
        })
    } as any,
    fundingOptionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 6,
    },
    fundingOptionIconBg: {
        width: 26,
        height: 26,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBtns: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 6,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorSelectCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    dropdownTrigger: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        height: 38,
        paddingHorizontal: 10,
    },
    dropdownMenu: {
        position: 'absolute',
        top: 42,
        left: 0,
        right: 0,
        borderRadius: 8,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        zIndex: 9999,
        overflow: 'hidden',
    },
    dropdownItem: {
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
});
