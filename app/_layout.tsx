import { Stack } from 'expo-router';
import { FinanceProvider } from '../src/context/FinanceContext';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../src/theme/colors';

export default function RootLayout() {
    return (
        <FinanceProvider>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerStyle: {
                        backgroundColor: Colors.background,
                    },
                    headerTintColor: Colors.text,
                    headerShadowVisible: false,
                    contentStyle: {
                        backgroundColor: Colors.background,
                    },
                }}
            >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                    name="add"
                    options={{
                        presentation: 'modal',
                        title: 'Add Transaction',
                        headerShown: false,
                    }}
                />
            </Stack>
        </FinanceProvider>
    );
}
