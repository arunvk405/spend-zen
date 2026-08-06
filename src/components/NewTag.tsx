import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isNew, subscribeFeature } from '../utils/newFeatureUtils';

interface NewTagProps {
    /** The feature key from FEATURE_TIMESTAMPS, e.g. "faqSection" */
    featureKey: string;
}

const SEEN_PREFIX = '@spendzen_feature_seen_';

/**
 * NewTag — renders a "NEW" pill badge that:
 * 1. Only shows if the feature was released within the last 48 hours
 * 2. Disappears instantly when the user opens the feature (markFeatureSeen called)
 * 3. Stays hidden on future sessions (AsyncStorage persistence)
 *
 * Usage: <NewTag featureKey="faqSection" />
 */
export const NewTag: React.FC<NewTagProps> = ({ featureKey }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Check persisted seen state on mount
        AsyncStorage.getItem(SEEN_PREFIX + featureKey).then(val => {
            if (val !== '1' && isNew(featureKey)) {
                setVisible(true);
            }
        });

        // Subscribe for instant hide when markFeatureSeen() is called elsewhere
        const unsubscribe = subscribeFeature(featureKey, () => setVisible(false));
        return unsubscribe;
    }, [featureKey]);

    if (!visible) return null;

    return (
        <View style={styles.badge}>
            <Text style={styles.text}>NEW</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        backgroundColor: '#10b981',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 6,
        alignSelf: 'center',
    },
    text: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});
