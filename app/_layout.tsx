import { Stack } from 'expo-router';
import { FinanceProvider } from '../src/context/FinanceContext';
import { StatusBar } from 'expo-status-bar';
import { useThemeColors } from '../src/theme/colors';
import { ThemeProvider } from '../src/context/ThemeContext';

function RootLayoutNav() {
    const Colors = useThemeColors();

    return (
        <FinanceProvider>
            <StatusBar style={Colors.isDark ? "light" : "dark"} />
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

export default function RootLayout() {
    return (
        <ThemeProvider>
            <RootLayoutNav />
        </ThemeProvider>
    );
}
