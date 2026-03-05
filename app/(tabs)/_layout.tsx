import { Tabs, useRouter, Redirect } from 'expo-router';
import { useThemeColors } from '../../src/theme/colors';
import { Home, PieChart, Landmark, Settings, Plus } from 'lucide-react-native';
import { TouchableOpacity, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';

export default function TabLayout() {
    const Colors = useThemeColors();
    const router = useRouter();
    const { user, loading } = useAuth();

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
                    height: 65,
                    paddingBottom: 10,
                    paddingTop: 0,
                    position: 'absolute',
                    borderTopWidth: 1,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                headerStyle: {
                    backgroundColor: Colors.background,
                },
                headerTintColor: Colors.text,
                headerShadowVisible: false,
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
                            <View style={[styles.centerButton, { backgroundColor: Colors.primary, shadowColor: Colors.primary }]}>
                                <Plus color="#fff" size={32} strokeWidth={3} />
                            </View>
                        </TouchableOpacity>
                    ),
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: 'Reports',
                    tabBarIcon: ({ color }) => <PieChart color={color} size={24} />,
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
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
});
