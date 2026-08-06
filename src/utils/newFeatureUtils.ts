/**
 * NewFeature utility — shows "NEW" badge on features for 48 hours after build.
 * BUILD_TIMESTAMP is baked in at build time via Date.now().
 * isNew(featureKey) returns true if the feature's release date is within 48hrs of NOW.
 */

export const BUILD_TIMESTAMP: number = Date.now();

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

/**
 * Returns true if releaseTimestamp is within 48 hours of the current time.
 * Use Date.now() values (milliseconds since epoch) for releaseTimestamp.
 */
export function isNew(releaseTimestamp: number): boolean {
    return Date.now() - releaseTimestamp < FORTY_EIGHT_HOURS_MS;
}

/**
 * Feature release timestamps — update this when shipping new features.
 * Each key maps to a Unix ms timestamp of when the feature was deployed.
 */
export const FEATURE_TIMESTAMPS: Record<string, number> = {
    termsAndConditions:   1754469000000, // 2026-08-06 (Terms & Conditions)
    faqSection:           1754469000000, // 2026-08-06 (FAQ Section)
    performanceOptimizer: 1754469000000, // 2026-08-06 (1-Tap Speed Optimizer)
    jsonBackup:           1754469000000, // 2026-08-06 (JSON Backup & Restore)
    aiPredictiveForecast: 1754469000000, // 2026-08-06 (6-Month Cash Flow Forecast)
    aiLeakDetector:       1754469000000, // 2026-08-06 (Spending Leak Detector)
};
