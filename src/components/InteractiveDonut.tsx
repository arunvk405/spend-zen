import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, TouchableOpacity } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';

interface DataItem {
    name: string;
    amount: number;
    color: string;
    percent: number;
}

interface InteractiveDonutProps {
    data: DataItem[];
    size: number;
    innerRadius?: number;
    onSelect: (name: string | null) => void;
    selectedItem: DataItem | null;
    colors: any;
}

const InteractiveDonut: React.FC<InteractiveDonutProps> = ({ 
    data, 
    size, 
    innerRadius, 
    onSelect, 
    selectedItem,
    colors 
}) => {
    const [tooltipPos, setTooltipPos] = useState<{ x: number, y: number } | null>(null);
    const containerRef = useRef<View>(null);
    
    const chartSize = Math.min(size, 260);
    const radius = chartSize / 2;
    const center = radius;
    const outerRadius = radius - 15;
    const effectiveInnerRadius = innerRadius || radius * 0.65;
    
    let currentAngle = -Math.PI / 2;

    const handleMouseMove = (e: any, item: DataItem) => {
        if (Platform.OS === 'web') {
            // We need the container's position to calculate relative mouse position
            // In web, we can use the event's native target or parent
            const rect = e.currentTarget.closest('svg').parentElement.getBoundingClientRect();
            setTooltipPos({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
            onSelect(item.name);
        }
    };

    const slices = data.map((item, index) => {
        const sliceAngle = (item.percent / 100) * Math.PI * 2;
        const startAngle = currentAngle;
        const endAngle = currentAngle + sliceAngle;
        currentAngle += sliceAngle;

        const x1 = center + outerRadius * Math.cos(startAngle);
        const y1 = center + outerRadius * Math.sin(startAngle);
        const x2 = center + outerRadius * Math.cos(endAngle);
        const y2 = center + outerRadius * Math.sin(endAngle);
        const ix1 = center + effectiveInnerRadius * Math.cos(startAngle);
        const iy1 = center + effectiveInnerRadius * Math.sin(startAngle);
        const ix2 = center + effectiveInnerRadius * Math.cos(endAngle);
        const iy2 = center + effectiveInnerRadius * Math.sin(endAngle);

        const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
        const d = `
            M ${x1} ${y1}
            A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}
            L ${ix2} ${iy2}
            A ${effectiveInnerRadius} ${effectiveInnerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1}
            Z
        `;

        const isSelected = selectedItem?.name === item.name;

        return (
            <Path
                key={item.name}
                d={d}
                fill={item.color}
                stroke={colors.surface}
                strokeWidth={2}
                opacity={selectedItem ? (isSelected ? 1 : 0.4) : 0.9}
                {...Platform.select({
                    web: {
                        onClick: () => onSelect(isSelected ? null : item.name),
                        onMouseMove: (e: any) => handleMouseMove(e, item),
                        onMouseLeave: () => {
                            setTooltipPos(null);
                            onSelect(null);
                        },
                        style: { cursor: 'pointer', transition: 'opacity 0.2s ease' }
                    } as any,
                    default: {
                        onPress: () => onSelect(isSelected ? null : item.name)
                    }
                })}
            />
        );
    });

    return (
        <View 
            ref={containerRef}
            style={{ width: chartSize, height: chartSize, alignItems: 'center', justifyContent: 'center' }}
        >
            <Svg width={chartSize} height={chartSize}>
                <G>
                    {slices}
                    <Circle cx={center} cy={center} r={effectiveInnerRadius - 1} fill={colors.surface} />
                </G>
            </Svg>
            
            {/* Dynamic Center Content (Always centered) */}
            <View style={[styles.centerContent, { width: effectiveInnerRadius * 1.8, height: effectiveInnerRadius * 1.8 }]}>
                {selectedItem ? (
                    <>
                        <Text style={[styles.tooltipName, { color: colors.textMuted }]} numberOfLines={2}>
                            {selectedItem.name.toUpperCase()}
                        </Text>
                        <Text style={[styles.tooltipAmount, { color: colors.text }]}>
                            ₹{selectedItem.amount.toLocaleString()}
                        </Text>
                        <View style={[styles.badge, { backgroundColor: selectedItem.color + '15' }]}>
                            <Text style={[styles.badgeText, { color: selectedItem.color }]}>
                                {selectedItem.percent.toFixed(1)}%
                            </Text>
                        </View>
                    </>
                ) : (
                    <>
                        <Text style={[styles.centerLabel, { color: colors.textMuted }]}>TOTAL</Text>
                        <Text style={[styles.centerValue, { color: colors.text }]}>
                            ₹{data.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>
                            {data.length} Categories
                        </Text>
                    </>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    centerContent: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 10,
        pointerEvents: 'none' as any
    },
    centerLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 1 },
    centerValue: { fontSize: 18, fontWeight: 'bold' },
    tooltipName: { fontSize: 9, fontWeight: '800', textAlign: 'center', paddingHorizontal: 10, letterSpacing: 0.5 },
    tooltipAmount: { fontSize: 16, fontWeight: 'bold', marginVertical: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 2 },
    badgeText: { fontSize: 11, fontWeight: '800' },
});

export default InteractiveDonut;
