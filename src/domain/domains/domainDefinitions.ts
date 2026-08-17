import type { Domain } from "@/domain/models/Domain";

/** Single source of truth for the `Domain`s we support in the product, and their definitions. */
const DOMAIN_DEFINITIONS: Domain[] = [
  {
    id: "building",
    name: "Building",
    definition:
      "Creating something new through deliberate effort, moving toward a finished outcome.",
    icon: "building",
    colorToken: "var(--color-building)",
    gisMap: {
      depth_of_focus: "mandatory",
      challenge_stretch: "mandatory",
      progress_realized: "mandatory",
      time_invested: "recommended",
      curiosity_pull: "recommended",
      consistency_adherence: "optional",
      friction_encountered: "optional",
      reflection_captured: "optional",
      resilience: "optional",
      recovery_quality: "optional",
    },
  },
  {
    id: "structured_learning",
    name: "Structured Learning",
    definition:
      "Working through a defined path — a course, book, curriculum — set by someone else.",
    icon: "structured_learning",
    colorToken: "var(--color-learning)",
    gisMap: {
      depth_of_focus: "mandatory",
      time_invested: "recommended",
      challenge_stretch: "recommended",
      progress_realized: "recommended",
      reflection_captured: "recommended",
      consistency_adherence: "recommended",
      curiosity_pull: "optional",
      friction_encountered: "optional",
      resilience: "optional",
      recovery_quality: "optional",
    },
  },
  {
    id: "exploring",
    name: "Exploring",
    definition: "Open-ended investigation with no fixed destination or curriculum.",
    icon: "exploring",
    colorToken: "var(--color-exploring)",
    gisMap: {
      curiosity_pull: "mandatory",
      depth_of_focus: "recommended",
      time_invested: "recommended",
      challenge_stretch: "recommended",
      reflection_captured: "recommended",
      consistency_adherence: "optional",
      friction_encountered: "optional",
      resilience: "optional",
      recovery_quality: "optional",
    },
  },
  {
    id: "practicing",
    name: "Practicing",
    definition: "Deliberately repeating a skill to improve performance.",
    icon: "practicing",
    colorToken: "var(--color-practicing)",
    gisMap: {
      depth_of_focus: "mandatory",
      challenge_stretch: "mandatory",
      time_invested: "recommended",
      consistency_adherence: "recommended",
      progress_realized: "recommended",
      reflection_captured: "recommended",
      recovery_quality: "recommended",
      curiosity_pull: "optional",
      friction_encountered: "optional",
      resilience: "optional",
    },
  },
  {
    id: "habit",
    name: "Habit",
    definition: "Making a new behavior stick — it isn't automatic yet.",
    icon: "habit",
    colorToken: "var(--color-habit)",
    gisMap: {
      consistency_adherence: "mandatory",
      resilience: "mandatory",
      curiosity_pull: "recommended",
      friction_encountered: "recommended",
      recovery_quality: "recommended",
      depth_of_focus: "optional",
      time_invested: "optional",
      challenge_stretch: "optional",
      reflection_captured: "optional",
      decay_check: "optional",
    },
  },
  {
    id: "maintaining",
    name: "Maintaining",
    definition:
      "Keeping something already established from slipping — it's already automatic, this is just the upkeep.",
    icon: "maintaining",
    colorToken: "var(--color-maintaining)",
    gisMap: {
      consistency_adherence: "mandatory",
      decay_check: "mandatory",
      friction_encountered: "recommended",
      recovery_quality: "recommended",
      depth_of_focus: "optional",
      time_invested: "optional",
      curiosity_pull: "optional",
      reflection_captured: "optional",
      resilience: "optional",
    },
  },
];

/** In-product disambiguator copy for the Habit/Maintaining split surface at domain selection time. */
const HABIT_VS_MAINTAINING_DISAMBIGUATOR =
  "Still building the behavior? \u2192 Habit. Already automatic, just don't want it to slip? \u2192 Maintaining.";

/** Canonical resolver + sole public access pattern for the domain content layer. */
export const DomainRegistry = {
  /** All domain definitions available in the product. */
  all(): readonly Domain[] {
    return DOMAIN_DEFINITIONS;
  },

  /** In-product disambiguator copy for the Habit/Maintaining split. */
  fetchHabitMaintenanceDistinction(): string {
    return HABIT_VS_MAINTAINING_DISAMBIGUATOR;
  },
};
