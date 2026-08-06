// AI Financial Planner Service for SpendZen
import { format, addMonths } from 'date-fns';

export interface FinancialContext {
    monthlyIncome: number;
    monthlyExpenses: number;
    totalBalance: number;
    bankBalance: number;
    cashBalance: number;
    creditCardDue: number;
    topExpenseCategories: { name: string; amount: number }[];
    actualNeedsSpent?: number;
    actualWantsSpent?: number;
}

export interface AIPlanResult {
    needsTarget: number;
    wantsTarget: number;
    savingsTarget: number;
    actualNeeds: number;
    actualWants: number;
    actualSavings: number;
    healthScore: number;
    forecast6Mo: number;
    leaks: string[];
    recommendations: string[];
    mindsetQuote: string;
}

export interface AffordabilityResult {
    affordableNow: boolean;
    monthsToSave: number;
    dailySavingsNeeded: number;
    targetDate: string;
    safetyScore: number; // 0-100
    advice: string;
}

// Data-Driven Realistic AI Engine (analyzes real user context)
export function generateLocalAIPlan(context: FinancialContext): AIPlanResult {
    const income = context.monthlyIncome || 0;
    const expenses = context.monthlyExpenses || 0;
    const netSavings = income - expenses;
    const savingsRate = income > 0 ? Math.min(100, Math.max(0, Math.round((netSavings / income) * 100))) : 0;

    // 50/30/20 Rule targets
    const needsTarget = Math.round(income * 0.50);
    const wantsTarget = Math.round(income * 0.30);
    const savingsTarget = Math.round(income * 0.20);

    const actualNeeds = context.actualNeedsSpent || Math.round(expenses * 0.6);
    const actualWants = context.actualWantsSpent || Math.round(expenses * 0.4);
    const actualSavings = Math.max(0, netSavings);

    const leaks: string[] = [];

    // Real Category Over-spending Analysis
    if (context.topExpenseCategories.length > 0) {
        const topCat = context.topExpenseCategories[0];
        const pctOfExpenses = expenses > 0 ? Math.round((topCat.amount / expenses) * 100) : 0;
        if (pctOfExpenses >= 30) {
            leaks.push(`Major outflow on "${topCat.name}": ₹${topCat.amount.toLocaleString()} (${pctOfExpenses}% of all monthly expenses).`);
        }
    }

    if (income > 0 && actualWants > wantsTarget && wantsTarget > 0) {
        const overWants = actualWants - wantsTarget;
        leaks.push(`Wants Budget Exceeded: You spent ₹${actualWants.toLocaleString()} on non-essentials (₹${overWants.toLocaleString()} over 30% limit).`);
    }

    if (context.creditCardDue > context.totalBalance * 0.3 && context.creditCardDue > 0) {
        leaks.push(`High Credit Dues Alert: ₹${context.creditCardDue.toLocaleString()} due represents ${Math.round((context.creditCardDue / (context.totalBalance || 1)) * 100)}% of your available cash.`);
    }

    const recommendations: string[] = [];

    if (income > 0) {
        if (savingsRate < 20) {
            const gap = savingsTarget - actualSavings;
            recommendations.push(`Current savings rate is ${savingsRate}%. Increase monthly savings by ₹${Math.max(0, gap).toLocaleString()} to hit your 20% target (₹${savingsTarget.toLocaleString()}).`);
        } else {
            recommendations.push(`Excellent Savings Rate! You are saving ${savingsRate}% (₹${actualSavings.toLocaleString()}/mo). Consider investing excess in liquid emergency funds.`);
        }
    }

    if (context.topExpenseCategories.length > 0) {
        const topCat = context.topExpenseCategories[0];
        const saveTarget15 = Math.round(topCat.amount * 0.15);
        recommendations.push(`Actionable Target: Trim spending on "${topCat.name}" by 15% to free up ₹${saveTarget15.toLocaleString()} cash every month.`);
    }

    // 6-Month Forecast projection based on real net savings rate
    const forecast6Mo = (context.totalBalance || 0) + (netSavings * 6);

    let healthScore = 50;
    if (income > 0) {
        healthScore = Math.min(100, Math.max(10, Math.round(savingsRate * 1.4 + (netSavings > 0 ? 30 : 0) + (context.creditCardDue === 0 ? 20 : 0))));
    } else if (context.totalBalance > 0) {
        healthScore = 65;
    }

    return {
        needsTarget,
        wantsTarget,
        savingsTarget,
        actualNeeds,
        actualWants,
        actualSavings,
        healthScore,
        forecast6Mo,
        leaks: leaks.length > 0 ? leaks : ['No major spending leaks detected based on current data!'],
        recommendations,
        mindsetQuote: savingsRate >= 20 ? "Wealth is not about having a lot of money; it's about having a lot of options." : "Do not save what is left after spending, but spend what is left after saving."
    };
}

export function evaluateLocalAffordability(itemCost: number, context: FinancialContext): AffordabilityResult {
    const netMonthlySavings = Math.max(0, context.monthlyIncome - context.monthlyExpenses);
    const availableCash = context.totalBalance - context.creditCardDue;

    if (itemCost <= 0) {
        return {
            affordableNow: true,
            monthsToSave: 0,
            dailySavingsNeeded: 0,
            targetDate: format(new Date(), 'MMMM yyyy'),
            safetyScore: 100,
            advice: "Please enter a valid purchase cost."
        };
    }

    const affordableNow = availableCash >= itemCost * 1.4; // Safe buffer
    const monthsToSave = netMonthlySavings > 0 ? Math.ceil(itemCost / netMonthlySavings) : 99;
    const dailySavingsNeeded = Math.round(itemCost / 30);
    const targetDateObj = addMonths(new Date(), monthsToSave < 99 ? monthsToSave : 12);
    const targetDate = format(targetDateObj, 'MMMM yyyy');

    let safetyScore = 50;
    if (affordableNow) safetyScore = 95;
    else if (monthsToSave <= 2) safetyScore = 80;
    else if (monthsToSave <= 5) safetyScore = 60;
    else safetyScore = 30;

    let advice = "";
    if (affordableNow) {
        advice = `✅ You can safely buy this item today! After this purchase of ₹${itemCost.toLocaleString()}, you will still hold a healthy balance of ₹${(availableCash - itemCost).toLocaleString()}.`;
    } else if (netMonthlySavings > 0) {
        advice = `⏳ Goal Forecast: At your actual net savings rate of ₹${netMonthlySavings.toLocaleString()}/month, you will naturally reach this goal by ${targetDate} (${monthsToSave} ${monthsToSave === 1 ? 'month' : 'months'}). Save ₹${dailySavingsNeeded}/day to achieve it cleanly.`;
    } else {
        advice = `🚨 Danger Alert: Your current monthly expenses equal or exceed your income. Buying this item now will deplete cash or increase debt.`;
    }

    return {
        affordableNow,
        monthsToSave,
        dailySavingsNeeded,
        targetDate,
        safetyScore,
        advice
    };
}

// Live Gemini API Integration (if API key is supplied)
export async function fetchGeminiAIPlan(apiKey: string, context: FinancialContext): Promise<AIPlanResult | null> {
    try {
        const prompt = `You are SpendZen AI, an expert personal finance planner. Analyze this REAL user context:
Income: ₹${context.monthlyIncome}
Expenses: ₹${context.monthlyExpenses}
Total Balance: ₹${context.totalBalance}
Credit Card Due: ₹${context.creditCardDue}
Top Categories: ${JSON.stringify(context.topExpenseCategories)}

Respond with strictly valid JSON only in this exact schema:
{
  "needsTarget": number,
  "wantsTarget": number,
  "savingsTarget": number,
  "actualNeeds": number,
  "actualWants": number,
  "actualSavings": number,
  "healthScore": number,
  "forecast6Mo": number,
  "leaks": [string],
  "recommendations": [string],
  "mindsetQuote": string
}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) return null;
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanJson = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanJson) as AIPlanResult;
    } catch (e) {
        console.error("Gemini API Error:", e);
        return null;
    }
}

export async function fetchGeminiAIChatResponse(apiKey: string, question: string, context: FinancialContext): Promise<string | null> {
    try {
        const prompt = `You are SpendZen AI, an expert personal financial advisor. The user has asked: "${question}".
        
Real context of the user's financial state:
- Monthly Income: ₹${context.monthlyIncome}
- Monthly Expenses: ₹${context.monthlyExpenses}
- Total Liquid Cash & Bank Balance: ₹${context.totalBalance}
- Bank Balance: ₹${context.bankBalance}
- Cash Balance: ₹${context.cashBalance}
- Credit Card Dues: ₹${context.creditCardDue}
- Top Expense Categories: ${JSON.stringify(context.topExpenseCategories)}

Give a direct, concise, dynamic, and action-oriented financial response tailored to their exact numbers. Provide fresh, unique insights every time. Keep it under 3-4 short bullet points or concise paragraphs.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) return null;
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (e) {
        console.error("Gemini Chat API Error:", e);
        return null;
    }
}
