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
