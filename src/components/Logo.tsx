import React from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { useThemeColors } from '../theme/colors';

interface LogoProps {
    size?: number;
    showText?: boolean;
    horizontal?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 44, showText = true, horizontal = true }) => {
    const Colors = useThemeColors();

    return (
        <View style={[
            styles.container,
            horizontal ? styles.row : styles.column,
            !showText && styles.center
        ]}>
            <View style={[
                styles.iconWrapper,
                {
                    width: size,
                    height: size,
                    borderRadius: Math.round(size * 0.26),
                    shadowColor: Colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.18,
                    shadowRadius: 10,
                    elevation: 4,
                }
            ]}>
                <Image
                    source={require('../../assets/icon.png')}
                    style={{
                        width: size,
                        height: size,
                        borderRadius: Math.round(size * 0.26),
                    }}
                    resizeMode="contain"
                />
            </View>

            {showText && (
                <View style={[horizontal ? styles.textMarginLeft : styles.textMarginTop, !horizontal && { alignItems: 'center' }]}>
                    <Text style={[
                        styles.logoText,
                        { color: Colors.text, fontSize: Math.max(16, size * 0.52) }
                    ]}>
                        Spend<Text style={{ color: Colors.primary }}>Zen</Text>
                    </Text>
                    <Text style={[
                        styles.tagline,
                        { color: Colors.textMuted, fontSize: Math.max(8.5, size * 0.19) }
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
        alignItems: 'center',
    },
    column: {
        flexDirection: 'column',
        alignItems: 'center',
    },
    center: {
        justifyContent: 'center',
    },
    iconWrapper: {
        overflow: 'hidden',
    },
    textMarginLeft: {
        marginLeft: 12,
    },
    textMarginTop: {
        marginTop: 10,
    },
    logoText: {
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    tagline: {
        fontWeight: '700',
        letterSpacing: 2,
        marginTop: 2,
        textTransform: 'uppercase',
    }
});
