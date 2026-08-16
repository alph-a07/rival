import type { GisTier } from "@/domain/models/Gis";
import type { ConsistencyStatus } from "@/domain/trajectory/ConsistencyTracker";

export const RIVAL_MATH_CONFIG = {
  DEFAULT_QUESTION_SCORE: 0.5,

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

  // Confidence thresholds to derive `EvidenceType`
  STRONG_HEURISTIC_MIN: 0.85,
  WEAK_HEURISTIC_MIN: 0.5,

  // A suggestion only auto-resolves once its accumulated belief support clears
  // this bar AND leads the runner-up by MIN_RESOLVE_MARGIN.
  MIN_RESOLVE_SUPPORT: 0.95,

  // A resolved belief must clear its bar AND lead the runner-up by at least
  // this margin, or the question surfaces as `competing` instead of a
  // fake-confident resolve.
  MIN_RESOLVE_MARGIN: 0.15,

  // A runner-up belief above this floor turns a close call into a `competing`
  // presentation (a soft "also consider X" hint) rather than a confident pick.
  COMPETING_FLOOR: 0.2,

  // A belief must clear this support floor to count as a "live deduction".
  // Below it the signal is effectively noise: it should NOT bypass the
  // hide/collapse/defer/optional relevance cascade or force a prefill on a
  // low-relevance question.
  MIN_SUPPORT_FLOOR: 0.1,

  // Default relevance score for participating questions without a dedicated evaluator, by GIS tier.
  DEFAULT_QUESTION_SCORE_BY_TIER: {
    mandatory: 1,
    recommended: 1,
    optional: 1,
  } as Record<GisTier, number>,

  // A default relevance score's baseWeight floor
  DEFAULT_SCORE_BASE_WEIGHT_FLOOR: 0.35,

  // The max baseWeight any GIS carries
  MAX_GIS_BASE_WEIGHT: 10,

  // Archetype emergence: an archetype surfaces as "emerging" once it satisfies at least this fraction of its conditions
  ARCHETYPE_EMERGE_MIN_FRACTION: 0.5,

  // Value-of-information uncertainty weights, keyed by presentation affordance.
  UNCERTAINTY_SOLE_REMAINING: 0.15,
  UNCERTAINTY_PREFILLED: 0.5,
  UNCERTAINTY_OPEN: 1.0,

  // Presentation thresholds for relevance scores (0..1)
  QUESTION_HIDE_THRESHOLD: 0.3,
  PRESENTATION_COLLAPSED_THRESHOLD: 0.4,
  PRESENTATION_DEFERRED_THRESHOLD: 0.55,
  PRESENTATION_OPTIONAL_THRESHOLD: 0.7,
  PRESENTATION_SUGGESTED_THRESHOLD: 0.75,
};
