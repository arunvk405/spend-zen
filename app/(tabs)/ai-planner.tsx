import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Platform, useWindowDimensions, Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFinance } from '../../src/context/FinanceContext';
import { useThemeColors } from '../../src/theme/colors';
import {
    Sparkles, Target, AlertTriangle, ShieldCheck,
    Calculator, MessageSquare, Send, ChevronDown, ChevronUp, TrendingUp,
    Check, Trash2, Eye, EyeOff, ExternalLink, RotateCcw,
    ShieldAlert, Lightbulb
} from 'lucide-react-native';
import {
    generateLocalAIPlan, evaluateLocalAffordability, fetchGeminiAIChatResponse,
    FinancialContext, AIPlanResult, AffordabilityResult, ChatHistoryItem
} from '../../src/services/aiService';

export interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: string;
}

const PRESET_QUESTIONS = [
    "How to cut expenses by 15%?",
    "What is my emergency fund target?",
    "Evaluate my credit card debt",
    "How to grow my monthly savings?"
];

const PRESET_AMOUNTS = [5000, 15000, 45000, 80000];

export default function AIPlannerScreen() {
    const Colors = useThemeColors();
    const { width: windowWidth } = useWindowDimensions();
    const isDesktop = windowWidth >= 920;
    const isTablet = windowWidth >= 640 && windowWidth < 920;
    const insets = useSafeAreaInsets();
    const topHeaderPadding = Math.max(insets.top + 8, Platform.OS === 'ios' ? 52 : 14);
    const bottomScrollPadding = Math.max(insets.bottom + 85, 110);

    const {
        monthlyIncome, monthlyExpenses, totalBalance, totalBankBalance,
        cashBalance, totalCreditDue, transactions
    } = useFinance();

    // Gemini API Key State
    const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
        if (Platform.OS === 'web') {
            return (localStorage.getItem('spendzen_gemini_api_key') || '').trim();
        }
        return '';
    });
    const [tempKey, setTempKey] = useState<string>(() => {
        if (Platform.OS === 'web') {
            return (localStorage.getItem('spendzen_gemini_api_key') || '').trim();
        }
        return '';
    });

    const [showKeyInput, setShowKeyInput] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

    const handleSaveApiKey = () => {
        const trimmed = tempKey.trim();
        setGeminiApiKey(trimmed);
        if (Platform.OS === 'web') {
            localStorage.setItem('spendzen_gemini_api_key', trimmed);
        }
        setSaveFeedback(trimmed ? 'Gemini Auth Key Saved & Active!' : 'Key Removed');
        setTimeout(() => setSaveFeedback(null), 3000);
    };

    const handleClearApiKey = () => {
        setTempKey('');
        setGeminiApiKey('');
        if (Platform.OS === 'web') {
            localStorage.removeItem('spendzen_gemini_api_key');
        }
        setSaveFeedback('Key Removed. Reverted to Smart AI.');
        setTimeout(() => setSaveFeedback(null), 3000);
    };

    const handleOpenAIStudio = () => {
        Linking.openURL('https://aistudio.google.com/app/apikey');
    };

    // Top categories computation
    const topCategories = useMemo(() => {
        const catMap: { [key: string]: number } = {};
        transactions.forEach(t => {
            if (t.type === 'EXPENSE' && t.category !== 'Self Transfer') {
                catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
            }
        });
        return Object.entries(catMap)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount);
    }, [transactions]);

    const financialContext: FinancialContext = useMemo(() => ({
        monthlyIncome,
        monthlyExpenses,
        totalBalance,
        bankBalance: totalBankBalance,
        cashBalance,
        creditCardDue: totalCreditDue,
        topExpenseCategories: topCategories
    }), [monthlyIncome, monthlyExpenses, totalBalance, totalBankBalance, cashBalance, totalCreditDue, topCategories]);

    const aiPlan = useMemo<AIPlanResult>(() => {
        return generateLocalAIPlan(financialContext);
    }, [financialContext]);

    // Affordability Calculator State
    const [purchaseCost, setPurchaseCost] = useState('');
    const [affordabilityResult, setAffordabilityResult] = useState<AffordabilityResult | null>(null);

    // Interactive AI Chat History State
    const [userQuestion, setUserQuestion] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            sender: 'ai',
            text: "Hello! 👋 I'm your SpendZen AI Financial Advisor. Ask me anything about your budgets, savings goals, credit dues, or expense leaks.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);

    const handleCalculateAffordability = (amountOverride?: number) => {
        const cost = amountOverride !== undefined ? amountOverride : parseFloat(purchaseCost);
        if (isNaN(cost) || cost <= 0) return;
        if (amountOverride !== undefined) {
            setPurchaseCost(amountOverride.toString());
        }
        const result = evaluateLocalAffordability(cost, financialContext);
        setAffordabilityResult(result);
    };

    const handleClearChat = () => {
        setChatMessages([
            {
                id: 'welcome-' + Date.now(),
                sender: 'ai',
                text: "Chat history cleared! 👋 How else can I assist with your financial planning today?",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
        ]);
    };

    const handleAskQuestion = async (promptText?: string) => {
        const query = (promptText || userQuestion).trim();
        if (!query || isAsking) return;

        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            sender: 'user',
            text: query,
            timestamp: timeNow
        };

        const updatedHistory = [...chatMessages, userMsg];
        setChatMessages(updatedHistory);
        setUserQuestion('');
        setIsAsking(true);

        if (geminiApiKey.trim()) {
            const historyPayload: ChatHistoryItem[] = updatedHistory
                .filter(m => m.id !== 'welcome')
                .map(m => ({ sender: m.sender, text: m.text }));
            const liveResponse = await fetchGeminiAIChatResponse(geminiApiKey.trim(), query, financialContext, historyPayload);
            if (liveResponse) {
                const aiMsg: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    sender: 'ai',
                    text: liveResponse,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                setChatMessages(prev => [...prev, aiMsg]);
                setIsAsking(false);
                return;
            }
        }

        setTimeout(() => {
            let answer = "";
            const lower = query.toLowerCase();
            const rand = Math.floor(Math.random() * 3);

            if (lower.includes("cut") || lower.includes("reduce") || lower.includes("15%")) {
                const targetReduction = Math.round(monthlyExpenses * 0.15);
                const variations = [
                    `To reduce monthly expenses by 15% (₹${targetReduction.toLocaleString()}/month):\n1. Focus on ${topCategories[0]?.name || 'Shopping'} - cap it at ₹${Math.round((topCategories[0]?.amount || 5000) * 0.8).toLocaleString()}.\n2. Audit monthly subscriptions in Dashboard.\n3. Shift ₹${Math.round(targetReduction * 0.5).toLocaleString()} directly into high-yield savings.`,
                    `15% Expense Cut Blueprint (Target: -₹${targetReduction.toLocaleString()}):\n• Instant Win: Lower discretionary spending on ${topCategories[0]?.name || 'Dining'}.\n• Action: Setup a strict spending ceiling per week (₹${Math.round((monthlyExpenses * 0.85) / 4).toLocaleString()}/week).\n• Automated Save: Auto-transfer ₹${targetReduction.toLocaleString()} to savings on pay day.`,
                    `Strategic 15% Reduction Plan:\n• Top leak detected: ${topCategories[0]?.name || 'Discretionary spend'} (₹${(topCategories[0]?.amount || 0).toLocaleString()}).\n• Micro-cuts: Reduce non-essential dining/shopping by 2 visits per week.\n• Total Projected Monthly Cash Recovered: ₹${targetReduction.toLocaleString()}.`
                ];
                answer = variations[rand];
            } else if (lower.includes("emergency") || lower.includes("fund")) {
                const target6Mo = monthlyExpenses * 6;
                const target3Mo = monthlyExpenses * 3;
                answer = `Emergency Reserve Status:\n• 3-Month Target: ₹${target3Mo.toLocaleString()}\n• 6-Month Target: ₹${target6Mo.toLocaleString()}\n• Liquid Cash Available: ₹${totalBalance.toLocaleString()} (${Math.min(100, Math.round((totalBalance / Math.max(1, target6Mo)) * 100))}% of 6-mo goal).\nRecommendation: Keep 3 months liquid in high-yield savings and invest the rest.`;
            } else if (lower.includes("credit") || lower.includes("card") || lower.includes("debt")) {
                if (totalCreditDue > 0) {
                    answer = `Credit Card Repayment Plan:\n• Current Statement Dues: ₹${totalCreditDue.toLocaleString()}\n• Immediate Recommendation: Pay 100% of dues before monthly billing date to prevent 3.5%/month finance charges.\n• Available Liquid Cash: ₹${totalBalance.toLocaleString()}`;
                } else {
                    answer = `Credit Utilization Health: PERFECT 🌟\n• Dues: ₹0\n• Strategy: Keep card spending under 30% of credit limit and pay off weekly to maximize credit score rewards.`;
                }
            } else {
                const netSavings = monthlyIncome - monthlyExpenses;
                answer = `Personalized Financial Analysis:\n• Monthly Income: ₹${monthlyIncome.toLocaleString()}\n• Monthly Expenses: ₹${monthlyExpenses.toLocaleString()}\n• Net Cashflow: ${netSavings >= 0 ? '+' : ''}₹${netSavings.toLocaleString()}\n• Top Recommendation: ${netSavings > 0 ? `Invest your ₹${netSavings.toLocaleString()} monthly surplus into diversified index funds & emergency buffer.` : 'Expenses exceed income! Review category limits immediately.'}`;
            }

            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: answer,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setChatMessages(prev => [...prev, aiMsg]);
            setIsAsking(false);
        }, 400);
    };

    const healthColor = aiPlan.healthScore >= 70 ? Colors.income : aiPlan.healthScore >= 50 ? '#F59E0B' : Colors.expense;

    return (
        <View style={[styles.container, { backgroundColor: Colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: Colors.surface, borderBottomColor: Colors.border, paddingTop: topHeaderPadding }]}>
                <View style={styles.headerInner}>
                    <View style={[styles.headerIconCircle, { backgroundColor: Colors.primary + '18' }]}>
                        <Sparkles color={Colors.primary} size={18} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.headerTitle, { color: Colors.text }]} numberOfLines={1}>
                            AI Financial Planner
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: Colors.textMuted }]}>
                            Smart Cashflow Optimization & Wealth Advisory
                        </Text>
                    </View>
                    <View style={[styles.engineStatusPill, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
                        <View style={[styles.statusDot, { backgroundColor: geminiApiKey ? Colors.income : Colors.primary }]} />
                        <Text style={[styles.statusPillText, { color: Colors.text }]}>
                            {geminiApiKey ? 'Gemini Live' : 'Smart AI'}
                        </Text>
                    </View>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomScrollPadding }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.mainWrapper}>
                    {/* Engine Settings Collapsible Drawer */}
                    <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border, marginBottom: 16 }]}>
                        <TouchableOpacity
                            style={styles.keyRow}
                            onPress={() => setShowKeyInput(!showKeyInput)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.keyLeft}>
                                <View style={[styles.engineIconBadge, { backgroundColor: (geminiApiKey ? Colors.income : Colors.primary) + '15' }]}>
                                    <Sparkles size={15} color={geminiApiKey ? Colors.income : Colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.keyLabel, { color: Colors.text }]} numberOfLines={1}>
                                        SpendZen AI Intelligence Core
                                    </Text>
                                    <Text style={[styles.keySubLabel, { color: Colors.textMuted }]} numberOfLines={1}>
                                        {geminiApiKey ? 'Connected to Google Gemini Live Model' : 'Running Offline Financial Engine (Unlimited & Free)'}
                                    </Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={[styles.engineTag, { backgroundColor: (geminiApiKey ? Colors.income : Colors.primary) + '18' }]}>
                                    <Text style={[styles.engineTagText, { color: geminiApiKey ? Colors.income : Colors.primary }]}>
                                        {geminiApiKey ? 'PRO KEY ACTIVE' : 'FREE INCLUDED'}
                                    </Text>
                                </View>
                                {showKeyInput ? <ChevronUp size={16} color={Colors.textMuted} /> : <ChevronDown size={16} color={Colors.textMuted} />}
                            </View>
                        </TouchableOpacity>

                        {showKeyInput && (
                            <View style={[styles.keyDrawerContent, { borderTopColor: Colors.border }]}>
                                <Text style={[styles.hint, { color: Colors.textMuted }]}>
                                    SpendZen performs all calculations locally. You can optionally link your personal <Text style={{ fontWeight: '700', color: Colors.text }}>Google AI Studio API key</Text> for multi-turn generative financial advice.
                                </Text>

                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border, color: Colors.text }]}
                                        placeholder="Paste Gemini Key (AIzaSy...)"
                                        placeholderTextColor={Colors.textMuted}
                                        value={tempKey}
                                        onChangeText={setTempKey}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    <TouchableOpacity
                                        style={[styles.eyeBtn, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}
                                        onPress={() => setShowPassword(!showPassword)}
                                        activeOpacity={0.7}
                                    >
                                        {showPassword ? <EyeOff size={16} color={Colors.textMuted} /> : <Eye size={16} color={Colors.textMuted} />}
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.keyActionsRow}>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
                                        onPress={handleSaveApiKey}
                                        activeOpacity={0.8}
                                    >
                                        <Check size={14} color="#fff" />
                                        <Text style={styles.actionBtnText}>Save Key</Text>
                                    </TouchableOpacity>

                                    {geminiApiKey ? (
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.expense + '40', borderWidth: 1 }]}
                                            onPress={handleClearApiKey}
                                            activeOpacity={0.8}
                                        >
                                            <Trash2 size={14} color={Colors.expense} />
                                            <Text style={{ color: Colors.expense, fontWeight: '700', fontSize: 13 }}>Disconnect</Text>
                                        </TouchableOpacity>
                                    ) : null}

                                    <TouchableOpacity
                                        style={styles.aiStudioLink}
                                        onPress={handleOpenAIStudio}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.aiStudioLinkText, { color: Colors.primary }]}>
                                            Get Free API Key
                                        </Text>
                                        <ExternalLink size={12} color={Colors.primary} />
                                    </TouchableOpacity>
                                </View>

                                {saveFeedback && (
                                    <View style={[styles.feedbackBanner, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.income }}>
                                            {saveFeedback}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Responsive Bento Grid Container */}
                    <View style={[styles.bentoGrid, isDesktop ? styles.bentoGridDesktop : styles.bentoGridMobile]}>

                        {/* ── LEFT COLUMN: Metrics, Allocations & Leak Detection ── */}
                        <View style={[styles.bentoCol, isDesktop ? { flex: 1.08 } : undefined]}>

                            {/* Health Score + 6-Mo Forecast Dual Row */}
                            <View style={[styles.scoreForecastRow, isTablet || isDesktop ? styles.scoreForecastRowWide : undefined]}>
                                {/* Health Score Card */}
                                <View style={[styles.card, styles.flex1, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                                    <View style={styles.cardHeaderFlex}>
                                        <Text style={[styles.metricCardLabel, { color: Colors.textMuted }]}>HEALTH SCORE</Text>
                                        <View style={[styles.metricIconWrap, { backgroundColor: healthColor + '18' }]}>
                                            <ShieldCheck size={18} color={healthColor} />
                                        </View>
                                    </View>

                                    <View style={styles.scoreNumberRow}>
                                        <Text style={[styles.bigMetricNumber, { color: healthColor }]}>
                                            {aiPlan.healthScore}
                                        </Text>
                                        <Text style={[styles.metricNumberMax, { color: Colors.textMuted }]}>/ 100</Text>
                                    </View>

                                    <View style={[styles.metricPill, { backgroundColor: healthColor + '15' }]}>
                                        <Text style={[styles.metricPillText, { color: healthColor }]}>
                                            {aiPlan.healthScore >= 70 ? 'Excellent Standing' : aiPlan.healthScore >= 50 ? 'Moderate Buffer' : 'Action Needed'}
                                        </Text>
                                    </View>

                                    <Text style={[styles.metricQuote, { color: Colors.textMuted }]} numberOfLines={2}>
                                        "{aiPlan.mindsetQuote}"
                                    </Text>
                                </View>

                                {/* 6-Month Forecast Card */}
                                <View style={[styles.card, styles.flex1, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                                    <View style={styles.cardHeaderFlex}>
                                        <Text style={[styles.metricCardLabel, { color: Colors.textMuted }]}>6-MO FORECAST</Text>
                                        <View style={[styles.metricIconWrap, { backgroundColor: Colors.income + '18' }]}>
                                            <TrendingUp size={18} color={Colors.income} />
                                        </View>
                                    </View>

                                    <View style={styles.scoreNumberRow}>
                                        <Text style={[styles.bigMetricNumber, { color: Colors.income }]} numberOfLines={1}>
                                            ₹{aiPlan.forecast6Mo.toLocaleString('en-IN')}
                                        </Text>
                                    </View>

                                    <View style={[styles.metricPill, { backgroundColor: Colors.income + '15' }]}>
                                        <Text style={[styles.metricPillText, { color: Colors.income }]}>
                                            +₹{Math.max(0, monthlyIncome - monthlyExpenses).toLocaleString('en-IN')}/mo Surplus
                                        </Text>
                                    </View>

                                    <Text style={[styles.metricQuote, { color: Colors.textMuted }]} numberOfLines={2}>
                                        Projected liquid cash balance based on current spending rate.
                                    </Text>
                                </View>
                            </View>

                            {/* 50/30/20 Budget Allocator */}
                            <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                                <View style={styles.cardTitleRow}>
                                    <View style={[styles.sectionIconBadge, { backgroundColor: Colors.primary + '18' }]}>
                                        <Target size={16} color={Colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.cardTitle, { color: Colors.text }]}>50/30/20 Budget Target</Text>
                                        <Text style={[styles.cardSubtitle, { color: Colors.textMuted }]}>
                                            Tailored targets on ₹{monthlyIncome.toLocaleString('en-IN')} monthly income
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.allocGrid}>
                                    {[
                                        { label: 'Needs (50%)', desc: 'Rent, groceries, utilities', value: aiPlan.needsTarget, fill: '50%', color: Colors.primary },
                                        { label: 'Wants (30%)', desc: 'Dining, shopping, leisure', value: aiPlan.wantsTarget, fill: '30%', color: '#F59E0B' },
                                        { label: 'Savings (20%)', desc: 'Emergency fund & investments', value: aiPlan.savingsTarget, fill: '20%', color: Colors.income },
                                    ].map(item => (
                                        <View key={item.label} style={[styles.allocCardItem, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
                                            <View style={styles.allocHeader}>
                                                <View>
                                                    <Text style={[styles.allocLabel, { color: Colors.text }]}>{item.label}</Text>
                                                    <Text style={[styles.allocDesc, { color: Colors.textMuted }]}>{item.desc}</Text>
                                                </View>
                                                <Text style={[styles.allocValue, { color: item.color }]}>
                                                    ₹{item.value.toLocaleString('en-IN')}
                                                </Text>
                                            </View>
                                            <View style={[styles.progressTrack, { backgroundColor: Colors.border }]}>
                                                <View style={[styles.progressFill, { width: item.fill as any, backgroundColor: item.color }]} />
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            {/* AI Risk & Spending Leak Detector */}
                            <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                                <View style={styles.cardTitleRow}>
                                    <View style={[styles.sectionIconBadge, { backgroundColor: '#F59E0B18' }]}>
                                        <AlertTriangle size={16} color="#F59E0B" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.cardTitle, { color: Colors.text }]}>Spending Leaks & Optimizations</Text>
                                        <Text style={[styles.cardSubtitle, { color: Colors.textMuted }]}>
                                            Automatic anomalies and recommended actions
                                        </Text>
                                    </View>
                                </View>

                                <View style={{ gap: 10 }}>
                                    {aiPlan.leaks.map((leak, idx) => (
                                        <View key={`leak-${idx}`} style={[styles.leakItemCard, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B30' }]}>
                                            <ShieldAlert size={16} color="#F59E0B" style={{ marginTop: 2 }} />
                                            <Text style={[styles.leakItemText, { color: Colors.text }]}>{leak}</Text>
                                        </View>
                                    ))}
                                    {aiPlan.recommendations.map((rec, idx) => (
                                        <View key={`rec-${idx}`} style={[styles.leakItemCard, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
                                            <Lightbulb size={16} color={Colors.primary} style={{ marginTop: 2 }} />
                                            <Text style={[styles.leakItemText, { color: Colors.text }]}>{rec}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                        </View>

                        {/* ── RIGHT COLUMN: Affordability Calculator & AI Chat Coach ── */}
                        <View style={[styles.bentoCol, isDesktop ? { flex: 0.95 } : undefined]}>

                            {/* Purchase Affordability Simulator */}
                            <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                                <View style={styles.cardTitleRow}>
                                    <View style={[styles.sectionIconBadge, { backgroundColor: Colors.primary + '18' }]}>
                                        <Calculator size={16} color={Colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.cardTitle, { color: Colors.text }]}>Purchase Affordability Check</Text>
                                        <Text style={[styles.cardSubtitle, { color: Colors.textMuted }]}>
                                            Evaluate if a gadget, travel, or major spend is safe
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.calcInputGroup}>
                                    <View style={[styles.calcInputWrapper, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
                                        <Text style={[styles.calcCurrencyPrefix, { color: Colors.textMuted }]}>₹</Text>
                                        <TextInput
                                            style={[styles.calcInput, { color: Colors.text }]}
                                            placeholder="Enter cost (e.g. 45000)"
                                            placeholderTextColor={Colors.textMuted}
                                            keyboardType="numeric"
                                            value={purchaseCost}
                                            onChangeText={setPurchaseCost}
                                            returnKeyType="done"
                                            onSubmitEditing={() => handleCalculateAffordability()}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.calcSubmitBtn, { backgroundColor: Colors.primary }]}
                                        onPress={() => handleCalculateAffordability()}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.calcSubmitBtnText}>Evaluate</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Quick Amount Chips */}
                                <View style={styles.quickAmountChipsRow}>
                                    {PRESET_AMOUNTS.map(amt => (
                                        <TouchableOpacity
                                            key={amt}
                                            style={[styles.quickAmountChip, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}
                                            onPress={() => handleCalculateAffordability(amt)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.quickAmountChipText, { color: Colors.text }]}>₹{amt >= 1000 ? `${amt / 1000}k` : amt}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {affordabilityResult && (
                                    <View style={[styles.verdictCard, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
                                        <View style={styles.verdictHeader}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <View style={[styles.verdictStatusDot, { backgroundColor: affordabilityResult.affordableNow ? Colors.income : '#F59E0B' }]} />
                                                <Text style={[styles.verdictStatusText, { color: affordabilityResult.affordableNow ? Colors.income : '#F59E0B' }]}>
                                                    {affordabilityResult.affordableNow ? 'Safe to Purchase Now' : `Target Date: ${affordabilityResult.targetDate}`}
                                                </Text>
                                            </View>
                                            <View style={[styles.safetyScorePill, { backgroundColor: (affordabilityResult.safetyScore >= 70 ? Colors.income : '#F59E0B') + '18' }]}>
                                                <Text style={[styles.safetyScoreText, { color: affordabilityResult.safetyScore >= 70 ? Colors.income : '#F59E0B' }]}>
                                                    Safety {affordabilityResult.safetyScore}/100
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.verdictAdviceText, { color: Colors.text }]}>
                                            {affordabilityResult.advice}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Interactive AI Chat Coach */}
                            <View style={[styles.card, styles.chatCardWrapper, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                                <View style={[styles.cardTitleRow, { marginBottom: 12 }]}>
                                    <View style={[styles.sectionIconBadge, { backgroundColor: Colors.primary + '18' }]}>
                                        <MessageSquare size={16} color={Colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.cardTitle, { color: Colors.text }]}>Ask SpendZen AI Coach</Text>
                                        <Text style={[styles.cardSubtitle, { color: Colors.textMuted }]}>
                                            Real-time personalized guidance & financial advice
                                        </Text>
                                    </View>
                                    {chatMessages.length > 1 && (
                                        <TouchableOpacity
                                            onPress={handleClearChat}
                                            style={[styles.clearChatBtn, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}
                                            activeOpacity={0.7}
                                        >
                                            <RotateCcw size={12} color={Colors.textMuted} />
                                            <Text style={[styles.clearChatText, { color: Colors.textMuted }]}>Reset</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Prompt Suggestion Chips */}
                                <View style={styles.promptChipsWrapper}>
                                    {PRESET_QUESTIONS.map(q => (
                                        <TouchableOpacity
                                            key={q}
                                            style={[styles.promptChip, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}
                                            onPress={() => handleAskQuestion(q)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.promptChipText, { color: Colors.primary }]} numberOfLines={1}>{q}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Conversation Scroll Thread */}
                                <View style={[styles.chatBoxContainer, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
                                    <ScrollView
                                        style={styles.chatScrollView}
                                        contentContainerStyle={styles.chatScrollContent}
                                        nestedScrollEnabled={true}
                                        showsVerticalScrollIndicator={true}
                                    >
                                        {chatMessages.map(msg => (
                                            <View
                                                key={msg.id}
                                                style={[
                                                    styles.chatBubbleRow,
                                                    msg.sender === 'user' ? styles.userBubbleRow : styles.aiBubbleRow
                                                ]}
                                            >
                                                {msg.sender === 'ai' && (
                                                    <View style={[styles.aiAvatarBadge, { backgroundColor: Colors.primary + '20' }]}>
                                                        <Sparkles size={13} color={Colors.primary} />
                                                    </View>
                                                )}
                                                <View
                                                    style={[
                                                        styles.chatBubble,
                                                        msg.sender === 'user'
                                                            ? [styles.userBubble, { backgroundColor: Colors.primary }]
                                                            : [styles.aiBubble, { backgroundColor: Colors.surface, borderColor: Colors.border }]
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.chatBubbleText,
                                                            { color: msg.sender === 'user' ? '#FFFFFF' : Colors.text }
                                                        ]}
                                                    >
                                                        {msg.text}
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            styles.chatTimestamp,
                                                            { color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : Colors.textMuted }
                                                        ]}
                                                    >
                                                        {msg.timestamp}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}

                                        {isAsking && (
                                            <View style={[styles.chatBubbleRow, styles.aiBubbleRow]}>
                                                <View style={[styles.aiAvatarBadge, { backgroundColor: Colors.primary + '20' }]}>
                                                    <Sparkles size={13} color={Colors.primary} />
                                                </View>
                                                <View style={[styles.chatBubble, styles.aiBubble, { backgroundColor: Colors.surface, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                                                    <ActivityIndicator size="small" color={Colors.primary} />
                                                    <Text style={{ fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' }}>
                                                        SpendZen AI is thinking...
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </ScrollView>
                                </View>

                                {/* Chat Input Bar */}
                                <View style={styles.chatInputBarRow}>
                                    <TextInput
                                        style={[styles.chatInputField, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border, color: Colors.text }]}
                                        placeholder="Ask any finance question..."
                                        placeholderTextColor={Colors.textMuted}
                                        value={userQuestion}
                                        onChangeText={setUserQuestion}
                                        returnKeyType="send"
                                        onSubmitEditing={() => handleAskQuestion()}
                                        multiline={false}
                                    />
                                    <TouchableOpacity
                                        style={[styles.chatSubmitBtn, { backgroundColor: Colors.primary, opacity: isAsking ? 0.6 : 1 }]}
                                        onPress={() => handleAskQuestion()}
                                        disabled={isAsking}
                                        activeOpacity={0.8}
                                    >
                                        {isAsking
                                            ? <ActivityIndicator color="#fff" size="small" />
                                            : <Send size={16} color="#fff" />
                                        }
                                    </TouchableOpacity>
                                </View>
                            </View>

                        </View>

                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        borderBottomWidth: 1,
        paddingBottom: 14,
        paddingHorizontal: 16,
    },
    headerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        maxWidth: 1280,
        marginHorizontal: 'auto',
        width: '100%',
    },
    headerIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 1,
    },
    engineStatusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: '700',
    },
    scrollContent: {
        paddingTop: 16,
        paddingHorizontal: 16,
    },
    mainWrapper: {
        maxWidth: 1280,
        marginHorizontal: 'auto',
        width: '100%',
    },
    card: {
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
    },
    flex1: {
        flex: 1,
        minWidth: 0,
    },
    keyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    keyLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    engineIconBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyLabel: {
        fontSize: 14,
        fontWeight: '700',
    },
    keySubLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 1,
    },
    engineTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    engineTagText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    keyDrawerContent: {
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        gap: 12,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    input: {
        flex: 1,
        height: 42,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        fontSize: 13,
    },
    eyeBtn: {
        width: 42,
        height: 42,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 38,
        paddingHorizontal: 16,
        borderRadius: 10,
        justifyContent: 'center',
    },
    actionBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
    aiStudioLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginLeft: 'auto',
        paddingVertical: 6,
    },
    aiStudioLinkText: {
        fontSize: 12,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    feedbackBanner: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    bentoGrid: {
        width: '100%',
    },
    bentoGridDesktop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 18,
    },
    bentoGridMobile: {
        flexDirection: 'column',
        gap: 16,
    },
    bentoCol: {
        width: '100%',
        gap: 16,
    },
    scoreForecastRow: {
        flexDirection: 'column',
        gap: 14,
    },
    scoreForecastRowWide: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    cardHeaderFlex: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    metricCardLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    metricIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scoreNumberRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
        marginVertical: 4,
    },
    bigMetricNumber: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    metricNumberMax: {
        fontSize: 15,
        fontWeight: '500',
    },
    metricPill: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginVertical: 6,
    },
    metricPillText: {
        fontSize: 11,
        fontWeight: '700',
    },
    metricQuote: {
        fontSize: 12,
        lineHeight: 16,
        marginTop: 4,
    },
    sectionIconBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    cardSubtitle: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 1,
    },
    allocGrid: {
        gap: 10,
    },
    allocCardItem: {
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    allocHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    allocLabel: {
        fontSize: 13,
        fontWeight: '700',
    },
    allocDesc: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 1,
    },
    allocValue: {
        fontSize: 14,
        fontWeight: '800',
    },
    progressTrack: {
        height: 7,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    leakItemCard: {
        flexDirection: 'row',
        gap: 10,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'flex-start',
    },
    leakItemText: {
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '500',
        flex: 1,
    },
    calcInputGroup: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
        marginBottom: 10,
    },
    calcInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
    },
    calcCurrencyPrefix: {
        fontSize: 16,
        fontWeight: '700',
        marginRight: 6,
    },
    calcInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        padding: 0,
        ...Platform.select({
            web: { outlineStyle: 'none' },
            default: {}
        })
    } as any,
    calcSubmitBtn: {
        height: 44,
        paddingHorizontal: 18,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    calcSubmitBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
    quickAmountChipsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    quickAmountChip: {
        flex: 1,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
    },
    quickAmountChipText: {
        fontSize: 11,
        fontWeight: '700',
    },
    verdictCard: {
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        marginTop: 4,
    },
    verdictHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    verdictStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    verdictStatusText: {
        fontSize: 13,
        fontWeight: '800',
    },
    safetyScorePill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    safetyScoreText: {
        fontSize: 11,
        fontWeight: '700',
    },
    verdictAdviceText: {
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '500',
    },
    chatCardWrapper: {
        minHeight: 460,
    },
    clearChatBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    clearChatText: {
        fontSize: 11,
        fontWeight: '600',
    },
    promptChipsWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
    },
    promptChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
    },
    promptChipText: {
        fontSize: 11,
        fontWeight: '600',
    },
    chatBoxContainer: {
        height: 290,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
        overflow: 'hidden',
    },
    chatScrollView: {
        flex: 1,
    },
    chatScrollContent: {
        padding: 12,
        gap: 10,
    },
    chatBubbleRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 6,
    },
    userBubbleRow: {
        justifyContent: 'flex-end',
    },
    aiBubbleRow: {
        justifyContent: 'flex-start',
    },
    aiAvatarBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    chatBubble: {
        maxWidth: '85%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
    },
    userBubble: {
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        borderBottomLeftRadius: 4,
        borderWidth: 1,
    },
    chatBubbleText: {
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '500',
    },
    chatTimestamp: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    chatInputBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    chatInputField: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 16,
        borderWidth: 1,
        fontSize: 14,
        fontWeight: '500',
        ...Platform.select({
            web: { outlineStyle: 'none' },
            default: {}
        })
    } as any,
    chatSubmitBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hint: {
        fontSize: 12,
        lineHeight: 18,
    },
});
