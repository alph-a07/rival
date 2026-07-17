import type { GisTier } from "@/domain/models/Gis";

export const RIVAL_MATH_CONFIG = {
  // HoltSmoother Floors
  ALPHA_MIN: 0.15,
  BETA_MIN: 0.1,

  // ConsistencyTracker Adaptive Window
  CONSISTENCY_WINDOW_MIN: 5,
  CONSISTENCY_WINDOW_MAX: 21,

  // ConsistencyTracker Standard Deviation Thresholds
  STEADY_THRESHOLD: 5.0,
  MIXED_THRESHOLD: 10.0,

  // GisEngine Multipliers
  TIER_WEIGHT_MULTIPLIER: {
    mandatory: 1.0,
    recommended: 0.75,
    optional: 0.75,
  } as Record<GisTier, number>,
};
