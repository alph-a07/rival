import type { Gis, GisTier } from "@/domain/models/Gis";
import type { CheckIn } from "@/domain/models/CheckIn";
import type { DomainSegment } from "@/domain/models/Endeavour";
import type { Snapshot } from "@/domain/models/Snapshot";
import { calculateRawScore } from "@/domain/checkin/checkInScoringEngine";
import { holtStep } from "@/domain/trajectory/holtSmoother";
import { evaluateConsistency } from "@/domain/trajectory/consistencyTracker";
import {
  CALC_ALGORITHM_VERSION,
  RULE_SET_VERSION,
  TUNING_CONFIG_VERSION,
} from "@/domain/config/versions";

/** The config signature stamped on every freshly derived snapshot. */
export const CURRENT_CALC_VERSION = `calc-${CALC_ALGORITHM_VERSION}:rules-${RULE_SET_VERSION}:tuning-${TUNING_CONFIG_VERSION}`;

/** The single entry point that turns a completed check-in into a persisted `Snapshot`. */
export function buildSnapshotFromCheckIn(
  checkIn: CheckIn,
  segment: DomainSegment,
  activeGis: Map<Gis, GisTier>,
  priorSnapshot: Snapshot | null,
  recentResiduals: (number | null)[],
  modifier: number = 1.0,
): Snapshot {
  const segmentChanged =
    priorSnapshot === null || priorSnapshot.segmentStartDate !== segment.startDate;
  const n = segmentChanged ? 1 : priorSnapshot.n + 1;

  const raw = calculateRawScore(activeGis, checkIn.responses, modifier);

  const holt = holtStep(
    n,
    raw,
    segmentChanged ? null : priorSnapshot.level,
    segmentChanged ? null : priorSnapshot.trend,
  );

  const consistencyStatus = evaluateConsistency(segmentChanged ? [] : recentResiduals, n);

  return {
    id: checkIn.id,
    endeavourId: checkIn.endeavourId,
    checkInId: checkIn.id,
    timestamp: checkIn.timestamp,
    domainId: segment.domainId,
    segmentStartDate: segment.startDate,
    n,
    raw,
    forecast: holt.forecast,
    residual: holt.residual,
    level: holt.level,
    trend: holt.trend,
    consistencyStatus,
    calcVersion: CURRENT_CALC_VERSION,
  };
}
