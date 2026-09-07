import type { CheckIn } from "@/domain/models/CheckIn";
import type { CheckInResponse } from "@/domain/models/CheckIn";

/**
 * The persisted/exported document for a single completed check-in.
 *
 * Structurally mirrors the `domain` CheckIn today; the separate type is the
 * storage + external-format seam so a schema/version change never rewrites the
 * pure domain model.
 */
export interface CheckInRow {
  id: string;
  endeavourId: string;
  timestamp: string;
  responses: CheckInResponse[];
  rawScore: number;
}

/** Maps a domain CheckIn to its persistence/export document. */
export function checkInToRow(checkIn: CheckIn): CheckInRow {
  return {
    id: checkIn.id,
    endeavourId: checkIn.endeavourId,
    timestamp: checkIn.timestamp,
    responses: checkIn.responses.map((r) => ({ ...r, optionIds: [...r.optionIds] })),
    rawScore: checkIn.rawScore,
  };
}

/** Maps a persisted/exported check-in row back to a domain value. */
export function rowToCheckIn(row: CheckInRow): CheckIn {
  return {
    id: row.id,
    endeavourId: row.endeavourId,
    timestamp: row.timestamp,
    responses: row.responses.map((r) => ({ ...r, optionIds: [...r.optionIds] })),
    rawScore: row.rawScore,
  };
}
