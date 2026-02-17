import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeType = 'system' | 'light' | 'dark';

interface ThemeContextType {
    theme: ThemeType;
    setTheme: (theme: ThemeType) => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'system',
    setTheme: () => { },
    isDark: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme = useColorScheme();
    const [theme, setThemeState] = useState<ThemeType>('system');
    const [isDark, setIsDark] = useState(systemScheme === 'dark');

    useEffect(() => {
        // Load saved theme preference
        AsyncStorage.getItem('user_theme').then((savedTheme) => {
            if (savedTheme) {
                setThemeState(savedTheme as ThemeType);
            }
        });
    }, []);

    useEffect(() => {
        // Update isDark based on theme preference
        if (theme === 'system') {
            setIsDark(systemScheme === 'dark');
        } else {
            setIsDark(theme === 'dark');
        }
    }, [theme, systemScheme]);

    const setTheme = async (newTheme: ThemeType) => {
        setThemeState(newTheme);
        await AsyncStorage.setItem('user_theme', newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
