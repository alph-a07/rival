export interface AttachmentRestriction {
  gisA: string;
  gisB: string;
  reason: string; // Surfaced to the UI to explain why the GIS is disabled
}

/**
 * Blocklist of mutually exclusive GIS combinations. Evaluated at the
 * Domain/Endeavour setup layer to prevent incompatible tracking.
 */
export const ATTACHMENT_RESTRICTIONS: AttachmentRestriction[] = [
  // Example for future implementation:
  // {
  //   gisA: "strict_keto",
  //   gisB: "general_diet",
  //   reason: "Keto tracking and General Diet tracking conflict with each other."
  // }
];
