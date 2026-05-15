import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useThemeColors } from '../theme/colors';

interface LogoProps {
    size?: number;
    showText?: boolean;
    horizontal?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 40, showText = true, horizontal = true }) => {
    const Colors = useThemeColors();

    // Scale factor based on base size of 100
    const scale = size / 100;

    return (
        <View style={[
            styles.container,
            horizontal ? styles.row : styles.column,
            !showText && styles.center
        ]}>
            <View style={{ width: size, height: size }}>
                <Svg width={size} height={size} viewBox="0 0 100 100">
                    <Defs>
                        <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={Colors.primary} stopOpacity="1" />
                            <Stop offset="100%" stopColor={Colors.isDark ? "#818cf8" : "#4338ca"} stopOpacity="1" />
                        </LinearGradient>
                    </Defs>
                    {/* Enso Circle (Zen Circle) */}
                    <Path
                        d="M 50,15 C 30,15 15,30 15,50 C 15,70 30,85 50,85 C 65,85 78,75 83,62"
                        fill="none"
                        stroke="url(#grad)"
                        strokeWidth="8"
                        strokeLinecap="round"
                    />
                    {/* Coin / Mindfulness dot */}
                    <Circle cx="50" cy="50" r="15" fill="url(#grad)" />
                    <Path
                        d="M 45,50 L 55,50 M 50,45 L 50,55"
                        stroke="#fff"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                </Svg>
            </View>

            {showText && (
                <View style={horizontal ? styles.textMarginLeft : styles.textMarginTop}>
                    <Text style={[
                        styles.logoText,
                        { color: Colors.text, fontSize: size * 0.6 }
                    ]}>
                        Spend<Text style={{ color: Colors.primary }}>Zen</Text>
                    </Text>
                    <Text style={[
                        styles.tagline,
                        { color: Colors.textMuted, fontSize: size * 0.22 }
                    ]}>
                        FINANCIAL MINDFULNESS
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
    },
    column: {
        flexDirection: 'column',
    },
    center: {
        justifyContent: 'center',
    },
    textMarginLeft: {
        marginLeft: 12,
    },
    textMarginTop: {
        marginTop: 8,
    },
    logoText: {
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    tagline: {
        fontWeight: '600',
        letterSpacing: 2,
        marginTop: -4,
    }
});
