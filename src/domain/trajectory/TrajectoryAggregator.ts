import { RIVAL_MATH_CONFIG } from "@/domain/config/tuningConstants";

export interface TrajectoryReading {
  value: number;
  /** Whether the reading has a valid baseline for comparison, `false` if not enough history or zero variance */
  hasBaseline: boolean;
}

export class TrajectoryAggregator {
  /**
   * Z-score of `value` against `history` (that domain's own past trend values,
   * NOT other domains' values -- each domain is normalized against itself).
   */
  static zScore(value: number, history: number[]): TrajectoryReading {
    if (history.length < RIVAL_MATH_CONFIG.TRAJECTORY_BASELINE_MIN) {
      return { value: 0, hasBaseline: false };
    }

    const mean = history.reduce((sum, v) => sum + v, 0) / history.length;
    const variance = history.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / history.length;
    const stdev = Math.sqrt(variance);

    if (stdev === 0) {
      return { value: 0, hasBaseline: false };
    }

    return { value: (value - mean) / stdev, hasBaseline: true };
  }

  /**
   * Domain-level rollup: z-scores every current item's trend against the
   * domain's own baseline history, then averages -- but only across items that
   * actually got a real reading. Items without a baseline are EXCLUDED from the
   * average (not counted as 0). If none have one, the whole rollup reports
   * hasBaseline: false.
   */
  static domainRollup(
    currentItemTrends: number[],
    domainTrendHistory: number[],
  ): TrajectoryReading {
    if (currentItemTrends.length === 0) {
      return { value: 0, hasBaseline: false };
    }

    const readings = currentItemTrends.map((t) => this.zScore(t, domainTrendHistory));
    const withBaseline = readings.filter((r) => r.hasBaseline);

    if (withBaseline.length === 0) {
      return { value: 0, hasBaseline: false };
    }

    const avg = withBaseline.reduce((sum, r) => sum + r.value, 0) / withBaseline.length;
    return { value: avg, hasBaseline: true };
  }

  /**
   * Overall Rival trajectory: composite across all domains. Same exclusion rule
   * as domainRollup -- domains without a baseline yet are left out of the
   * average rather than dragging it toward 0.
   */
  static overallTrajectory(domainRollups: TrajectoryReading[]): TrajectoryReading {
    const withBaseline = domainRollups.filter((r) => r.hasBaseline);

    if (withBaseline.length === 0) {
      return { value: 0, hasBaseline: false };
    }

    const avg = withBaseline.reduce((sum, r) => sum + r.value, 0) / withBaseline.length;
    return { value: avg, hasBaseline: true };
  }
}
