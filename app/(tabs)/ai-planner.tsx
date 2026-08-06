import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Pressable, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFinance } from '../../src/context/FinanceContext';
import { useThemeColors } from '../../src/theme/colors';
import {
    Sparkles, Target, AlertTriangle, ShieldCheck,
    Calculator, MessageSquare, Send, Key, ChevronDown, TrendingUp
} from 'lucide-react-native';
import {
    generateLocalAIPlan, evaluateLocalAffordability, fetchGeminiAIPlan, fetchGeminiAIChatResponse,
    FinancialContext, AIPlanResult, AffordabilityResult
} from '../../src/services/aiService';

export default function AIPlannerScreen() {
    const Colors = useThemeColors();
    const router = useRouter();
    const {
        monthlyIncome, monthlyExpenses, totalBalance, totalBankBalance,
        cashBalance, totalCreditDue, transactions
    } = useFinance();

    // Gemini API Key State
    const [geminiApiKey, setGeminiApiKey] = useState(() => {
        if (Platform.OS === 'web') {
            return localStorage.getItem('spendzen_gemini_api_key') || '';
        }
        return '';
    });
    const [showKeyInput, setShowKeyInput] = useState(false);

    const handleSaveApiKey = (key: string) => {
        setGeminiApiKey(key);
        if (Platform.OS === 'web') {
            localStorage.setItem('spendzen_gemini_api_key', key.trim());
        }
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

    // AI Plan State (Reactively computed whenever financial context updates)
    const aiPlan = useMemo<AIPlanResult>(() => {
        return generateLocalAIPlan(financialContext);
    }, [financialContext]);

    // Affordability Calculator State
    const [purchaseCost, setPurchaseCost] = useState('');
    const [affordabilityResult, setAffordabilityResult] = useState<AffordabilityResult | null>(null);

    // AI Chat Prompt Assistant State
    const [userQuestion, setUserQuestion] = useState('');
    const [chatAnswer, setChatAnswer] = useState<string | null>(null);
    const [isAsking, setIsAsking] = useState(false);

    const handleCalculateAffordability = () => {
        const cost = parseFloat(purchaseCost);
        if (isNaN(cost) || cost <= 0) return;
        const result = evaluateLocalAffordability(cost, financialContext);
        setAffordabilityResult(result);
    };

    const handleAskQuestion = async (promptText?: string) => {
        const query = promptText || userQuestion;
        if (!query.trim()) return;

        setIsAsking(true);
        setChatAnswer(null);

        // If Gemini API Key is present, call Gemini API Live for 100% dynamic AI response
        if (geminiApiKey.trim()) {
            const liveResponse = await fetchGeminiAIChatResponse(geminiApiKey.trim(), query, financialContext);
            if (liveResponse) {
                setChatAnswer(liveResponse);
                setIsAsking(false);
                if (!promptText) setUserQuestion('');
                return;
            }
        }

        // Dynamic smart response engine with random variations
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

            setChatAnswer(answer);
            setIsAsking(false);
            if (!promptText) setUserQuestion('');
        }, 400);
    };

    return (
        <View style={[styles.container, { backgroundColor: Colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: Colors.surface, borderBottomColor: Colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Sparkles color={Colors.primary} size={22} />
                    <Text style={[styles.headerTitle, { color: Colors.text }]}>SpendZen AI Financial Planner</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Google Gemini Live API Key Banner */}
                <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <TouchableOpacity
                        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                        onPress={() => setShowKeyInput(!showKeyInput)}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Key size={16} color={Colors.primary} />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.text }}>
                                Google Gemini Live AI Mode {geminiApiKey ? '🟢 Active' : '⚪ (Click to Connect Key)'}
                            </Text>
                        </View>
                        <ChevronDown size={16} color={Colors.textMuted} />
                    </TouchableOpacity>

                    {showKeyInput && (
                        <View style={{ marginTop: 12 }}>
                            <Text style={{ fontSize: 11, color: Colors.textMuted, marginBottom: 8 }}>
                                Paste your free Google Gemini API key from AI Studio to unlock live, 100% dynamic conversational AI responses:
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TextInput
                                    style={[styles.costInput, { flex: 1, backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.text }]}
                                    placeholder="Paste Gemini API Key (AIzaSy...)"
                                    placeholderTextColor={Colors.textMuted}
                                    value={geminiApiKey}
                                    onChangeText={handleSaveApiKey}
                                    secureTextEntry
                                />
                            </View>
                        </View>
                    )}
                </View>

                {/* AI Financial Health Score Card */}
                <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <View>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                AI Financial Health Score
                            </Text>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: aiPlan.healthScore >= 70 ? Colors.income : Colors.primary, marginTop: 2 }}>
                                {aiPlan.healthScore} / 100
                            </Text>
                        </View>
                        <View style={{ backgroundColor: (aiPlan.healthScore >= 70 ? Colors.income : Colors.primary) + '15', padding: 10, borderRadius: 14 }}>
                            <ShieldCheck size={28} color={aiPlan.healthScore >= 70 ? Colors.income : Colors.primary} />
                        </View>
                    </View>
                    <Text style={{ fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', lineHeight: 18 }}>
                        "{aiPlan.mindsetQuote}"
                    </Text>
                </View>

                {/* 🔮 6-Month Predictive Net Worth & Cash Flow Forecast */}
                <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <View style={styles.cardTitleRow}>
                        <TrendingUp size={18} color={Colors.income} />
                        <Text style={[styles.cardTitle, { color: Colors.text }]}>6-Month Predictive Cash Flow Forecast</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: Colors.textMuted, marginBottom: 8 }}>
                        Projected liquid balance based on your actual net monthly surplus (+₹{Math.max(0, monthlyIncome - monthlyExpenses).toLocaleString()}/mo):
                    </Text>
                    <View style={{ backgroundColor: Colors.income + '12', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.income + '30' }}>
                        <Text style={{ fontSize: 11, color: Colors.textMuted }}>Forecasted Liquid Balance (6 Months)</Text>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: Colors.income, marginTop: 2 }}>
                            ₹{aiPlan.forecast6Mo.toLocaleString()}
                        </Text>
                    </View>
                </View>

                {/* 50/30/20 Budget Target Allocator */}
                <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <View style={styles.cardTitleRow}>
                        <Target size={18} color={Colors.primary} />
                        <Text style={[styles.cardTitle, { color: Colors.text }]}>50/30/20 AI Budget Recommendation</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: Colors.textMuted, marginBottom: 14 }}>
                        Tailored targets based on your ₹{monthlyIncome.toLocaleString()} monthly income:
                    </Text>

                    <View style={{ gap: 12 }}>
                        <View>
                            <View style={styles.allocRow}>
                                <Text style={[styles.allocLabel, { color: Colors.text }]}>Needs (50% Target)</Text>
                                <Text style={[styles.allocValue, { color: Colors.text }]}>₹{aiPlan.needsTarget.toLocaleString()}</Text>
                            </View>
                            <View style={[styles.progressTrack, { backgroundColor: Colors.border + '40' }]}>
                                <View style={[styles.progressFill, { width: '50%', backgroundColor: Colors.primary }]} />
                            </View>
                        </View>

                        <View>
                            <View style={styles.allocRow}>
                                <Text style={[styles.allocLabel, { color: Colors.text }]}>Wants (30% Target)</Text>
                                <Text style={[styles.allocValue, { color: Colors.text }]}>₹{aiPlan.wantsTarget.toLocaleString()}</Text>
                            </View>
                            <View style={[styles.progressTrack, { backgroundColor: Colors.border + '40' }]}>
                                <View style={[styles.progressFill, { width: '30%', backgroundColor: '#F59E0B' }]} />
                            </View>
                        </View>

                        <View>
                            <View style={styles.allocRow}>
                                <Text style={[styles.allocLabel, { color: Colors.text }]}>Savings & Investment (20% Target)</Text>
                                <Text style={[styles.allocValue, { color: Colors.income }]}>₹{aiPlan.savingsTarget.toLocaleString()}</Text>
                            </View>
                            <View style={[styles.progressTrack, { backgroundColor: Colors.border + '40' }]}>
                                <View style={[styles.progressFill, { width: '20%', backgroundColor: Colors.income }]} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Spending Leaks & AI Recommendations */}
                <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <View style={styles.cardTitleRow}>
                        <AlertTriangle size={18} color="#F59E0B" />
                        <Text style={[styles.cardTitle, { color: Colors.text }]}>AI Risk & Spending Leak Detector</Text>
                    </View>

                    <View style={{ gap: 10, marginTop: 4 }}>
                        {aiPlan.leaks.map((leak, idx) => (
                            <View key={`leak-${idx}`} style={[styles.infoBox, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B30' }]}>
                                <Text style={{ fontSize: 12, color: Colors.text, lineHeight: 18 }}>• {leak}</Text>
                            </View>
                        ))}

                        {aiPlan.recommendations.map((rec, idx) => (
                            <View key={`rec-${idx}`} style={[styles.infoBox, { backgroundColor: Colors.primary + '10', borderColor: Colors.primary + '30' }]}>
                                <Text style={{ fontSize: 12, color: Colors.text, lineHeight: 18 }}>💡 {rec}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Purchase Affordability Calculator */}
                <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <View style={styles.cardTitleRow}>
                        <Calculator size={18} color={Colors.primary} />
                        <Text style={[styles.cardTitle, { color: Colors.text }]}>Can I Afford This Purchase?</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: Colors.textMuted, marginBottom: 12 }}>
                        Enter the cost of a phone, gadget, or trip to evaluate affordability safety:
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                        <TextInput
                            style={[styles.costInput, { backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.text }]}
                            placeholder="Enter amount (e.g. 45000)"
                            placeholderTextColor={Colors.textMuted}
                            keyboardType="numeric"
                            value={purchaseCost}
                            onChangeText={setPurchaseCost}
                        />
                        <TouchableOpacity
                            style={[styles.calcBtn, { backgroundColor: Colors.primary }]}
                            onPress={handleCalculateAffordability}
                        >
                            <Text style={styles.calcBtnText}>Calculate</Text>
                        </TouchableOpacity>
                    </View>

                    {affordabilityResult && (
                        <View style={[styles.resultCard, { backgroundColor: Colors.background, borderColor: Colors.border }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: affordabilityResult.affordableNow ? Colors.income : '#F59E0B' }}>
                                    {affordabilityResult.affordableNow ? '✅ Safe to Purchase Now' : `⏳ Target Milestone Date: ${affordabilityResult.targetDate}`}
                                </Text>
                                <Text style={{ fontSize: 11, fontWeight: 'bold', color: Colors.textMuted }}>
                                    Safety Score: {affordabilityResult.safetyScore}/100
                                </Text>
                            </View>
                            <Text style={{ fontSize: 12, color: Colors.text, lineHeight: 18 }}>
                                {affordabilityResult.advice}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Interactive AI Chat Coach */}
                <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <View style={styles.cardTitleRow}>
                        <MessageSquare size={18} color={Colors.primary} />
                        <Text style={[styles.cardTitle, { color: Colors.text }]}>Ask SpendZen AI Coach</Text>
                    </View>

                    {/* Preset Question Chips */}
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                        {[
                            "How to cut expenses by 15%?",
                            "What is my emergency fund target?",
                            "Evaluate my credit card debt"
                        ].map((q) => (
                            <TouchableOpacity
                                key={q}
                                style={[styles.presetChip, { backgroundColor: Colors.background, borderColor: Colors.border }]}
                                onPress={() => handleAskQuestion(q)}
                            >
                                <Text style={{ fontSize: 11, color: Colors.primary, fontWeight: '600' }}>{q}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput
                            style={[styles.costInput, { flex: 1, backgroundColor: Colors.background, borderColor: Colors.border, color: Colors.text }]}
                            placeholder="Ask any financial planning question..."
                            placeholderTextColor={Colors.textMuted}
                            value={userQuestion}
                            onChangeText={setUserQuestion}
                        />
                        <TouchableOpacity
                            style={[styles.calcBtn, { backgroundColor: Colors.primary, width: 44, paddingHorizontal: 0 }]}
                            onPress={() => handleAskQuestion()}
                            disabled={isAsking}
                        >
                            {isAsking ? <ActivityIndicator color="#fff" size="small" /> : <Send size={16} color="#fff" />}
                        </TouchableOpacity>
                    </View>

                    {chatAnswer && (
                        <View style={[styles.resultCard, { backgroundColor: Colors.primary + '10', borderColor: Colors.primary + '30', marginTop: 12 }]}>
                            <Text style={{ fontSize: 12, color: Colors.text, lineHeight: 19 }}>
                                {chatAnswer}
                            </Text>
                        </View>
                    )}
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 44 : 14,
        paddingBottom: 14,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 16,
        gap: 16,
        paddingBottom: 90,
    },
    card: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
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
    costInput: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 13,
    },
    calcBtn: {
        borderRadius: 12,
        paddingHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    calcBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
    resultCard: {
        marginTop: 10,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    presetChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
    }
});
