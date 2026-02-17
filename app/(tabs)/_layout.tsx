import { Tabs } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { Home, List, PieChart, Plus } from 'lucide-react-native';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function TabsLayout() {
    const router = useRouter();

    return (
        <Tabs
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: Colors.surface,
                    borderTopColor: Colors.border,
                    height: 70,
                    paddingBottom: 10,
                    paddingTop: 10,
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textMuted,
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
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="transactions"
                options={{
                    title: 'History',
                    tabBarIcon: ({ color, size }) => <List color={color} size={size} />,
                }}
            />

            {/* Ghost tab for the center button */}
            <Tabs.Screen
                name="add-stub"
                options={{
                    title: 'Add',
                    tabBarButton: (props) => (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => router.push('/add')}
                            style={styles.addButtonContainer}
                        >
                            <View style={styles.addButton}>
                                <Plus color={Colors.white} size={30} />
                            </View>
                        </TouchableOpacity>
                    ),
                }}
            />

            <Tabs.Screen
                name="reports"
                options={{
                    title: 'Reports',
                    tabBarIcon: ({ color, size }) => <PieChart color={color} size={size} />,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    addButtonContainer: {
        top: -20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButton: {
        backgroundColor: Colors.primary,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
});
