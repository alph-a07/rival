import type { GisTier } from "@/domain/models/Gis";
import type { ConsistencyStatus } from "@/domain/trajectory/ConsistencyTracker";

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

  // ConsistencyTracker Standard Deviation Thresholds and Corresponding Statuses
  CONSISTENCY_THRESHOLDS: [
    { limit: 2.5, status: "dialed_in" as ConsistencyStatus },
    { limit: 5.0, status: "on_track" as ConsistencyStatus },
    { limit: 7.5, status: "finding_footing" as ConsistencyStatus },
    { limit: 10.0, status: "uneven_ground" as ConsistencyStatus },
    { limit: 13.0, status: "choppy_waters" as ConsistencyStatus },
    { limit: 17.0, status: "off_course" as ConsistencyStatus },
  ],

  // Trajectory Thresholds
  TRAJECTORY_BASELINE_MIN: 2,
};
