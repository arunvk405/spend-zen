import React from 'react';
import { Tabs, useRouter, Redirect } from 'expo-router';
import { useThemeColors } from '../../src/theme/colors';
import { Home, PieChart, Landmark, Settings, Plus, Sparkles } from 'lucide-react-native';
import { TouchableOpacity, View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
    const Colors = useThemeColors();
    const router = useRouter();
    const { user, loading } = useAuth();
    const insets = useSafeAreaInsets();

    // iPhone 15 home indicator = 34px safe area inset.
    // Tab icons sit in the top 56px; below that is the home indicator zone filled with the same background.
    const tabBarIconsHeight = 56;
    const tabHeight = tabBarIconsHeight + (insets.bottom > 0 ? insets.bottom : 10);
    const tabPaddingBottom = insets.bottom > 0 ? insets.bottom : 10;

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!user) {
        return <Redirect href="/login" />;
    }

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textMuted,
                tabBarStyle: {
                    backgroundColor: Colors.surface,
                    borderTopColor: Colors.border,
                    borderTopWidth: 1,
                    height: tabHeight,
                    paddingBottom: tabPaddingBottom,
                    paddingTop: 6,
                    // Stretch the bar all the way to the physical bottom edge
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    elevation: 0,
                    ...Platform.select({
                        ios: {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -2 },
                            shadowOpacity: 0.06,
                            shadowRadius: 8,
                        },
                        default: {}
                    }),
                },
                headerStyle: {
                    backgroundColor: Colors.background,
                },
                headerTintColor: Colors.text,
                headerShadowVisible: false,
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color }) => <Home color={color} size={24} />,
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="transactions"
                options={{
                    title: 'History',
                    tabBarIcon: ({ color }) => <Landmark color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="add-stub"
                options={{
                    title: '',
                    tabBarButton: (props: any) => (
                        <TouchableOpacity
                            activeOpacity={0.7}
                            style={[props.style, styles.centerButtonContainer]}
                            onPress={() => router.push('/add')}
                        >
                            <View style={[styles.centerButton, { backgroundColor: Colors.primary }, Platform.OS === 'ios' && { shadowColor: Colors.primary }]}>
                                <Plus color="#fff" size={32} strokeWidth={3} />
                            </View>
                        </TouchableOpacity>
                    ),
                }}
            />
            <Tabs.Screen
                name="ai-planner"
                options={{
                    title: 'AI Planner',
                    tabBarIcon: ({ color }) => <Sparkles color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color }) => <Settings color={color} size={24} />,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    centerButtonContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        top: -18,
    },
    centerButton: {
        width: 58,
        height: 58,
        borderRadius: 29,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            web: {
                boxShadow: '0px 4px 8px rgba(16, 185, 129, 0.3)',
            },
            default: {},
        }),
    },
});
