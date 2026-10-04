import React, { createContext, useContext, useState, useCallback } from 'react';

interface CalculatorContextType {
    isOpen: boolean;
    isMinimized: boolean;
    openCalculator: (onApply?: (result: number) => void) => void;
    closeCalculator: () => void;
    toggleCalculator: (onApply?: (result: number) => void) => void;
    toggleMinimize: () => void;
    setMinimized: (minimized: boolean) => void;
    applyCallback: ((result: number) => void) | null;
    setApplyCallback: (callback: ((result: number) => void) | null) => void;
    lastResult: number | null;
    setLastResult: (result: number | null) => void;
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

export const CalculatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [applyCallback, setApplyCallback] = useState<((result: number) => void) | null>(null);
    const [lastResult, setLastResult] = useState<number | null>(null);

    const openCalculator = useCallback((onApply?: (result: number) => void) => {
        if (onApply) {
            setApplyCallback(() => onApply);
        }
        setIsOpen(true);
        setIsMinimized(false);
    }, []);

    const closeCalculator = useCallback(() => {
        setIsOpen(false);
        setIsMinimized(false);
        setApplyCallback(null);
    }, []);

    const toggleCalculator = useCallback((onApply?: (result: number) => void) => {
        setIsOpen(prev => {
            if (!prev) {
                if (onApply) setApplyCallback(() => onApply);
                setIsMinimized(false);
                return true;
            } else {
                return false;
            }
        });
    }, []);

    const toggleMinimize = useCallback(() => {
        setIsMinimized(prev => !prev);
    }, []);

    const setMinimizedHandler = useCallback((minimized: boolean) => {
        setIsMinimized(minimized);
    }, []);

    return (
        <CalculatorContext.Provider
            value={{
                isOpen,
                isMinimized,
                openCalculator,
                closeCalculator,
                toggleCalculator,
                toggleMinimize,
                setMinimized: setMinimizedHandler,
                applyCallback,
                setApplyCallback,
                lastResult,
                setLastResult,
            }}
        >
            {children}
        </CalculatorContext.Provider>
    );
};

export const useCalculator = () => {
    const context = useContext(CalculatorContext);
    if (!context) {
        throw new Error('useCalculator must be used within a CalculatorProvider');
    }
    return context;
};
