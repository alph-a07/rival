import type { Endeavour, DomainSegment } from "@/domain/models/Endeavour";
import type { GisTier } from "@/domain/models/Gis";

/**
 * A persisted/exported domain-segment document. Structurally mirrors `domain`'s
 * DomainSegment today; the separate row form is the storage seam.
 */
export interface DomainSegmentRow {
  domainId: string;
  /** ISO start of the segment. */
  startDate: string;
  /** ISO end date, or null when the segment is the active one. */
  endDate: string | null;
  /** gisId → tier for the GIS attached to this segment. */
  attachedGis: Record<string, GisTier>;
}

/** The persisted/exported Endeavour document (an aggregate's storage row). */
export interface EndeavourRow {
  id: string;
  name: string;
  domainHistory: DomainSegmentRow[];
}

/** Maps a domain Endeavour to its persistence/export document. */
export function endeavourToRow(endeavour: Endeavour): EndeavourRow {
  return {
    id: endeavour.id,
    name: endeavour.name,
    domainHistory: endeavour.domainHistory.map((s) => ({
      domainId: s.domainId,
      startDate: s.startDate,
      endDate: s.endDate,
      attachedGis: { ...s.attachedGis },
    })),
  };
}

/** Maps a persisted/exported Endeavour row back to a domain value. */
export function rowToEndeavour(row: EndeavourRow): Endeavour {
  return {
    id: row.id,
    name: row.name,
    domainHistory: row.domainHistory.map(toDomainSegment),
  };
}

function toDomainSegment(seg: DomainSegmentRow): DomainSegment {
  return {
    domainId: seg.domainId,
    startDate: seg.startDate,
    endDate: seg.endDate,
    attachedGis: { ...seg.attachedGis },
  };
}
