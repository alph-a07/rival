import type { ConsistencyStatus } from "@/domain/trajectory/consistencyTracker";

/** A Snapshot is the data model that stores the results of all the mathematical calculations for a single user check-in. */
export interface Snapshot {
  id: string;
  endeavourId: string;
  checkInId: string;
  timestamp: string;
  domainId: string;
  segmentStartDate: string;
  n: number; // Check-in count for this domain segment (1-based)
  raw: number; // Raw score from the check-in
  forecast: number | null; // Forecasted score (Holt's method)
  residual: number | null; // Residual error (Holt's method)
  level: number; // Smoothed level (Holt's method)
  trend: number; // Smoothed trend (Holt's method)
  consistencyStatus: ConsistencyStatus;
}
