/**
 * NewFeature utility — shows "NEW" badge on features for 48 hours after release.
 * isNew(timestamp) returns true if the feature's release date is within 48hrs of NOW.
 *
 * Timestamp guide: use Date.now() at the time of deployment, or pre-calculate:
 *   2026-08-06T00:00:00Z = 1785974400000
 */

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

/**
 * Returns true if releaseTimestamp is within 48 hours of the current time.
 */
export function isNew(releaseTimestamp: number): boolean {
    return Date.now() - releaseTimestamp < FORTY_EIGHT_HOURS_MS;
}

/**
 * Feature release timestamps — update this when shipping new features.
 * Each value is a Unix ms timestamp (Date.now()) of when the feature shipped.
 * 2026-08-06T00:00:00Z = 1785974400000
 */
export const FEATURE_TIMESTAMPS: Record<string, number> = {
    termsAndConditions:   1785974400000, // 2026-08-06 (Terms & Conditions)
    faqSection:           1785974400000, // 2026-08-06 (FAQ Section)
    performanceOptimizer: 1785974400000, // 2026-08-06 (1-Tap Speed Optimizer)
    jsonBackup:           1785974400000, // 2026-08-06 (JSON Backup & Restore)
    aiPredictiveForecast: 1785974400000, // 2026-08-06 (6-Month Cash Flow Forecast)
    aiLeakDetector:       1785974400000, // 2026-08-06 (Spending Leak Detector)
};

