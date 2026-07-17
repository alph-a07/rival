export interface SynergyModifier {
  gisA: string;
  gisB: string;
  multiplier: number;
}

/**
 * Sparse override table of pairwise GIS multipliers. Any pair not explicitly
 * defined here defaults to a neutral 1.0x multiplier.
 */
export const SYNERGY_MODIFIERS: SynergyModifier[] = [
  // Example for future implementation:
  // { gisA: "depth_of_focus", gisB: "sleep_quality", multiplier: 1.15 }
];
