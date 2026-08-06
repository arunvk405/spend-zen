import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { isNew } from '../utils/newFeatureUtils';

interface NewTagProps {
    featureTimestamp: number;
}

/**
 * NewTag — renders a compact "NEW" pill badge if the feature is within 48 hours of release.
 * Usage: <NewTag featureTimestamp={FEATURE_TIMESTAMPS.myFeature} />
 */
export const NewTag: React.FC<NewTagProps> = ({ featureTimestamp }) => {
    if (!isNew(featureTimestamp)) return null;

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
