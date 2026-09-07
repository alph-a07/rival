import type { MicroMood } from "@/domain/models/MicroMood";

/**
 * A lightweight daily mood log (the persisted storage row).
 * It exists to capture a quick "how did today feel" signal.
 */
export interface MicroCheckIn {
  id: string;
  /** Canonical local-calendar day used to enforce one entry per day. */
  day: string;
  timestamp: string; // ISO string
  mood: MicroMood;
}
