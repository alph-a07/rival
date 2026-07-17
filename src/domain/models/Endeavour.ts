export interface DomainSegment {
  domainId: string;
  startDate: string; // ISO string
  endDate: string | null; // null = active segment
  attachedGisIds: string[];
}

/**
 * An endeavour represents a specific goal or objective that a user wants to
 * achieve.
 */
export interface Endeavour {
  id: string;
  name: string;
  domainHistory: DomainSegment[];
}
