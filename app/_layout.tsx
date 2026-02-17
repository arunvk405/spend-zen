import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { FinanceProvider } from '../src/context/FinanceContext';
import { StatusBar } from 'expo-status-bar';
import { useThemeColors } from '../src/theme/colors';
import { ThemeProvider } from '../src/context/ThemeContext';
import { Platform } from 'react-native';

function RootLayoutNav() {
    const Colors = useThemeColors();

    return (
        <FinanceProvider>
            {Platform.OS === 'web' && (
                <Head>
                    <title>Spend Zen</title>
                    <meta name="description" content="Financial mindfulness at your fingertips" />
                    <meta name="apple-mobile-web-app-capable" content="yes" />
                    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
                    <meta name="theme-color" content={Colors.background} />
                </Head>
            )}
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
