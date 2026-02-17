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
                        <LinearGradient id="zenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={Colors.primary} />
                            <Stop offset="100%" stopColor={Colors.secondary || Colors.primary} />
                        </LinearGradient>
                    </Defs>

                    {/* Circle Background */}
                    <Circle cx="50" cy="50" r="48" fill={Colors.primary + '15'} />

                    <G transform={`scale(${scale * 0.8}) translate(${12.5 / scale}, ${12.5 / scale})`}>
                        {/* Zen Stone Stack (Cairn) - Stylized */}
                        <Path
                            d="M30 85 Q50 90 70 85 Q75 75 50 70 Q25 75 30 85 Z"
                            fill={Colors.textMuted}
                            opacity="0.6"
                        />
                        <Path
                            d="M35 65 Q50 70 65 65 Q70 55 50 52 Q30 55 35 65 Z"
                            fill={Colors.textMuted}
                            opacity="0.8"
                        />
                        <Path
                            d="M42 45 Q50 48 58 45 Q62 38 50 36 Q38 38 42 45 Z"
                            fill={Colors.primary}
                        />

                        {/* Dollar / Coin Orbit */}
                        <Circle
                            cx="50" cy="50" r="45"
                            fill="none"
                            stroke={Colors.primary}
                            strokeWidth="2"
                            strokeDasharray="10 5"
                        />

                        {/* Small Coin Icon */}
                        <Circle cx="85" cy="30" r="8" fill={Colors.income} />
                        <Path d="M85 26 V34 M82 30 H88" stroke="white" strokeWidth="2" />
                    </G>
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
