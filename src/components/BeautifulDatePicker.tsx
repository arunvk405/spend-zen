import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, isToday } from 'date-fns';
import { useThemeColors } from '../theme/colors';

interface BeautifulDatePickerProps {
    value: Date;
    onChange: (date: Date) => void;
    onClose: () => void;
}

export const BeautifulDatePicker = ({ value, onChange, onClose }: BeautifulDatePickerProps) => {
    const Colors = useThemeColors();
    const [viewDate, setViewDate] = useState(value);

    const days = eachDayOfInterval({
        start: startOfMonth(viewDate),
        end: endOfMonth(viewDate)
    });

    const startPadding = getDay(startOfMonth(viewDate));
    const paddingDays = Array(startPadding).fill(null);

    const handlePrevMonth = () => setViewDate(subMonths(viewDate, 1));
    const handleNextMonth = () => setViewDate(addMonths(viewDate, 1));

    return (
        <View style={[styles.container, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
                    <ChevronLeft size={20} color={Colors.text} />
                </TouchableOpacity>
                
                <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.monthText, { color: Colors.text }]}>
                        {format(viewDate, 'MMMM yyyy')}
                    </Text>
                </View>

                <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
                    <ChevronRight size={20} color={Colors.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.daysHeader}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <Text key={i} style={[styles.dayOfWeek, { color: Colors.textMuted }]}>{d}</Text>
                ))}
            </View>

            <View style={styles.grid}>
                {paddingDays.map((_, i) => (
                    <View key={`pad-${i}`} style={styles.dayCell} />
                ))}
                {days.map((day, i) => {
                    const isSelected = isSameDay(day, value);
                    const isCurrentDay = isToday(day);
                    
                    return (
                        <TouchableOpacity
                            key={i}
                            onPress={() => {
                                onChange(day);
                                if (Platform.OS === 'web') onClose();
                            }}
                            style={[
                                styles.dayCell,
                                isSelected && { backgroundColor: Colors.primary, borderRadius: 12 },
                                !isSelected && isCurrentDay && { borderColor: Colors.primary, borderWidth: 1, borderRadius: 12 }
                            ]}
                        >
                            <Text style={[
                                styles.dayText,
                                { color: isSelected ? '#fff' : Colors.text },
                                isCurrentDay && !isSelected && { color: Colors.primary, fontWeight: 'bold' }
                            ]}>
                                {format(day, 'd')}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <TouchableOpacity 
                style={[styles.todayBtn, { backgroundColor: Colors.primary + '10' }]} 
                onPress={() => {
                    onChange(new Date());
                    onClose();
                }}
            >
                <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 13 }}>Today</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 310,
        padding: 20,
        borderRadius: 28,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 15,
        zIndex: 5000,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    navBtn: {
        width: 40,
        height: 40,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthText: {
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    daysHeader: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    dayOfWeek: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -2,
    },
    dayCell: {
        width: '14.28%',
        height: 42,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 1,
    },
    dayText: {
        fontSize: 15,
        fontWeight: '600',
    },
    todayBtn: {
        marginTop: 20,
        paddingVertical: 10,
        borderRadius: 16,
        alignItems: 'center',
    }
});
