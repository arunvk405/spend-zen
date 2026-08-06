/**
 * NewFeature utility — shows "NEW" badge on features for 48 hours after release.
 * Badge hides permanently the moment the user opens the feature (persisted via AsyncStorage).
 *
 * Timestamp guide:
 *   2026-08-06T00:00:00Z = 1785974400000
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEN_PREFIX = '@spendzen_feature_seen_';
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

/** In-memory cache so UI reacts immediately without waiting for AsyncStorage */
const seenCache = new Set<string>();

/** Module-level listeners so NewTag components react instantly on markFeatureSeen() */
const listeners: Map<string, Set<() => void>> = new Map();

/** Returns true if the release was within the last 48 hours AND the user hasn't seen it yet */
export function isNew(featureKey: string): boolean {
    const ts = FEATURE_TIMESTAMPS[featureKey];
    if (!ts) return false;
    return Date.now() - ts < FORTY_EIGHT_HOURS_MS && !seenCache.has(featureKey);
}

/** Call this when the user opens a feature — hides the badge instantly and persists */
export async function markFeatureSeen(featureKey: string): Promise<void> {
    if (seenCache.has(featureKey)) return; // already seen, skip
    seenCache.add(featureKey);
    // Notify all mounted NewTag components for this key to hide immediately
    listeners.get(featureKey)?.forEach(cb => cb());
    await AsyncStorage.setItem(SEEN_PREFIX + featureKey, '1');
}

/** Subscribe a NewTag component to instant hide events for a given key */
export function subscribeFeature(featureKey: string, cb: () => void): () => void {
    if (!listeners.has(featureKey)) listeners.set(featureKey, new Set());
    listeners.get(featureKey)!.add(cb);
    return () => listeners.get(featureKey)!.delete(cb);
}

/** Load persisted seen state into memory cache (call once at app startup) */
export async function loadSeenFeatures(): Promise<void> {
    const keys = Object.keys(FEATURE_TIMESTAMPS);
    const results = await Promise.all(
        keys.map(k => AsyncStorage.getItem(SEEN_PREFIX + k).then(v => ({ k, v })))
    );
    results.forEach(({ k, v }) => { if (v === '1') seenCache.add(k); });
}

/**
 * Feature release timestamps — add new entries here when shipping features.
 * Value = Unix ms timestamp (Date.now()) at time of deploy.
 * 2026-08-06T00:00:00Z = 1785974400000
 */
export const FEATURE_TIMESTAMPS: Record<string, number> = {
    termsAndConditions:   1785974400000, // 2026-08-06
    faqSection:           1785974400000, // 2026-08-06
    performanceOptimizer: 1785974400000, // 2026-08-06
    jsonBackup:           1785974400000, // 2026-08-06
    aiPredictiveForecast: 1785974400000, // 2026-08-06
    aiLeakDetector:       1785974400000, // 2026-08-06
};
