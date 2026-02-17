import { Tabs, useRouter } from 'expo-router';
import { useThemeColors } from '../../src/theme/colors';
import { Home, List, PieChart, Plus, Settings } from 'lucide-react-native';
import { View, TouchableOpacity, StyleSheet } from 'react-native';

export default function TabsLayout() {
    const Colors = useThemeColors();
    const router = useRouter();

    return (
        <Tabs
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: Colors.surface,
                    borderTopColor: Colors.border,
                    height: 64, // Slightly reduced for cleaner look
                    paddingTop: 8,
                    paddingBottom: 8, // Balanced padding
                    position: 'absolute', // Floating effect if desired, or standard
                    elevation: 0,
                    borderTopWidth: 1,
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textMuted,
                headerStyle: {
                    backgroundColor: Colors.background,
                    elevation: 0, // Android shadow removal
                    borderBottomWidth: 0, // iOS border removal
                },
                headerTitleStyle: {
                    fontWeight: 'bold',
                    fontSize: 20,
                },
                headerTintColor: Colors.text,
                headerShadowVisible: false,
                tabBarShowLabel: false, // Cleaner icon-only look (or minimalist text)
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => <Home color={color} size={24} strokeWidth={2.5} />,
                }}
            />

            <Tabs.Screen
                name="transactions"
                options={{
                    title: 'History',
                    tabBarIcon: ({ color, size }) => <List color={color} size={24} strokeWidth={2.5} />,
                }}
            />

            {/* Centered Add Button */}
            <Tabs.Screen
                name="add-stub"
                options={{
                    title: '',
                    tabBarButton: (props: any) => (
                        <TouchableOpacity
                            {...props}
                            activeOpacity={0.7}
                            style={[props.style, styles.centerButtonContainer]}
                        >
                            <View style={[styles.centerButton, { backgroundColor: Colors.primary, shadowColor: Colors.primary }]}>
                                <Plus color="#fff" size={32} strokeWidth={3} />
                            </View>
                        </TouchableOpacity>
                    ),
                }}
                listeners={{
                    tabPress: (e) => {
                        // Prevent default navigation to the stub tab
                        e.preventDefault();
                        router.push('/add');
                    },
                }}
            />

            <Tabs.Screen
                name="reports"
                options={{
                    title: 'Reports',
                    tabBarIcon: ({ color, size }) => <PieChart color={color} size={24} strokeWidth={2.5} />,
                }}
            />

            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size }) => <Settings color={color} size={24} strokeWidth={2.5} />,
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
