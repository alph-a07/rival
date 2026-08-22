/** The lightweight, non-GIS daily mood states offered by the micro check-in. */
export type MicroMood = "rough" | "okay" | "good" | "great";

/**
 * A lightweight daily mood log. Unlike a full CheckIn/Snapshot it carries no
 * domain scoring — it exists to capture a quick "how did today feel" signal
 * that feeds the Biography breadcrumb and enforces a once-a-day cap.
 */
export interface MicroCheckIn {
  id: string;
  timestamp: string; // ISO string
  mood: MicroMood;
}
