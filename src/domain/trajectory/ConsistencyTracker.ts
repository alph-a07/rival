import { RIVAL_MATH_CONFIG } from "@/domain/config/tuningConstants";
import type { Snapshot } from "@/data/schema/Snapshot";

export type ConsistencyStatus =
  | "warming_up" // gate state: not enough check-ins/residuals yet to read anything
  | "dialed_in"
  | "on_track"
  | "finding_footing"
  | "uneven_ground"
  | "choppy_waters"
  | "off_course"
  | "in_the_storm";

export class ConsistencyTracker {
  static evaluate(residuals: (number | null)[], currentN: number): ConsistencyStatus {
    const validResiduals = residuals.filter((r): r is number => r !== null);

    // Not enough data to judge consistency yet
    if (
      currentN < RIVAL_MATH_CONFIG.CONSISTENCY_WINDOW_MIN ||
      validResiduals.length + 1 < RIVAL_MATH_CONFIG.CONSISTENCY_WINDOW_MIN
    ) {
      return "warming_up";
    }

    // Pick only the most recent residuals, up to the max window size
    const windowSize = Math.min(currentN, RIVAL_MATH_CONFIG.CONSISTENCY_WINDOW_MAX);
    const windowData = validResiduals.slice(-windowSize);

    const mean = windowData.reduce((sum, val) => sum + val, 0) / windowData.length;
    const variance =
      windowData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / windowData.length;
    const stdev = Math.sqrt(variance);

    for (const tier of RIVAL_MATH_CONFIG.CONSISTENCY_THRESHOLDS) {
      if (stdev < tier.limit) {
        return tier.status;
      }
    }

    return "in_the_storm";
  }

  /** Flags the "worst" Snapshot in a segment's history by the magnitude of its residual — the index of the largest absolute `residual`. */
  static flagWorst(snapshots: Snapshot[]): number | null {
    if (snapshots.length < 2) {
      return null;
    }

    let worstIndex = -1;
    let worstMagnitude = -1;
    for (let i = 0; i < snapshots.length; i++) {
      const residual = snapshots[i].residual;
      if (residual === null) {
        continue; // first check-in of a segment; no residual to compare
      }
      const magnitude = Math.abs(residual);
      if (magnitude > worstMagnitude) {
        worstMagnitude = magnitude;
        worstIndex = i;
      }
    }

    return worstIndex === -1 ? null : worstIndex;
  }
}
