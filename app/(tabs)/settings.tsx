import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Share, Switch } from 'react-native';
import { useThemeColors, Typography } from '../../src/theme/colors';
import { Trash2, Share2, Shield, Info, ChevronRight, Moon, Sun } from 'lucide-react-native';
import { useFinance } from '../../src/context/FinanceContext';

const SettingsItem = ({ icon: Icon, label, onPress, color, value = undefined, toggle = false }: any) => {
    const Colors = useThemeColors();
    return (
        <TouchableOpacity
            style={[styles.item, { borderBottomColor: Colors.border }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.itemLeft}>
                <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                    <Icon size={20} color={color} />
                </View>
                <Text style={[styles.itemLabel, { color: Colors.text }]}>{label}</Text>
            </View>
            {toggle ? (
                <Switch
                    value={value}
                    onValueChange={onPress}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    thumbColor={Colors.white}
                />
            ) : (
                <ChevronRight size={20} color={Colors.textMuted} />
            )}
        </TouchableOpacity>
    );
};

export default function Settings() {
    const Colors = useThemeColors();
    const { clearData } = useFinance();

    const handleShare = async () => {
        const message = `👋 Hey! Check out Spend Zen, a clean and simple expense tracker I'm using.

🚀 **How to Install (It's Free!):**

📱 **iOS (iPhone):**
1. Open this link in Safari.
2. Tap the 'Share' button (square with arrow).
3. Scroll down and tap 'Add to Home Screen'.

🤖 **Android:**
1. Open this link in Chrome.
2. Tap the three dots menu (⋮).
3. Tap 'Install App' or 'Add to Home Screen'.

🔗 Link: https://spend-zen.netlify.app`;

        try {
            await Share.share({
                message: message,
                url: 'https://spend-zen.netlify.app',
                title: 'Join me on Spend Zen!'
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleClearData = (range: 'all' | 'month' | 'year') => {
        const rangeText = range === 'all' ? 'ALL your' : `this ${range}'s`;

        Alert.alert(
            "⚠️ Irreversible Action",
            `Are you sure you want to delete ${rangeText} data? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete Forever",
                    style: "destructive",
                    onPress: async () => {
                        await clearData(range);
                        Alert.alert("Success", "Data has been successfully cleared.");
                    }
                }
            ]
        );
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: Colors.background }]} contentContainerStyle={{ paddingBottom: 100 }}>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>General</Text>
                <View style={[styles.card, { backgroundColor: Colors.surface }]}>
                    <SettingsItem
                        icon={Share2}
                        label="Share App"
                        color={Colors.primary}
                        onPress={handleShare}
                    />
                    {/* Placeholder for future specific theme toggle if not system-based */}
                    <SettingsItem
                        icon={Colors.isDark ? Moon : Sun}
                        label={`Theme: ${Colors.isDark ? 'Dark' : 'Light'}`}
                        color="#fbbf24" // Amber
                        onPress={() => Alert.alert("System Theme", "Spend Zen automatically follows your device's theme settings.")}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>Data Management</Text>
                <View style={[styles.card, { backgroundColor: Colors.surface }]}>
                    <SettingsItem
                        icon={Trash2}
                        label="Clear This Month"
                        color={Colors.expense}
                        onPress={() => handleClearData('month')}
                    />
                    <SettingsItem
                        icon={Trash2}
                        label="Clear This Year"
                        color={Colors.expense}
                        onPress={() => handleClearData('year')}
                    />
                    <SettingsItem
                        icon={Shield}
                        label="Clear All Data"
                        color={Colors.expense}
                        onPress={() => handleClearData('all')}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>About</Text>
                <View style={[styles.card, { backgroundColor: Colors.surface }]}>
                    <SettingsItem
                        icon={Info}
                        label="Version 1.0.0 (Spend Zen)"
                        color={Colors.textMuted}
                        onPress={() => { }}
                    />
                </View>
            </View>

            <View style={{ alignItems: 'center', marginTop: 20 }}>
                <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Made with ❤️ by Arun</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        ...Typography.caption,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
        marginLeft: 4,
        fontWeight: '600',
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
});
