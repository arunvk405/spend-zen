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
    Calculator, MessageSquare, Send, Key, ChevronDown, TrendingUp,
    Check, Trash2, Eye, EyeOff, ExternalLink, RotateCcw, IndianRupee
} from 'lucide-react-native';
import {
    generateLocalAIPlan, evaluateLocalAffordability, fetchGeminiAIPlan, fetchGeminiAIChatResponse,
    FinancialContext, AIPlanResult, AffordabilityResult, ChatHistoryItem
} from '../../src/services/aiService';

export interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: string;
}

export default function AIPlannerScreen() {
    const Colors = useThemeColors();
    const { width: windowWidth } = useWindowDimensions();
    const isTablet = windowWidth >= 768;
    const insets = useSafeAreaInsets();
    const topHeaderPadding = Math.max(insets.top + 8, Platform.OS === 'ios' ? 56 : 14);
    const bottomScrollPadding = Math.max(insets.bottom + 85, 105);

    const {
        monthlyIncome, monthlyExpenses, totalBalance, totalBankBalance,
        cashBalance, totalCreditDue, transactions
    } = useFinance();

    // Gemini API Key State (Supports standard AIzaSy and new Google Auth Keys starting with AQ.)
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
        setSaveFeedback(trimmed ? '✅ Gemini Auth Key Saved & Active!' : 'Key Removed');
        setTimeout(() => setSaveFeedback(null), 3000);
    };

    const handleClearApiKey = () => {
        setTempKey('');
        setGeminiApiKey('');
        if (Platform.OS === 'web') {
            localStorage.removeItem('spendzen_gemini_api_key');
        }
        setSaveFeedback('⚪ Key Removed. Reverted to Offline AI.');
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
            text: "Hello! 👋 I'm your SpendZen AI Financial Advisor. Ask me anything about your budget, savings targets, credit card dues, or spending habits!",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);

    const handleCalculateAffordability = () => {
        const cost = parseFloat(purchaseCost);
        if (isNaN(cost) || cost <= 0) return;
        const result = evaluateLocalAffordability(cost, financialContext);
        setAffordabilityResult(result);
    };

    const handleClearChat = () => {
        setChatMessages([
            {
                id: 'welcome-' + Date.now(),
                sender: 'ai',
                text: "Chat history cleared! 👋 How else can I assist with your financial goals today?",
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
                answer = `Emergency Reserve Status:\n• 3-Month Target: ₹${target3Mo.toLocaleString()}\n• 6-Month Target: ₹${target6Mo.toLocaleString()}\n• Liquid Cash Available: ₹${totalBalance.toLocaleString()} (${Math.min(100, Math.round((totalBalance / target6Mo) * 100))}% of 6-mo goal).\nRecommendation: Keep 3 months liquid in high-yield savings and invest the rest.`;
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

    const healthColor = aiPlan.healthScore >= 70 ? Colors.income : Colors.primary;

    return (
        <View style={[styles.container, { backgroundColor: Colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: Colors.surface, borderBottomColor: Colors.border, paddingTop: topHeaderPadding }]}>
                <View style={styles.headerInner}>
                    <Sparkles color={Colors.primary} size={20} />
                    <Text style={[styles.headerTitle, { color: Colors.text }]} numberOfLines={1}>
                        SpendZen AI Financial Planner
                    </Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomScrollPadding }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Centered content wrapper for web */}
                <View style={styles.contentWrapper}>

                    {/* SpendZen AI Engine & Optional Key Banner */}
                    <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                        <TouchableOpacity
                            style={styles.keyRow}
                            onPress={() => setShowKeyInput(!showKeyInput)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.keyLeft}>
                                <Sparkles size={15} color={Colors.primary} />
                                <Text style={[styles.keyLabel, { color: Colors.text }]} numberOfLines={1}>
                                    SpendZen AI Engine {geminiApiKey ? '🟢 Gemini Live Active' : '🟢 Built-In Smart AI Active'}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ backgroundColor: Colors.income + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.income }}>
                                        {geminiApiKey ? 'CUSTOM KEY' : 'FREE BUILT-IN'}
                                    </Text>
                                </View>
                                <ChevronDown size={16} color={Colors.textMuted} />
                            </View>
                        </TouchableOpacity>

                        {showKeyInput && (
                            <View style={{ marginTop: 12, gap: 10 }}>
                                <Text style={[styles.hint, { color: Colors.textMuted }]}>
                                    ✨ <Text style={{ fontWeight: '700', color: Colors.text }}>SpendZen Smart AI Engine</Text> is active out-of-the-box with free, unlimited financial calculations!
                                    {"\n"}Optional: Connect a personal Google AI Studio API key (starts with <Text style={{ fontWeight: '700' }}>AIzaSy...</Text>) to use external Gemini REST models.
                                </Text>

                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.text }]}
                                        placeholder="Paste Gemini API Key (AIzaSy...)"
                                        placeholderTextColor={Colors.textMuted}
                                        value={tempKey}
                                        onChangeText={setTempKey}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    <TouchableOpacity
                                        style={[styles.sendBtn, { backgroundColor: Colors.background, borderColor: Colors.border, borderWidth: 1 }]}
                                        onPress={() => setShowPassword(!showPassword)}
                                        activeOpacity={0.7}
                                    >
                                        {showPassword ? <EyeOff size={16} color={Colors.textMuted} /> : <Eye size={16} color={Colors.textMuted} />}
                                    </TouchableOpacity>
                                </View>

                                {/* Action Buttons: Save Key, Clear Key & Get Key Link */}
                                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: Colors.primary, flexDirection: 'row', gap: 6 }]}
                                        onPress={handleSaveApiKey}
                                        activeOpacity={0.8}
                                    >
                                        <Check size={14} color="#fff" />
                                        <Text style={styles.actionBtnText}>Save Key</Text>
                                    </TouchableOpacity>

                                    {geminiApiKey ? (
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1, flexDirection: 'row', gap: 6 }]}
                                            onPress={handleClearApiKey}
                                            activeOpacity={0.8}
                                        >
                                            <Trash2 size={14} color="#EF4444" />
                                            <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 13 }}>Remove Key</Text>
                                        </TouchableOpacity>
                                    ) : null}

                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', paddingVertical: 6 }}
                                        onPress={handleOpenAIStudio}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={{ fontSize: 11, color: Colors.primary, fontWeight: '600', textDecorationLine: 'underline' }}>
                                            Get Free Key (Google AI Studio)
                                        </Text>
                                        <ExternalLink size={12} color={Colors.primary} />
                                    </TouchableOpacity>
                                </View>

                                {saveFeedback && (
                                    <View style={{ backgroundColor: saveFeedback.includes('Active') ? Colors.income + '18' : Colors.border + '40', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 2 }}>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: saveFeedback.includes('Active') ? Colors.income : Colors.textMuted }}>
                                            {saveFeedback}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Health Score + Forecast — side-by-side on tablet */}
                    <View style={[styles.row2Col, isTablet ? styles.row2ColTablet : undefined]}>

                        {/* AI Financial Health Score */}
                        <View style={[styles.card, styles.flexCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                            <Text style={[styles.sectionLabel, { color: Colors.textMuted }]}>AI Financial Health Score</Text>
                            <View style={styles.scoreRow}>
                                <Text style={[styles.scoreValue, { color: healthColor }]}>
                                    {aiPlan.healthScore}
                                    <Text style={[styles.scoreMax, { color: Colors.textMuted }]}> / 100</Text>
                                </Text>
                                <View style={[styles.scoreIcon, { backgroundColor: healthColor + '18' }]}>
                                    <ShieldCheck size={26} color={healthColor} />
                                </View>
                            </View>
                            <Text style={[styles.hint, { color: Colors.textMuted, fontStyle: 'italic', marginTop: 8 }]}>
                                "{aiPlan.mindsetQuote}"
                            </Text>
                        </View>

                        {/* 6-Month Forecast */}
                        <View style={[styles.card, styles.flexCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                            <View style={styles.cardTitleRow}>
                                <TrendingUp size={17} color={Colors.income} />
                                <Text style={[styles.cardTitle, { color: Colors.text }]}>6-Month Cash Flow Forecast</Text>
                            </View>
                            <Text style={[styles.hint, { color: Colors.textMuted, marginBottom: 10 }]}>
                                Based on net surplus +₹{Math.max(0, monthlyIncome - monthlyExpenses).toLocaleString()}/mo:
                            </Text>
                            <View style={[styles.forecastBox, { backgroundColor: Colors.income + '12', borderColor: Colors.income + '30' }]}>
                                <Text style={[styles.hint, { color: Colors.textMuted }]}>Forecasted Liquid Balance</Text>
                                <Text style={[styles.forecastValue, { color: Colors.income }]}>
                                    ₹{aiPlan.forecast6Mo.toLocaleString()}
                                </Text>
                            </View>
                        </View>

                    </View>

                    {/* 50/30/20 Budget Allocator */}
                    <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                        <View style={styles.cardTitleRow}>
                            <Target size={17} color={Colors.primary} />
                            <Text style={[styles.cardTitle, { color: Colors.text }]}>50/30/20 AI Budget Recommendation</Text>
                        </View>
                        <Text style={[styles.hint, { color: Colors.textMuted, marginBottom: 14 }]}>
                            Tailored targets based on your ₹{monthlyIncome.toLocaleString()} monthly income:
                        </Text>

                        <View style={[styles.allocGrid, isTablet ? styles.allocGridTablet : undefined]}>
                            {[
                                { label: 'Needs (50%)', value: aiPlan.needsTarget, fill: '50%', color: Colors.primary },
                                { label: 'Wants (30%)', value: aiPlan.wantsTarget, fill: '30%', color: '#F59E0B' },
                                { label: 'Savings & Invest (20%)', value: aiPlan.savingsTarget, fill: '20%', color: Colors.income },
                            ].map(item => (
                                <View key={item.label} style={isTablet ? styles.allocItemTablet : styles.allocItem}>
                                    <View style={styles.allocRow}>
                                        <Text style={[styles.allocLabel, { color: Colors.text }]}>{item.label}</Text>
                                        <Text style={[styles.allocValue, { color: item.color }]}>₹{item.value.toLocaleString()}</Text>
                                    </View>
                                    <View style={[styles.progressTrack, { backgroundColor: Colors.border + '40' }]}>
                                        <View style={[styles.progressFill, { width: item.fill as any, backgroundColor: item.color }]} />
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Spending Leaks & AI Recommendations */}
                    <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                        <View style={styles.cardTitleRow}>
                            <AlertTriangle size={17} color="#F59E0B" />
                            <Text style={[styles.cardTitle, { color: Colors.text }]}>AI Risk & Spending Leak Detector</Text>
                        </View>
                        <View style={{ gap: 10, marginTop: 4 }}>
                            {aiPlan.leaks.map((leak, idx) => (
                                <View key={`leak-${idx}`} style={[styles.infoBox, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B30' }]}>
                                    <Text style={[styles.infoText, { color: Colors.text }]}>• {leak}</Text>
                                </View>
                            ))}
                            {aiPlan.recommendations.map((rec, idx) => (
                                <View key={`rec-${idx}`} style={[styles.infoBox, { backgroundColor: Colors.primary + '10', borderColor: Colors.primary + '30' }]}>
                                    <Text style={[styles.infoText, { color: Colors.text }]}>💡 {rec}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Purchase Affordability Calculator */}
                    <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                        <View style={styles.cardTitleRow}>
                            <Calculator size={17} color={Colors.primary} />
                            <Text style={[styles.cardTitle, { color: Colors.text }]}>Can I Afford This Purchase?</Text>
                        </View>
                        <Text style={[styles.hint, { color: Colors.textMuted, marginBottom: 12 }]}>
                            Enter the cost of a phone, gadget, or trip to evaluate affordability safety:
                        </Text>

                        <View style={styles.inputRow}>
                            <TextInput
                                style={[styles.input, { backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.text }]}
                                placeholder="Enter amount (e.g. 45000)"
                                placeholderTextColor={Colors.textMuted}
                                keyboardType="numeric"
                                value={purchaseCost}
                                onChangeText={setPurchaseCost}
                                returnKeyType="done"
                                onSubmitEditing={handleCalculateAffordability}
                            />
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
                                onPress={handleCalculateAffordability}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.actionBtnText}>Calculate</Text>
                            </TouchableOpacity>
                        </View>

                        {affordabilityResult && (
                            <View style={[styles.resultCard, { backgroundColor: Colors.background, borderColor: Colors.border }]}>
                                <View style={styles.resultHeader}>
                                    <Text style={[styles.resultStatus, { color: affordabilityResult.affordableNow ? Colors.income : '#F59E0B', flex: 1 }]}>
                                        {affordabilityResult.affordableNow ? '✅ Safe to Purchase Now' : `⏳ Target: ${affordabilityResult.targetDate}`}
                                    </Text>
                                    <Text style={[styles.hint, { color: Colors.textMuted }]}>
                                        Score: {affordabilityResult.safetyScore}/100
                                    </Text>
                                </View>
                                <Text style={[styles.infoText, { color: Colors.text }]}>
                                    {affordabilityResult.advice}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Interactive AI Chat Coach */}
                    <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                        <View style={[styles.cardTitleRow, { justifyContent: 'space-between' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <MessageSquare size={17} color={Colors.primary} />
                                <Text style={[styles.cardTitle, { color: Colors.text }]}>Ask SpendZen AI Coach</Text>
                                <View style={{ backgroundColor: Colors.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.primary }}>
                                        {chatMessages.length} msgs
                                    </Text>
                                </View>
                            </View>
                            {chatMessages.length > 1 && (
                                <TouchableOpacity
                                    onPress={handleClearChat}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}
                                    activeOpacity={0.7}
                                >
                                    <RotateCcw size={13} color={Colors.textMuted} />
                                    <Text style={{ fontSize: 11, color: Colors.textMuted, fontWeight: '600' }}>Clear</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Preset chips */}
                        <View style={styles.chipsRow}>
                            {[
                                "How to cut expenses by 15%?",
                                "What is my emergency fund target?",
                                "Evaluate my credit card debt"
                            ].map(q => (
                                <TouchableOpacity
                                    key={q}
                                    style={[styles.chip, { backgroundColor: Colors.background, borderColor: Colors.border }]}
                                    onPress={() => handleAskQuestion(q)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.chipText, { color: Colors.primary }]} numberOfLines={1}>{q}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Real Interactive Chat History Thread */}
                        <View style={[styles.chatContainer, { backgroundColor: Colors.background, borderColor: Colors.border }]}>
                            <ScrollView
                                style={styles.chatScroll}
                                contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 10, gap: 10 }}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={true}
                            >
                                {chatMessages.map(msg => (
                                    <View
                                        key={msg.id}
                                        style={[
                                            styles.messageWrapper,
                                            msg.sender === 'user' ? styles.userMessageWrapper : styles.aiMessageWrapper
                                        ]}
                                    >
                                        {msg.sender === 'ai' && (
                                            <View style={[styles.avatarBadge, { backgroundColor: Colors.primary + '20' }]}>
                                                <Sparkles size={12} color={Colors.primary} />
                                            </View>
                                        )}
                                        <View
                                            style={[
                                                styles.messageBubble,
                                                msg.sender === 'user'
                                                    ? [styles.userBubble, { backgroundColor: Colors.primary }]
                                                    : [styles.aiBubble, { backgroundColor: Colors.surface, borderColor: Colors.border }]
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.messageText,
                                                    { color: msg.sender === 'user' ? '#FFFFFF' : Colors.text }
                                                ]}
                                            >
                                                {msg.text}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.messageTime,
                                                    { color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : Colors.textMuted }
                                                ]}
                                            >
                                                {msg.timestamp}
                                            </Text>
                                        </View>
                                    </View>
                                ))}

                                {isAsking && (
                                    <View style={[styles.messageWrapper, styles.aiMessageWrapper]}>
                                        <View style={[styles.avatarBadge, { backgroundColor: Colors.primary + '20' }]}>
                                            <Sparkles size={12} color={Colors.primary} />
                                        </View>
                                        <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: Colors.surface, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                                            <ActivityIndicator size="small" color={Colors.primary} />
                                            <Text style={{ fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' }}>
                                                SpendZen AI is thinking...
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </ScrollView>
                        </View>

                        {/* Sticky Input Bar */}
                        <View style={styles.chatInputRow}>
                            <TextInput
                                style={[styles.chatInput, { backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.text, fontSize: 16 }]}
                                placeholder="Ask any financial planning question..."
                                placeholderTextColor={Colors.textMuted}
                                value={userQuestion}
                                onChangeText={setUserQuestion}
                                returnKeyType="send"
                                onSubmitEditing={() => handleAskQuestion()}
                                multiline={false}
                            />
                            <TouchableOpacity
                                style={[styles.chatSendBtn, { backgroundColor: Colors.primary, opacity: isAsking ? 0.6 : 1 }]}
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
        paddingTop: Platform.OS === 'ios' ? 44 : 14,
        paddingBottom: 14,
        paddingHorizontal: 16,
    },
    headerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '100%',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    contentWrapper: {
        width: '100%',
        padding: 16,
        gap: 16,
    },
    card: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
    },
    flexCard: {
        flex: 1,
        minWidth: 0,
    },
    // Two-column row for tablet
    row2Col: {
        flexDirection: 'column',
        gap: 16,
    },
    row2ColTablet: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
        flexWrap: 'wrap',
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        flex: 1,
        flexWrap: 'wrap',
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    scoreValue: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    scoreMax: {
        fontSize: 16,
        fontWeight: '400',
    },
    scoreIcon: {
        padding: 10,
        borderRadius: 14,
    },
    forecastBox: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    forecastValue: {
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 2,
    },
    // Budget alloc grid: 1-col mobile, 3-col tablet
    allocGrid: {
        gap: 14,
    },
    allocGridTablet: {
        flexDirection: 'row',
        gap: 16,
    },
    allocItem: {
        width: '100%',
    },
    allocItemTablet: {
        flex: 1,
        minWidth: 0,
    },
    allocRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    allocLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    allocValue: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    progressTrack: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    infoBox: {
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    infoText: {
        fontSize: 12,
        lineHeight: 19,
    },
    // Input row: input + button side-by-side, wraps on very small screens
    inputRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 4,
        alignItems: 'center',
    },
    input: {
        flex: 1,
        minWidth: 0,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        fontSize: 13,
    },
    actionBtn: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultCard: {
        marginTop: 10,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
        flexWrap: 'wrap',
        gap: 4,
    },
    resultStatus: {
        fontSize: 12,
        fontWeight: '700',
    },
    // Preset chips: wraps gracefully on narrow screens
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 12,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 11,
        fontWeight: '600',
        lineHeight: 15,
    },
    hint: {
        fontSize: 11,
        lineHeight: 16,
    },
    keyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    keyLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    keyLabel: {
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
    },
    chatContainer: {
        height: 280,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 12,
        overflow: 'hidden',
    },
    chatInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    chatInput: {
        flex: 1,
        height: 46,
        borderRadius: 23,
        paddingHorizontal: 16,
        borderWidth: 1,
        fontSize: 16,
    },
    chatSendBtn: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatScroll: {
        flex: 1,
    },
    messageWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 6,
        marginVertical: 2,
    },
    userMessageWrapper: {
        justifyContent: 'flex-end',
    },
    aiMessageWrapper: {
        justifyContent: 'flex-start',
    },
    avatarBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    messageBubble: {
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        maxWidth: '85%',
    },
    userBubble: {
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        borderBottomLeftRadius: 4,
        borderWidth: 1,
    },
    messageText: {
        fontSize: 13,
        lineHeight: 19,
    },
    messageTime: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
});
