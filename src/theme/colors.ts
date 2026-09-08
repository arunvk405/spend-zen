import { useColorScheme } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const Palette = {
    // Light Defaults
    light: {
        background: '#f8fafc', // Slate 50
        surface: '#ffffff', // White
        surfaceElevated: '#f1f5f9', // Slate 100
        text: '#000000ff', // Slate 900
        textMuted: '#64748b', // Slate 500
        border: '#e2e8f0', // Slate 200
    },
    // Dark Defaults - Pure Neutral Monochrome (100% Zero Blue Tint)
    dark: {
        background: '#000000', // Pure Pitch Black Canvas
        surface: '#131313', // Neutral Dark Surface
        surfaceElevated: '#1a1a1a', // Neutral Elevated Sub-surface
        text: '#ffffff', // 100% Pure Crisp White
        textMuted: '#a3a3a3', // Neutral High-Legibility Gray
        border: '#242424', // Neutral Crisp Border
    }
};

const Shared = {
    primary: '#6366f1', // Indigo
    secondary: '#ec4899', // Pink
    income: '#22c55e', // Green 500
    expense: '#ef4444', // Red 500
    white: '#ffffff',
    black: '#000000',
    charts: {
        line: '#818cf8',
        bar: '#f472b6',
        pie: ['#fbbf24', '#34d399', '#60a5fa', '#f87171', '#a78bfa']
    }
};

export const useThemeColors = () => {
    // Check if ThemeContext is available
    let isDark = useColorScheme() === 'dark'; // Default fallback

    try {
        const context = useTheme();
        if (context) {
            isDark = context.isDark;
        }
    } catch (e) {
        // Fallback if used outside provider (rare but safe)
    }

    const mode = isDark ? Palette.dark : Palette.light;

    return {
        ...Shared,
        ...mode,
        isDark
    };
};

export const Typography = {
    h1: { fontSize: 32, fontWeight: 'bold' as const },
    h2: { fontSize: 24, fontWeight: 'bold' as const },
    h3: { fontSize: 20, fontWeight: '600' as const },
    body: { fontSize: 16, fontWeight: '400' as const },
    caption: { fontSize: 12, fontWeight: '400' as const },
};
