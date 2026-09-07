import type { Snapshot } from "@/domain/models/Snapshot";
import type { ConsistencyStatus } from "@/domain/trajectory/consistencyTracker";

/**
 * The persisted/exported storage document for a calculated check-in result.
 *
 * Physically it is the same flat field set today as the `domain` snapshot; the
 * row type is the boundary seam: storage schema and the external backup format
 * may evolve (rename, split, re-type a field) without perturbing `domain`. A
 * row only ever carries primitive/transferable data an IndexedDB row or a
 * versioned export can hold.
 */
export interface SnapshotRow {
  id: string;
  endeavourId: string;
  checkInId: string;
  timestamp: string;
  domainId: string;
  segmentStartDate: string;
  n: number;
  raw: number;
  forecast: number | null;
  residual: number | null;
  level: number;
  trend: number;
  consistencyStatus: ConsistencyStatus;
  /** Provenance signature of the calc config this row was derived under. */
  calcVersion?: string;
}

/** Maps a Snapshot domain value to its persistence/export document. */
export function snapshotToRow(snapshot: Snapshot): SnapshotRow {
  return {
    id: snapshot.id,
    endeavourId: snapshot.endeavourId,
    checkInId: snapshot.checkInId,
    timestamp: snapshot.timestamp,
    domainId: snapshot.domainId,
    segmentStartDate: snapshot.segmentStartDate,
    n: snapshot.n,
    raw: snapshot.raw,
    forecast: snapshot.forecast,
    residual: snapshot.residual,
    level: snapshot.level,
    trend: snapshot.trend,
    consistencyStatus: snapshot.consistencyStatus,
  };
}

/** Maps a persisted/exported snapshot row back to a domain value. */
export function rowToSnapshot(row: SnapshotRow): Snapshot {
  return { ...row };
}
