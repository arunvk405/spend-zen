import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Animated,
    PanResponder,
    useWindowDimensions,
    ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
    Calculator as CalcIcon,
    X,
    Minus,
    Copy,
    Check,
    ArrowDownToLine,
    Delete,
    Clock,
    Percent,
    GripVertical,
} from 'lucide-react-native';
import { useThemeColors } from '../theme/colors';
import { useCalculator } from '../context/CalculatorContext';

interface CalcHistoryItem {
    id: string;
    expression: string;
    result: string;
    timestamp: string;
}

export const FloatingCalculator: React.FC = () => {
    const Colors = useThemeColors();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const isDesktop = windowWidth >= 768;

    const {
        isOpen,
        isMinimized,
        openCalculator,
        closeCalculator,
        toggleMinimize,
        applyCallback,
        setLastResult,
    } = useCalculator();

    // Calculator State
    const [display, setDisplay] = useState('0');
    const [expression, setExpression] = useState('');
    const [prevValue, setPrevValue] = useState<number | null>(null);
    const [operator, setOperator] = useState<string | null>(null);
    const [waitingForOperand, setWaitingForOperand] = useState(false);
    const [copied, setCopied] = useState(false);
    const [applied, setApplied] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showTaxTools, setShowTaxTools] = useState(false);
    const [history, setHistory] = useState<CalcHistoryItem[]>([]);

    // Animation values for modal open/close transitions
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.92)).current;

    // Draggable position state for Badge and Card separately
    const isDraggingRef = useRef(false);
    const badgePosRef = useRef<{ x: number; y: number } | null>(null);
    const cardPosRef = useRef<{ x: number; y: number } | null>(null);
    const posRef = useRef({ x: 0, y: 0 });
    const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

    // Listen to pan coordinate changes to keep posRef up-to-date
    useEffect(() => {
        const id = pan.addListener((value) => {
            posRef.current = value;
        });
        return () => {
            pan.removeListener(id);
        };
    }, [pan]);

    // Viewport Boundary Clamping Helper
    const getClamped = useCallback((
        pos: { x: number; y: number },
        elementWidth: number,
        elementHeight: number
    ) => {
        const minX = 12;
        const maxX = Math.max(minX, windowWidth - elementWidth - 12);
        const minY = 12;
        const bottomSafety = isDesktop ? 24 : 88;
        const maxY = Math.max(minY, windowHeight - elementHeight - bottomSafety);

        return {
            x: Math.min(Math.max(pos.x, minX), maxX),
            y: Math.min(Math.max(pos.y, minY), maxY),
        };
    }, [windowWidth, windowHeight, isDesktop]);

    // Default Badge Position Helper (Bottom Right)
    const getDefaultBadgePosition = useCallback((badgeWidth: number, badgeHeight: number) => {
        const defaultRight = isDesktop ? 32 : 18;
        const defaultBottom = isDesktop ? 32 : 88;
        return {
            x: Math.max(12, windowWidth - badgeWidth - defaultRight),
            y: Math.max(12, windowHeight - badgeHeight - defaultBottom),
        };
    }, [windowWidth, windowHeight, isDesktop]);

    // Handle Open/Close state transitions smoothly
    const prevIsOpenRef = useRef(isOpen);
    useEffect(() => {
        const badgeWidth = isDesktop ? 92 : 50;
        const badgeHeight = 48;
        const cardWidth = isDesktop ? 336 : Math.min(350, windowWidth - 24);
        const cardHeight = 490;

        if (isOpen) {
            // Calculator opened: Anchor card so its bottom-right matches the badge location
            const currentBadgePos = badgePosRef.current || getDefaultBadgePosition(badgeWidth, badgeHeight);
            const targetCardX = currentBadgePos.x + badgeWidth - cardWidth;
            const targetCardY = currentBadgePos.y + badgeHeight - cardHeight;

            const clampedCard = getClamped({ x: targetCardX, y: targetCardY }, cardWidth, cardHeight);
            cardPosRef.current = clampedCard;
            pan.setValue(clampedCard);
            posRef.current = clampedCard;
        } else {
            // Calculator closed: Restore badge position at the bottom (or where user left it)
            const targetBadgePos = badgePosRef.current || getDefaultBadgePosition(badgeWidth, badgeHeight);
            const clampedBadge = getClamped(targetBadgePos, badgeWidth, badgeHeight);
            badgePosRef.current = clampedBadge;
            cardPosRef.current = null;
            pan.setValue(clampedBadge);
            posRef.current = clampedBadge;
        }
        prevIsOpenRef.current = isOpen;
    }, [isOpen, isDesktop, windowWidth, windowHeight, getDefaultBadgePosition, getClamped, pan]);

    // Window resize handler
    useEffect(() => {
        const badgeWidth = isDesktop ? 92 : 50;
        const badgeHeight = 48;
        const cardWidth = isDesktop ? 336 : Math.min(350, windowWidth - 24);
        const cardHeight = 490;

        if (isOpen) {
            if (cardPosRef.current) {
                const clamped = getClamped(cardPosRef.current, cardWidth, cardHeight);
                cardPosRef.current = clamped;
                pan.setValue(clamped);
                posRef.current = clamped;
            }
        } else {
            if (badgePosRef.current) {
                const clamped = getClamped(badgePosRef.current, badgeWidth, badgeHeight);
                badgePosRef.current = clamped;
                pan.setValue(clamped);
                posRef.current = clamped;
            } else {
                const def = getDefaultBadgePosition(badgeWidth, badgeHeight);
                badgePosRef.current = def;
                pan.setValue(def);
                posRef.current = def;
            }
        }
    }, [windowWidth, windowHeight, isDesktop, isOpen, getClamped, getDefaultBadgePosition, pan]);

    // Auto-adjust when tax or history drawer expands
    useEffect(() => {
        if (isOpen) {
            const cardWidth = isDesktop ? 336 : Math.min(350, windowWidth - 24);
            const extraHeight = (showHistory ? 120 : 0) + (showTaxTools ? 80 : 0);
            const cardHeight = 490 + extraHeight;
            const clamped = getClamped(posRef.current, cardWidth, cardHeight);
            if (clamped.y !== posRef.current.y) {
                cardPosRef.current = clamped;
                Animated.spring(pan, {
                    toValue: clamped,
                    friction: 8,
                    tension: 80,
                    useNativeDriver: false,
                }).start();
            }
        }
    }, [showHistory, showTaxTools, isOpen, isDesktop, windowWidth, getClamped, pan]);

    // Pan responder for Closed FAB & Minimized Pill
    const badgePanResponder = useMemo(() => {
        return PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
            },
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
            },
            onPanResponderGrant: () => {
                isDraggingRef.current = true;
                pan.setOffset({
                    x: posRef.current.x,
                    y: posRef.current.y,
                });
                pan.setValue({ x: 0, y: 0 });
                if (Platform.OS !== 'web') {
                    try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {
                        // ignore
                    }
                }
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: () => {
                pan.flattenOffset();
                const badgeWidth = isDesktop ? 92 : 50;
                const badgeHeight = 48;
                const clamped = getClamped(posRef.current, badgeWidth, badgeHeight);
                badgePosRef.current = clamped;

                Animated.spring(pan, {
                    toValue: clamped,
                    friction: 7,
                    tension: 70,
                    useNativeDriver: false,
                }).start();

                setTimeout(() => {
                    isDraggingRef.current = false;
                }, 80);
            },
            onPanResponderTerminate: () => {
                pan.flattenOffset();
                setTimeout(() => {
                    isDraggingRef.current = false;
                }, 80);
            },
        });
    }, [isDesktop, getClamped, pan]);

    // Pan responder for Open Card Header
    const cardPanResponder = useMemo(() => {
        return PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
            },
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
            },
            onPanResponderGrant: () => {
                isDraggingRef.current = true;
                pan.setOffset({
                    x: posRef.current.x,
                    y: posRef.current.y,
                });
                pan.setValue({ x: 0, y: 0 });
                if (Platform.OS !== 'web') {
                    try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {
                        // ignore
                    }
                }
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: () => {
                pan.flattenOffset();
                const cardWidth = isDesktop ? 336 : Math.min(350, windowWidth - 24);
                const extraHeight = (showHistory ? 120 : 0) + (showTaxTools ? 80 : 0);
                const cardHeight = 490 + extraHeight;
                const clamped = getClamped(posRef.current, cardWidth, cardHeight);
                cardPosRef.current = clamped;

                // Sync badge anchor to the bottom of the card's position
                const badgeWidth = isDesktop ? 92 : 50;
                const badgeHeight = 48;
                badgePosRef.current = getClamped({
                    x: clamped.x + cardWidth - badgeWidth,
                    y: clamped.y + cardHeight - badgeHeight,
                }, badgeWidth, badgeHeight);

                Animated.spring(pan, {
                    toValue: clamped,
                    friction: 7,
                    tension: 70,
                    useNativeDriver: false,
                }).start();

                setTimeout(() => {
                    isDraggingRef.current = false;
                }, 80);
            },
            onPanResponderTerminate: () => {
                pan.flattenOffset();
                setTimeout(() => {
                    isDraggingRef.current = false;
                }, 80);
            },
        });
    }, [isDesktop, windowWidth, showHistory, showTaxTools, getClamped, pan]);

    // Modal Fade/Scale Animation
    useEffect(() => {
        if (isOpen) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 7,
                    tension: 50,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 140,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.92,
                    duration: 140,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isOpen, fadeAnim, scaleAnim]);

    // Haptic helper
    const triggerHaptic = (type: 'impact' | 'notification' = 'impact') => {
        if (Platform.OS !== 'web') {
            try {
                if (type === 'impact') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } else {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            } catch {
                // Ignore
            }
        }
    };

    // Safe formatting helper
    const formatNumber = (numStr: string): string => {
        if (numStr === 'Error' || numStr === 'Infinity' || numStr === '-Infinity') return numStr;
        const parts = numStr.split('.');
        const integerPart = parts[0];
        const decimalPart = parts.length > 1 ? '.' + parts[1] : '';
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return formattedInteger + decimalPart;
    };

    // Clean float rounding
    const cleanFloat = (num: number): number => {
        return Math.round((num + Number.EPSILON) * 1e8) / 1e8;
    };

    // Calculate binary operation
    const calculate = (firstOperand: number, secondOperand: number, op: string): number => {
        switch (op) {
            case '+': return cleanFloat(firstOperand + secondOperand);
            case '−':
            case '-': return cleanFloat(firstOperand - secondOperand);
            case '×':
            case '*': return cleanFloat(firstOperand * secondOperand);
            case '÷':
            case '/': return secondOperand === 0 ? 0 : cleanFloat(firstOperand / secondOperand);
            default: return secondOperand;
        }
    };

    // Digit Input
    const inputDigit = (digit: string) => {
        triggerHaptic();
        if (waitingForOperand) {
            setDisplay(digit);
            setWaitingForOperand(false);
        } else {
            if (display === '0') {
                setDisplay(digit);
            } else if (display.length < 14) {
                setDisplay(display + digit);
            }
        }
    };

    // Decimal Point Input
    const inputDecimal = () => {
        triggerHaptic();
        if (waitingForOperand) {
            setDisplay('0.');
            setWaitingForOperand(false);
            return;
        }
        if (!display.includes('.')) {
            setDisplay(display + '.');
            setWaitingForOperand(false);
        }
    };

    // Clear and All Clear
    const clearAll = () => {
        triggerHaptic();
        setDisplay('0');
        setPrevValue(null);
        setOperator(null);
        setWaitingForOperand(false);
        setExpression('');
    };

    // Backspace
    const backspace = () => {
        triggerHaptic();
        if (waitingForOperand) return;
        if (display.length > 1) {
            setDisplay(display.slice(0, -1));
        } else {
            setDisplay('0');
        }
    };

    // Toggle Sign (+/-)
    const toggleSign = () => {
        triggerHaptic();
        const value = parseFloat(display);
        if (!isNaN(value) && value !== 0) {
            setDisplay(String(cleanFloat(-value)));
        }
    };

    // Percentage Calculation
    const performPercent = () => {
        triggerHaptic();
        const currentValue = parseFloat(display);
        if (isNaN(currentValue)) return;

        if (prevValue !== null && operator) {
            const percentVal = cleanFloat((prevValue * currentValue) / 100);
            setDisplay(String(percentVal));
            setExpression(`${prevValue} ${operator} ${currentValue}%`);
        } else {
            const percentVal = cleanFloat(currentValue / 100);
            setDisplay(String(percentVal));
            setExpression(`${currentValue}%`);
        }
    };

    // Quick GST Adders
    const addTaxPercent = (rate: number) => {
        triggerHaptic();
        const current = parseFloat(display);
        if (isNaN(current) || current === 0) return;

        const taxAmt = cleanFloat((current * rate) / 100);
        const total = cleanFloat(current + taxAmt);
        const expr = `${current} + ${rate}% GST (${taxAmt})`;

        setDisplay(String(total));
        setExpression(expr);
        setPrevValue(null);
        setOperator(null);
        setWaitingForOperand(true);
        setLastResult(total);

        addHistoryItem(expr, String(total));
    };

    // Quick Split
    const splitBill = (persons: number) => {
        triggerHaptic();
        const current = parseFloat(display);
        if (isNaN(current) || current === 0) return;

        const splitResult = cleanFloat(current / persons);
        const expr = `${current} ÷ ${persons} people`;

        setDisplay(String(splitResult));
        setExpression(expr);
        setPrevValue(null);
        setOperator(null);
        setWaitingForOperand(true);
        setLastResult(splitResult);

        addHistoryItem(expr, String(splitResult));
    };

    // Operator Press (+, -, *, /)
    const performOperation = (nextOperator: string) => {
        triggerHaptic();
        const inputValue = parseFloat(display);

        if (prevValue === null) {
            setPrevValue(inputValue);
            setExpression(`${display} ${nextOperator}`);
        } else if (operator) {
            if (waitingForOperand) {
                setOperator(nextOperator);
                setExpression(`${prevValue} ${nextOperator}`);
                return;
            }

            const result = calculate(prevValue, inputValue, operator);
            setDisplay(String(result));
            setPrevValue(result);
            setExpression(`${result} ${nextOperator}`);
            setLastResult(result);
        }

        setWaitingForOperand(true);
        setOperator(nextOperator);
    };

    // Equals (=)
    const performEquals = () => {
        triggerHaptic('notification');
        const inputValue = parseFloat(display);

        if (prevValue !== null && operator) {
            const result = calculate(prevValue, inputValue, operator);
            const fullExpr = `${prevValue} ${operator} ${inputValue}`;

            setDisplay(String(result));
            setExpression(`${fullExpr} =`);
            setPrevValue(null);
            setOperator(null);
            setWaitingForOperand(true);
            setLastResult(result);

            addHistoryItem(fullExpr, String(result));
        }
    };

    // Add calculation to history
    const addHistoryItem = (expr: string, res: string) => {
        const newItem: CalcHistoryItem = {
            id: Date.now().toString(),
            expression: expr,
            result: res,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setHistory(prev => [newItem, ...prev.slice(0, 9)]);
    };

    // Copy result to clipboard
    const copyResult = async () => {
        triggerHaptic('notification');
        try {
            if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
                await navigator.clipboard.writeText(display);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Apply result to form
    const handleApplyResult = () => {
        const numVal = parseFloat(display);
        if (!isNaN(numVal) && applyCallback) {
            triggerHaptic('notification');
            applyCallback(numVal);
            setApplied(true);
            setTimeout(() => {
                setApplied(false);
                closeCalculator();
            }, 500);
        }
    };

    // Keyboard support on Web
    const handleKeyDown = useCallback((e: any) => {
        if (!isOpen || isMinimized) return;

        const activeTag = document?.activeElement?.tagName?.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') {
            return;
        }

        const key = e.key;

        if (key >= '0' && key <= '9') {
            inputDigit(key);
            e.preventDefault();
        } else if (key === '.') {
            inputDecimal();
            e.preventDefault();
        } else if (key === '+') {
            performOperation('+');
            e.preventDefault();
        } else if (key === '-') {
            performOperation('−');
            e.preventDefault();
        } else if (key === '*' || key === 'x' || key === 'X') {
            performOperation('×');
            e.preventDefault();
        } else if (key === '/') {
            performOperation('÷');
            e.preventDefault();
        } else if (key === '=' || key === 'Enter') {
            performEquals();
            e.preventDefault();
        } else if (key === 'Backspace') {
            backspace();
            e.preventDefault();
        } else if (key === 'Escape' || key === 'c' || key === 'C') {
            clearAll();
            e.preventDefault();
        } else if (key === '%') {
            performPercent();
            e.preventDefault();
        }
    }, [isOpen, isMinimized, display, prevValue, operator, waitingForOperand]);

    useEffect(() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [handleKeyDown]);

    // RENDER: Floating Trigger FAB when closed (Fully Draggable)
    if (!isOpen) {
        return (
            <View pointerEvents="box-none" style={[styles.globalContainer, { zIndex: 99999 }]}>
                <Animated.View
                    {...badgePanResponder.panHandlers}
                    style={[
                        styles.draggableItem,
                        {
                            transform: pan.getTranslateTransform(),
                        }
                    ]}
                >
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                            if (!isDraggingRef.current) {
                                openCalculator();
                            }
                        }}
                        style={[
                            styles.floatingFab,
                            {
                                backgroundColor: Colors.primary,
                                shadowColor: Colors.primary,
                            }
                        ]}
                        accessibilityLabel="Open Quick Calculator (Draggable)"
                    >
                        <GripVertical size={14} color="rgba(255,255,255,0.7)" style={styles.dragGripIcon} />
                        <CalcIcon size={20} color="#ffffff" strokeWidth={2.4} />
                        {isDesktop && (
                            <Text style={styles.fabText}>Calc</Text>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    }

    // RENDER: Minimized Floating Pill (Fully Draggable)
    if (isMinimized) {
        return (
            <View pointerEvents="box-none" style={[styles.globalContainer, { zIndex: 99999 }]}>
                <Animated.View
                    {...badgePanResponder.panHandlers}
                    style={[
                        styles.draggableItem,
                        {
                            transform: pan.getTranslateTransform(),
                        }
                    ]}
                >
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => {
                            if (!isDraggingRef.current) {
                                toggleMinimize();
                            }
                        }}
                        style={[
                            styles.minimizedPill,
                            {
                                backgroundColor: Colors.surface,
                                borderColor: Colors.border,
                                shadowColor: '#000',
                            }
                        ]}
                    >
                        <GripVertical size={14} color={Colors.textMuted} />
                        <View style={[styles.pillIconBadge, { backgroundColor: Colors.primary + '20' }]}>
                            <CalcIcon size={15} color={Colors.primary} strokeWidth={2.4} />
                        </View>
                        <View style={styles.pillTextCol}>
                            <Text style={[styles.pillTitle, { color: Colors.textMuted }]}>Calculator</Text>
                            <Text style={[styles.pillValue, { color: Colors.text }]} numberOfLines={1}>
                                ₹{formatNumber(display)}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={closeCalculator}
                            style={styles.pillCloseBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <X size={14} color={Colors.textMuted} />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    }

    // RENDER: Full Floating Non-Blocking Calculator Card (Draggable by Header)
    return (
        <View pointerEvents="box-none" style={[styles.globalContainer, { zIndex: 99999 }]}>
            <Animated.View
                style={[
                    styles.calculatorCard,
                    {
                        backgroundColor: Colors.surface,
                        borderColor: Colors.border,
                        width: isDesktop ? 336 : Math.min(350, windowWidth - 24),
                        opacity: fadeAnim,
                        transform: [
                            { translateX: pan.x },
                            { translateY: pan.y },
                            { scale: scaleAnim },
                        ],
                        shadowColor: '#000',
                    }
                ]}
            >
                {/* ── Calculator Header Bar (Draggable Handler) ───────────── */}
                <View
                    {...cardPanResponder.panHandlers}
                    style={[styles.cardHeader, { borderBottomColor: Colors.border + '40' }]}
                >
                    <View style={styles.headerTitleRow}>
                        <GripVertical size={15} color={Colors.textMuted} style={styles.headerGrip} />
                        <View style={[styles.headerIconBg, { backgroundColor: Colors.primary + '18' }]}>
                            <CalcIcon size={16} color={Colors.primary} strokeWidth={2.4} />
                        </View>
                        <View>
                            <Text style={[styles.headerTitle, { color: Colors.text }]}>Smart Calculator</Text>
                        </View>
                    </View>

                    <View style={styles.headerControls}>
                        {/* History Toggle */}
                        <TouchableOpacity
                            onPress={() => setShowHistory(!showHistory)}
                            style={[
                                styles.headerBtn,
                                showHistory && { backgroundColor: Colors.primary + '20' }
                            ]}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            accessibilityLabel="Calculation History"
                        >
                            <Clock size={15} color={showHistory ? Colors.primary : Colors.textMuted} />
                        </TouchableOpacity>

                        {/* Tax / GST presets toggle */}
                        <TouchableOpacity
                            onPress={() => setShowTaxTools(!showTaxTools)}
                            style={[
                                styles.headerBtn,
                                showTaxTools && { backgroundColor: Colors.primary + '20' }
                            ]}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            accessibilityLabel="Quick Tax Tools"
                        >
                            <Percent size={15} color={showTaxTools ? Colors.primary : Colors.textMuted} />
                        </TouchableOpacity>

                        {/* Minimize */}
                        <TouchableOpacity
                            onPress={toggleMinimize}
                            style={styles.headerBtn}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            accessibilityLabel="Minimize Calculator"
                        >
                            <Minus size={15} color={Colors.textMuted} />
                        </TouchableOpacity>

                        {/* Close */}
                        <TouchableOpacity
                            onPress={closeCalculator}
                            style={styles.headerBtn}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            accessibilityLabel="Close Calculator"
                        >
                            <X size={15} color={Colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Quick Tools Bar (Tax / GST & Bill Split) ───────────── */}
                {showTaxTools && (
                    <View style={[styles.toolsDrawer, { backgroundColor: Colors.surfaceElevated, borderBottomColor: Colors.border }]}>
                        <View style={styles.toolGroupRow}>
                            <Text style={[styles.toolGroupLabel, { color: Colors.textMuted }]}>GST :</Text>
                            {[5, 12, 18, 28].map(rate => (
                                <TouchableOpacity
                                    key={rate}
                                    style={[styles.toolChip, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                                    onPress={() => addTaxPercent(rate)}
                                >
                                    <Text style={[styles.toolChipText, { color: Colors.primary }]}>+{rate}%</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={[styles.toolGroupRow, { marginTop: 6 }]}>
                            <Text style={[styles.toolGroupLabel, { color: Colors.textMuted }]}>Split :</Text>
                            {[2, 3, 4].map(persons => (
                                <TouchableOpacity
                                    key={persons}
                                    style={[styles.toolChip, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                                    onPress={() => splitBill(persons)}
                                >
                                    <Text style={[styles.toolChipText, { color: Colors.text }]}>÷{persons}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* ── History Drawer ────────────────────────────────────── */}
                {showHistory && (
                    <View style={[styles.historyDrawer, { backgroundColor: Colors.surfaceElevated, borderBottomColor: Colors.border }]}>
                        <View style={styles.historyDrawerHeader}>
                            <Text style={[styles.historyDrawerTitle, { color: Colors.textMuted }]}>RECENT CALCULATIONS</Text>
                            {history.length > 0 && (
                                <TouchableOpacity onPress={() => setHistory([])}>
                                    <Text style={{ color: Colors.expense, fontSize: 11, fontWeight: '600' }}>Clear</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <ScrollView style={{ maxHeight: 110 }} showsVerticalScrollIndicator={false}>
                            {history.length === 0 ? (
                                <Text style={[styles.emptyHistoryText, { color: Colors.textMuted }]}>No calculations yet</Text>
                            ) : (
                                history.map(item => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[styles.historyItem, { borderBottomColor: Colors.border + '30' }]}
                                        onPress={() => {
                                            setDisplay(item.result);
                                            setExpression(item.expression);
                                            setWaitingForOperand(true);
                                        }}
                                    >
                                        <Text style={[styles.historyExpr, { color: Colors.textMuted }]} numberOfLines={1}>
                                            {item.expression} =
                                        </Text>
                                        <Text style={[styles.historyRes, { color: Colors.text }]}>
                                            ₹{formatNumber(item.result)}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                )}

                {/* ── Display Section ───────────────────────────────────── */}
                <View style={[styles.displayContainer, { backgroundColor: Colors.isDark ? '#00000040' : '#f8fafc' }]}>
                    <Text style={[styles.expressionText, { color: Colors.textMuted }]} numberOfLines={1}>
                        {expression || ' '}
                    </Text>

                    <View style={styles.displayRow}>
                        <Text style={[styles.currencyPrefix, { color: Colors.textMuted }]}>₹</Text>
                        <Text
                            style={[
                                styles.displayText,
                                { color: Colors.text },
                                display.length > 10 ? { fontSize: 24 } : display.length > 7 ? { fontSize: 28 } : { fontSize: 32 }
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                        >
                            {formatNumber(display)}
                        </Text>
                    </View>

                    <View style={styles.displayActionsRow}>
                        {applyCallback && (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handleApplyResult}
                                style={[
                                    styles.applyActionBtn,
                                    { backgroundColor: applied ? Colors.income : Colors.primary }
                                ]}
                            >
                                {applied ? (
                                    <>
                                        <Check size={13} color="#fff" />
                                        <Text style={styles.applyActionText}>Applied!</Text>
                                    </>
                                ) : (
                                    <>
                                        <ArrowDownToLine size={13} color="#fff" />
                                        <Text style={styles.applyActionText}>Use in Form</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={copyResult}
                            style={[styles.copyActionBtn, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                        >
                            {copied ? (
                                <>
                                    <Check size={13} color={Colors.income} />
                                    <Text style={[styles.copyActionText, { color: Colors.income }]}>Copied</Text>
                                </>
                            ) : (
                                <>
                                    <Copy size={13} color={Colors.textMuted} />
                                    <Text style={[styles.copyActionText, { color: Colors.textMuted }]}>Copy</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Keypad Grid ───────────────────────────────────────── */}
                <View style={styles.keypad}>
                    {/* Row 1 */}
                    <View style={styles.keyRow}>
                        <CalcButton label="AC" onPress={clearAll} color={Colors.expense} bgColor={Colors.expense + '14'} />
                        <CalcButton
                            icon={<Delete size={18} color={Colors.text} />}
                            onPress={backspace}
                            color={Colors.text}
                            bgColor={Colors.surfaceElevated}
                        />
                        <CalcButton label="%" onPress={performPercent} color={Colors.text} bgColor={Colors.surfaceElevated} />
                        <CalcButton label="÷" onPress={() => performOperation('÷')} color="#fff" bgColor={Colors.primary} isOperator />
                    </View>

                    {/* Row 2 */}
                    <View style={styles.keyRow}>
                        <CalcButton label="7" onPress={() => inputDigit('7')} color={Colors.text} bgColor={Colors.surface} />
                        <CalcButton label="8" onPress={() => inputDigit('8')} color={Colors.text} bgColor={Colors.surface} />
                        <CalcButton label="9" onPress={() => inputDigit('9')} color={Colors.text} bgColor={Colors.surface} />
                        <CalcButton label="×" onPress={() => performOperation('×')} color="#fff" bgColor={Colors.primary} isOperator />
                    </View>

                    {/* Row 3 */}
                    <View style={styles.keyRow}>
                        <CalcButton label="4" onPress={() => inputDigit('4')} color={Colors.text} bgColor={Colors.surface} />
                        <CalcButton label="5" onPress={() => inputDigit('5')} color={Colors.text} bgColor={Colors.surface} />
                        <CalcButton label="6" onPress={() => inputDigit('6')} color={Colors.text} bgColor={Colors.surface} />
                        <CalcButton label="−" onPress={() => performOperation('−')} color="#fff" bgColor={Colors.primary} isOperator />
                    </View>

                    {/* Row 4 */}
                    <View style={styles.keyRow}>
                        <CalcButton label="1" onPress={() => inputDigit('1')} color={Colors.text} bgColor={Colors.surface} />
                        <CalcButton label="2" onPress={() => inputDigit('2')} color={Colors.text} bgColor={Colors.surface} />
                        <CalcButton label="3" onPress={() => inputDigit('3')} color={Colors.text} bgColor={Colors.surface} />
                        <CalcButton label="+" onPress={() => performOperation('+')} color="#fff" bgColor={Colors.primary} isOperator />
                    </View>

                    {/* Row 5 */}
                    <View style={styles.keyRow}>
                        <CalcButton label="±" onPress={toggleSign} color={Colors.text} bgColor={Colors.surface} />
                        <CalcButton label="0" onPress={() => inputDigit('0')} color={Colors.text} bgColor={Colors.surface} />
                        <CalcButton label="." onPress={inputDecimal} color={Colors.text} bgColor={Colors.surface} />
                        <CalcButton
                            label="="
                            onPress={performEquals}
                            color="#fff"
                            bgColor={Colors.income}
                            isOperator
                            style={{ elevation: 2 }}
                        />
                    </View>
                </View>
            </Animated.View>
        </View>
    );
};

interface CalcButtonProps {
    label?: string;
    icon?: React.ReactNode;
    onPress: () => void;
    color: string;
    bgColor: string;
    isOperator?: boolean;
    style?: any;
}

const CalcButton: React.FC<CalcButtonProps> = ({
    label,
    icon,
    onPress,
    color,
    bgColor,
    isOperator,
    style,
}) => {
    const Colors = useThemeColors();
    const [pressed, setPressed] = useState(false);

    return (
        <TouchableOpacity
            activeOpacity={0.65}
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            style={[
                styles.keyBtn,
                {
                    backgroundColor: bgColor,
                    borderColor: Colors.border,
                },
                pressed && { opacity: 0.75, transform: [{ scale: 0.94 }] },
                style,
            ]}
        >
            {icon ? (
                icon
            ) : (
                <Text
                    style={[
                        styles.keyBtnText,
                        { color },
                        isOperator && { fontSize: 21, fontWeight: '700' },
                    ]}
                >
                    {label}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    globalContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    draggableItem: {
        position: 'absolute',
        top: 0,
        left: 0,
    },

    // Floating FAB Trigger Button
    floatingFab: {
        height: 48,
        minWidth: 48,
        paddingHorizontal: 12,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        elevation: 8,
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
            web: {
                boxShadow: '0px 8px 24px rgba(99, 102, 241, 0.4), 0px 2px 6px rgba(0,0,0,0.1)',
                cursor: 'grab',
                userSelect: 'none',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            } as any,
        }),
    },
    dragGripIcon: {
        marginRight: -2,
    },
    fabText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 13,
    },

    // Minimized Pill
    minimizedPill: {
        height: 44,
        paddingHorizontal: 12,
        borderRadius: 22,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        elevation: 8,
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            web: {
                boxShadow: '0px 8px 24px rgba(0,0,0,0.18)',
                cursor: 'grab',
                userSelect: 'none',
            } as any,
        }),
    },
    pillIconBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pillTextCol: {
        maxWidth: 130,
    },
    pillTitle: {
        fontSize: 9.5,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    pillValue: {
        fontSize: 13,
        fontWeight: '700',
    },
    pillCloseBtn: {
        padding: 4,
        marginLeft: 2,
    },

    // Full Floating Calculator Card
    calculatorCard: {
        position: 'absolute',
        top: 0,
        left: 0,
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        elevation: 14,
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25,
                shadowRadius: 18,
            },
            android: {
                elevation: 14,
            },
            web: {
                boxShadow: '0px 16px 40px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.08)',
                userSelect: 'none',
            } as any,
        }),
    },

    // Card Header Bar (Grab Handler)
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        ...Platform.select({
            web: {
                cursor: 'grab',
                userSelect: 'none',
            } as any,
        }),
    },
    headerGrip: {
        marginRight: 2,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    headerIconBg: {
        width: 26,
        height: 26,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 13.5,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    headerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    headerBtn: {
        width: 28,
        height: 28,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Tools Drawer (GST & Split)
    toolsDrawer: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    toolGroupRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    toolGroupLabel: {
        fontSize: 11,
        fontWeight: '700',
        width: 40,
    },
    toolChip: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    toolChipText: {
        fontSize: 11.5,
        fontWeight: '700',
    },

    // History Drawer
    historyDrawer: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    historyDrawerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    historyDrawerTitle: {
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    emptyHistoryText: {
        fontSize: 11.5,
        fontStyle: 'italic',
        paddingVertical: 6,
        textAlign: 'center',
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5,
        borderBottomWidth: 1,
    },
    historyExpr: {
        fontSize: 11.5,
        flex: 1,
        marginRight: 8,
    },
    historyRes: {
        fontSize: 12.5,
        fontWeight: '700',
    },

    // Display Area
    displayContainer: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(150, 150, 150, 0.1)',
    },
    expressionText: {
        fontSize: 12,
        minHeight: 16,
        textAlign: 'right',
        fontWeight: '500',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    displayRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'flex-end',
        gap: 4,
        marginVertical: 2,
    },
    currencyPrefix: {
        fontSize: 18,
        fontWeight: '600',
    },
    displayText: {
        fontWeight: '700',
        textAlign: 'right',
        letterSpacing: -0.5,
    },
    displayActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
        marginTop: 4,
    },
    applyActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 9,
        borderRadius: 6,
    },
    applyActionText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    copyActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        borderWidth: 1,
    },
    copyActionText: {
        fontSize: 11,
        fontWeight: '600',
    },

    // Keypad Grid
    keypad: {
        padding: 10,
        gap: 8,
    },
    keyRow: {
        flexDirection: 'row',
        gap: 8,
    },
    keyBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    keyBtnText: {
        fontSize: 17,
        fontWeight: '600',
    },
});
