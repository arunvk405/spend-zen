import { useColorScheme } from 'react-native';

const Palette = {
    // Light Defaults
    light: {
        background: '#f8fafc', // Slate 50
        surface: '#ffffff', // White
        text: '#0f172a', // Slate 900
        textMuted: '#64748b', // Slate 500
        border: '#e2e8f0', // Slate 200
    },
    // Dark Defaults
    dark: {
        background: '#0f172a', // Slate 900
        surface: '#1e293b', // Slate 800
        text: '#f8fafc', // Slate 50
        textMuted: '#94a3b8', // Slate 400
        border: '#334155', // Slate 700
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
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
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
