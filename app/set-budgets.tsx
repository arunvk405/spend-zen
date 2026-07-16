import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFinance } from '../src/context/FinanceContext';
import { useThemeColors } from '../src/theme/colors';
import { EXPENSE_CATEGORIES } from '../src/models';
import { 
    Briefcase, PiggyBank, Gift, TrendingUp, Laptop, Package,
    Utensils, Activity, Home, Car, User, PawPrint, FileText, Film, CreditCard, Wallet, Landmark,
    ArrowLeft, Save
} from 'lucide-react-native';

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

export default function SetBudgetsScreen() {
    const Colors = useThemeColors();
    const router = useRouter();
    const { categoryBudgets, updateCategoryBudgets, customCategories } = useFinance();
    const [focusedInput, setFocusedInput] = useState<string | null>(null);
    const expenseCategories = useMemo(() => {
        const customExpense = customCategories.filter(c => c.type === 'EXPENSE');
        return [...EXPENSE_CATEGORIES, ...customExpense];
    }, [customCategories]);

    // Initialize local budgets state with string representations of existing budgets
    const [budgets, setBudgets] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        expenseCategories.forEach(cat => {
            if (categoryBudgets && categoryBudgets[cat.name] !== undefined) {
                initial[cat.name] = categoryBudgets[cat.name].toString();
            } else {
                initial[cat.name] = '';
            }
        });
        return initial;
    });

    const handleInputChange = (categoryName: string, text: string) => {
        // Filter out non-numeric characters except decimals
        const cleaned = text.replace(/[^0-9.]/g, '');
        setBudgets(prev => ({
            ...prev,
            [categoryName]: cleaned
        }));
    };

    const handleSave = async () => {
        try {
            const finalBudgets: Record<string, number> = {};
            
            Object.entries(budgets).forEach(([name, val]) => {
                const num = parseFloat(val);
                if (!isNaN(num) && num > 0) {
                    finalBudgets[name] = num;
                }
                // If it is 0 or empty, we exclude it (removes budget)
            });

            await updateCategoryBudgets(finalBudgets);
            
            if (Platform.OS === 'web') {
                window.alert('Budgets saved successfully!');
            } else {
                Alert.alert('Success', 'Budgets saved successfully!');
            }
            router.back();
        } catch (error) {
            console.error('Failed to save budgets:', error);
            if (Platform.OS === 'web') {
                window.alert('Failed to save budgets');
            } else {
                Alert.alert('Error', 'Failed to save budgets');
            }
        }
    };

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: Colors.background }]} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: Colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft color={Colors.text} size={22} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: Colors.text }]}>Category Budgets</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
            >
                <Text style={[styles.helperText, { color: Colors.textMuted }]}>
                    Set a monthly spending limit for each expense category. Leave blank or enter 0 to disable budgeting for a category.
                </Text>

                <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    {expenseCategories.map((cat, idx) => {
                        const isLast = idx === expenseCategories.length - 1;
                        return (
                            <View 
                                key={cat.name} 
                                style={[
                                    styles.categoryRow, 
                                    { borderBottomColor: Colors.border + '30' },
                                    !isLast && { borderBottomWidth: 1 }
                                ]}
                            >
                                <View style={styles.categoryInfo}>
                                    <View style={[styles.iconWrapper, { backgroundColor: cat.color + '15' }]}>
                                        <IconRenderer name={cat.icon} color={cat.color} size={20} />
                                    </View>
                                    <Text style={[styles.categoryName, { color: Colors.text }]}>{cat.name}</Text>
                                </View>
                                
                                <View style={[
                                    styles.inputWrapper, 
                                    { borderColor: Colors.border, backgroundColor: Colors.background },
                                    focusedInput === cat.name && { borderColor: Colors.primary, borderWidth: 1.5 }
                                ]}>
                                    <Text style={[styles.currencyPrefix, { color: Colors.textMuted }]}>₹</Text>
                                    <TextInput
                                        style={[styles.input, { color: Colors.text }]}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor={Colors.textMuted}
                                        value={budgets[cat.name] || ''}
                                        onChangeText={(text) => handleInputChange(cat.name, text)}
                                        onFocus={() => setFocusedInput(cat.name)}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Footer buttons */}
            <View style={[styles.footer, { borderTopColor: Colors.border, backgroundColor: Colors.surface }]}>
                <TouchableOpacity 
                    style={[styles.cancelButton, { borderColor: Colors.border }]} 
                    onPress={() => router.back()}
                >
                    <Text style={[styles.cancelButtonText, { color: Colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.saveButton, { backgroundColor: Colors.primary }]} 
                    onPress={handleSave}
                >
                    <Save color="#fff" size={18} style={{ marginRight: 6 }} />
                    <Text style={styles.saveButtonText}>Save Budgets</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 50 : 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    helperText: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 20,
    },
    card: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    categoryInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 16,
    },
    iconWrapper: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    categoryName: {
        fontSize: 15,
        fontWeight: '600',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 10,
        width: 110,
        height: 40,
        paddingHorizontal: 10,
    },
    currencyPrefix: {
        fontSize: 15,
        fontWeight: '600',
        marginRight: 4,
    },
    input: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        padding: 0, // Reset default padding
        ...Platform.select({
            web: {
                outlineStyle: 'none',
            },
            default: {}
        })
    } as any,
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        borderTopWidth: 1,
        gap: 12,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    cancelButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    saveButton: {
        flex: 2,
        height: 48,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
