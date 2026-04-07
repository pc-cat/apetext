/**
 * Pure function — calculate typing consistency from an array of per-second WPM values.
 * Formula: (1 - (stdDev / mean)) * 100, clamped to [0, 100].
 * Matches Monkeytype's coefficient-of-variation approach.
 */
export function calculateConsistency(wpmArray: number[]): number {
  if (!wpmArray || wpmArray.length < 2) return 100;
  const mean = wpmArray.reduce((a, b) => a + b, 0) / wpmArray.length;
  if (mean === 0) return 0; // all seconds had 0 keystrokes
  const variance = wpmArray.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / wpmArray.length;
  const stdev = Math.sqrt(variance);
  const consistency = (1 - (stdev / mean)) * 100;
  return Math.max(0, Math.min(100, Math.round(consistency)));
}
