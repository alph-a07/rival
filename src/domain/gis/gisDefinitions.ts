import type { Gis, GisTier } from "@/domain/models/Gis";

/** Single source of truth for all Growth Indicative Strategies available in the product. */
const GIS_DEFINITIONS: Gis[] = [
  {
    id: "depth_of_focus",
    name: "Depth of Focus",
    icon: "depth_of_focus",
    baseWeight: 10,
    questions: [
      {
        id: "depth_of_focus_q1",
        text: "How deep did you get into it?",
        type: "single-select",
        options: [
          {
            id: "depth_of_focus_distracted",
            label: "Distracted, kept getting pulled away",
            value: 0.0,
          },
          { id: "depth_of_focus_present", label: "Present, but coasting", value: 0.33 },
          { id: "depth_of_focus_focused", label: "Focused, in it", value: 0.66 },
          { id: "depth_of_focus_flow", label: "Total flow, lost track of time", value: 1.0 },
        ],
      },
    ],
  },
  {
    id: "consistency_adherence",
    name: "Consistency Adherence",
    icon: "consistency_adherence",
    baseWeight: 10,
    questions: [
      {
        id: "consistency_adherence_q1",
        text: "Did you hit the schedule you set for yourself?",
        type: "single-select",
        options: [
          { id: "consistency_adherence_missed", label: "Missed it entirely", value: 0.0 },
          { id: "consistency_adherence_partial", label: "Showed up, but off schedule", value: 0.5 },
          { id: "consistency_adherence_onschedule", label: "Right on schedule", value: 1.0 },
        ],
      },
    ],
  },
  {
    id: "challenge_stretch",
    name: "Challenge Stretch",
    icon: "challenge_stretch",
    baseWeight: 9,
    questions: [
      {
        id: "challenge_stretch_q1",
        text: "Where did today land relative to your comfort zone?",
        type: "single-select",
        options: [
          { id: "challenge_stretch_comfort", label: "Comfort zone, nothing new", value: 0.0 },
          {
            id: "challenge_stretch_stretch",
            label: "Right at the edge of what I could do",
            value: 1.0,
          },
          {
            id: "challenge_stretch_overreach",
            label: "Overreached, pushed too far",
            value: 0.25,
          },
        ],
      },
    ],
  },
  {
    id: "decay_check",
    name: "Decay Check",
    icon: "decay_check",
    baseWeight: 9,
    questions: [
      {
        id: "decay_check_q1",
        text: "Any signs this is slipping since your last check-in?",
        type: "single-select",
        options: [
          { id: "decay_check_solid", label: "Solid, no signs of slipping", value: 1.0 },
          { id: "decay_check_wobble", label: "A little wobble, nothing serious", value: 0.5 },
          { id: "decay_check_slipping", label: "Noticeably slipping", value: 0.0 },
        ],
      },
    ],
  },
  {
    id: "progress_realized",
    name: "Progress Realized",
    icon: "progress_realized",
    baseWeight: 8,
    questions: [
      {
        id: "progress_realized_q1",
        text: "How far did this move things forward?",
        type: "single-select",
        options: [
          { id: "progress_realized_none", label: "Nothing moved", value: 0.0 },
          { id: "progress_realized_forward", label: "Moved forward", value: 0.5 },
          {
            id: "progress_realized_milestone",
            label: "Reached a meaningful milestone",
            value: 1.0,
          },
        ],
      },
    ],
  },
  {
    id: "curiosity_pull",
    name: "Curiosity Pull",
    icon: "curiosity_pull",
    baseWeight: 7,
    questions: [
      {
        id: "curiosity_pull_q1",
        text: "What kept you going today?",
        type: "single-select",
        options: [
          { id: "curiosity_pull_obligation", label: "Mostly obligation", value: 0.0 },
          { id: "curiosity_pull_committed", label: "Committed anyway", value: 0.5 },
          { id: "curiosity_pull_wanted", label: "Wanted to", value: 1.0 },
        ],
      },
    ],
  },
  {
    id: "reflection_captured",
    name: "Reflection Captured",
    icon: "reflection_captured",
    baseWeight: 6,
    questions: [
      {
        id: "reflection_captured_q1",
        text: "Did today's session leave you with... (pick all that apply)",
        type: "multi-select",
        options: [
          { id: "reflection_captured_insight", label: "A new insight", value: 0.4 },
          { id: "reflection_captured_lesson", label: "A lesson", value: 0.4 },
          { id: "reflection_captured_nextaction", label: "A clearer next action", value: 0.4 },
        ],
      },
    ],
  },
  {
    id: "time_invested",
    name: "Time Invested",
    icon: "time_invested",
    baseWeight: 5,
    questions: [
      {
        id: "time_invested_q1",
        text: "How long did you spend on it?",
        type: "single-select",
        options: [
          { id: "time_invested_under15", label: "Under 15 min", value: 0.0 },
          { id: "time_invested_15to30", label: "15\u201330 min", value: 0.33 },
          { id: "time_invested_30to60", label: "30\u201360 min", value: 0.66 },
          { id: "time_invested_over60", label: "Over an hour", value: 1.0 },
        ],
      },
    ],
  },
  {
    id: "resilience",
    name: "Resilience",
    icon: "resilience",
    baseWeight: 5,
    questions: [
      {
        id: "resilience_q1",
        text: "How well did you work with the energy you had?",
        type: "single-select",
        options: [
          { id: "resilience_derailed", label: "Let it derail the session", value: 0.0 },
          { id: "resilience_pushed", label: "Pushed through anyway", value: 0.5 },
          { id: "resilience_adapted", label: "Adapted well, showed up regardless", value: 1.0 },
        ],
      },
    ],
  },
  {
    id: "recovery_quality",
    name: "Recovery Quality",
    icon: "recovery_quality",
    baseWeight: 7,
    questions: [
      {
        id: "recovery_quality_q1",
        text: "How prepared did your body and mind feel for today's session?",
        type: "single-select",
        options: [
          { id: "recovery_quality_not_really", label: "Not really", value: 0.0 },
          { id: "recovery_quality_enough", label: "Enough", value: 0.5 },
          { id: "recovery_quality_absolutely", label: "Absolutely", value: 1.0 },
        ],
      },
    ],
  },
  {
    id: "friction_encountered",
    name: "Friction Encountered",
    icon: "friction_encountered",
    baseWeight: 0,
    questions: [
      {
        id: "friction_encountered_q1",
        text: "How much got in your way?",
        type: "single-select",
        options: [
          { id: "friction_encountered_none", label: "No real obstacles today", value: 0.0 },
          {
            id: "friction_encountered_minor",
            label: "Minor friction, worked through it",
            value: 0.5,
          },
          { id: "friction_encountered_major", label: "Major obstacle got in the way", value: 1.0 },
        ],
      },
    ],
  },
];

/** Canonical resolver + sole public access pattern for the GIS content layer. */
export const GisRegistry = {
  /** All GIS definitions available in the product. */
  all(): readonly Gis[] {
    return GIS_DEFINITIONS;
  },

  /** Resolves a gisId -> tier map into the `Map<Gis, GisTier>` */
  resolveActiveSet(gisTierById: Record<string, GisTier>): Map<Gis, GisTier> {
    const byId = new Map(GIS_DEFINITIONS.map((gis) => [gis.id, gis] as const));
    const active = new Map<Gis, GisTier>();
    for (const [gisId, tier] of Object.entries(gisTierById)) {
      const gis = byId.get(gisId);
      if (gis) {
        active.set(gis, tier);
      }
    }
    return active;
  },
};
