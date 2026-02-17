import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeType = 'light' | 'dark';

interface ThemeContextType {
    theme: ThemeType;
    setTheme: (theme: ThemeType) => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'dark',
    setTheme: () => { },
    isDark: true,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<ThemeType>('dark');
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        // Load saved theme preference
        AsyncStorage.getItem('user_theme').then((savedTheme) => {
            if (savedTheme === 'light' || savedTheme === 'dark') {
                setThemeState(savedTheme as ThemeType);
            }
        });
    }, []);

    useEffect(() => {
        // Update isDark based on theme preference
        setIsDark(theme === 'dark');
    }, [theme]);

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
