/** The one raw-score invariant used across derivation, persistence, and import. */

export const RAW_SCORE_MIN = 0;
export const RAW_SCORE_MAX = 100;

/** True when `value` is a finite number inside the raw-score band. */
export function isInRawScoreRange(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= RAW_SCORE_MIN &&
    value <= RAW_SCORE_MAX
  );
}

/** True when a smoothed level (also normalized to 0–100) is inside the band. */
export function isInLevelRange(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= RAW_SCORE_MIN &&
    value <= RAW_SCORE_MAX
  );
}
