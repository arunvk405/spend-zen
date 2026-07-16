import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { FinanceProvider } from '../src/context/FinanceContext';
import { StatusBar } from 'expo-status-bar';
import { useThemeColors } from '../src/theme/colors';
import { ThemeProvider } from '../src/context/ThemeContext';
import { AuthProvider } from '../src/context/AuthContext';
import { Platform } from 'react-native';

function RootLayoutNav() {
    const Colors = useThemeColors();

    return (
        <AuthProvider>
            <FinanceProvider>
                {Platform.OS === 'web' && (
                    <Head>
                        <title>Spend Zen</title>
                        <meta name="description" content="Financial mindfulness at your fingertips" />
                        <meta name="apple-mobile-web-app-capable" content="yes" />
                        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
                        <meta name="theme-color" content={Colors.background} />
                        <meta name="mobile-web-app-capable" content="yes" />
                        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
                    </Head>
                )}
                <StatusBar style={Colors.isDark ? "light" : "dark"} backgroundColor={Colors.background} translucent={true} />
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
                    <Stack.Screen name="login" options={{ headerShown: false }} />
                    <Stack.Screen name="signup" options={{ headerShown: false }} />
                    <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
                    <Stack.Screen name="set-budgets" options={{ headerShown: false, presentation: 'modal' }} />
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
        </AuthProvider>
    );
}

export default function RootLayout() {
    return (
        <ThemeProvider>
            <RootLayoutNav />
        </ThemeProvider>
    );
}
