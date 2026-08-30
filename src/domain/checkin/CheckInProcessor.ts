import type { Gis, GisTier } from "@/domain/models/Gis";
import type { CheckIn } from "@/data/schema/CheckIn";
import type { DomainSegment } from "@/data/schema/Endeavour";
import type { Snapshot } from "@/data/schema/Snapshot";
import { CheckInScoringEngine } from "@/domain/checkin/CheckInScoringEngine";
import { HoltSmoother } from "@/domain/trajectory/HoltSmoother";
import { ConsistencyTracker } from "@/domain/trajectory/ConsistencyTracker";

/** The single entry point that turns a completed check-in into a persisted `Snapshot`. */
export class CheckInProcessor {
  static apply(
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

    const raw = CheckInScoringEngine.calculateRawScore(activeGis, checkIn.responses, modifier);

    const holt = HoltSmoother.step(
      n,
      raw,
      segmentChanged ? null : priorSnapshot.level,
      segmentChanged ? null : priorSnapshot.trend,
    );

    const consistencyStatus = ConsistencyTracker.evaluate(segmentChanged ? [] : recentResiduals, n);

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
    };
  }
}
