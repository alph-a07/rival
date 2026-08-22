/** The lightweight, non-GIS daily mood states offered by the micro check-in. */
export type MicroMood = "rough" | "okay" | "good" | "great";

/**
 * A lightweight daily mood log.
 * It exists to capture a quick "how did today feel" signal.
 */
export interface MicroCheckIn {
  id: string;
  timestamp: string; // ISO string
  mood: MicroMood;
}
