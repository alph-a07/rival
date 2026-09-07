/**
 * The lightweight, non-GIS daily mood states offered by the micro check-in,
 * plus the authored value list (single source for pickers and import guards).
 */
export const MICRO_MOODS = ["rough", "okay", "good", "great"] as const;

export type MicroMood = (typeof MICRO_MOODS)[number];
