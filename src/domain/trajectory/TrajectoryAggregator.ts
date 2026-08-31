import { RIVAL_MATH_CONFIG } from "@/domain/config/tuningConstants";

/**
 * A trajectory label is a human-usable direction summary derived from a
 * normalized `TrajectoryReading` (a z-score against a domain's own history).
 *
 * `new` is reserved for readings without a baseline.
 */
export type TrajectoryLabel = "climbing" | "steady" | "cooling" | "new";

export interface TrajectoryReading {
  value: number;
  /** Whether the reading has a valid baseline for comparison, `false` if not enough history or zero variance */
  hasBaseline: boolean;
  /** Display label derived from `value` and `hasBaseline`. */
  label: TrajectoryLabel;
}

/**
 * Z-score of `value` against `history` (that domain's own past trend values,
 * NOT other domains' values -- each domain is normalized against itself).
 */
export function zScore(value: number, history: number[]): TrajectoryReading {
  if (history.length < RIVAL_MATH_CONFIG.TRAJECTORY_BASELINE_MIN) {
    return { value: 0, hasBaseline: false, label: "new" };
  }

  const mean = history.reduce((sum, v) => sum + v, 0) / history.length;
  const variance = history.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / history.length;
  const stdev = Math.sqrt(variance);

  if (stdev === 0) {
    return { value: 0, hasBaseline: false, label: "new" };
  }

  const z = (value - mean) / stdev;
  return { value: z, hasBaseline: true, label: labelOf(z, true) };
}

/**
 * Domain-level rollup: z-scores every current item's trend against the
 * domain's own baseline history, then averages -- but only across items that
 * actually got a real reading. Items without a baseline are EXCLUDED from the
 * average (not counted as 0). If none have one, the whole rollup reports
 * hasBaseline: false (and label `new`).
 */
export function domainRollup(
  currentItemTrends: number[],
  domainTrendHistory: number[],
): TrajectoryReading {
  if (currentItemTrends.length === 0) {
    return { value: 0, hasBaseline: false, label: "new" };
  }

  const readings = currentItemTrends.map((t) => zScore(t, domainTrendHistory));
  const withBaseline = readings.filter((r) => r.hasBaseline);

  if (withBaseline.length === 0) {
    return { value: 0, hasBaseline: false, label: "new" };
  }

  const avg = withBaseline.reduce((sum, r) => sum + r.value, 0) / withBaseline.length;
  return { value: avg, hasBaseline: true, label: labelOf(avg, true) };
}

/**
 * Overall Rival trajectory: composite across all domains. Same exclusion rule
 * as domainRollup -- domains without a baseline yet are left out of the
 * average rather than dragging it toward 0.
 */
export function overallTrajectory(domainRollups: TrajectoryReading[]): TrajectoryReading {
  const withBaseline = domainRollups.filter((r) => r.hasBaseline);

  if (withBaseline.length === 0) {
    return { value: 0, hasBaseline: false, label: "new" };
  }

  const avg = withBaseline.reduce((sum, r) => sum + r.value, 0) / withBaseline.length;
  return { value: avg, hasBaseline: true, label: labelOf(avg, true) };
}

/** Derives the display label for a finalized reading value. */
function labelOf(value: number, hasBaseline: boolean): TrajectoryLabel {
  if (!hasBaseline) {
    return "new";
  }
  if (value >= RIVAL_MATH_CONFIG.TRAJECTORY_CLIMB_THRESHOLD) {
    return "climbing";
  }
  if (value <= RIVAL_MATH_CONFIG.TRAJECTORY_COOL_THRESHOLD) {
    return "cooling";
  }
  return "steady";
}
