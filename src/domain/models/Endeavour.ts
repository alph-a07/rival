import type { GisTier } from "./Gis";

export interface DomainSegment {
  domainId: string;
  startDate: string; // ISO string
  endDate: string | null; // null = active segment
  /** The GIS attached to this segment with their tiers, keyed by gisId. */
  attachedGis: Record<string, GisTier>;
}

/** An endeavour represents a specific goal or objective that a user wants to achieve. */
export interface Endeavour {
  id: string;
  name: string;
  domainHistory: DomainSegment[];
}

/** The currently-active segment (endDate null) of an endeavour, if any. */
export function activeSegment(endeavour: Endeavour): DomainSegment | undefined {
  return endeavour.domainHistory.find((s) => s.endDate === null);
}
