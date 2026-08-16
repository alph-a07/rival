import type {
  AnswerInferenceRule,
  ContradictionRule,
  QuestionRelevanceEvaluator,
  CheckInArchetype,
} from "./types";

// -- Answer inference rules --
export const ANSWER_INFERENCE_RULES: AnswerInferenceRule[] = [
  {
    id: "flow_excludes_major_friction",
    conditions: [
      { type: "question_answer", questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
    ],
    effects: [
      {
        type: "exclude_answer",
        questionId: "friction_encountered_q1",
        optionId: "friction_encountered_major",
      },
    ],
    evidence: "Definition",
    reason:
      "Total flow is definitionally incompatible with major friction — friction is what breaks flow.",
  },
  {
    id: "major_friction_excludes_flow",
    conditions: [
      {
        type: "question_answer",
        questionId: "friction_encountered_q1",
        optionId: "friction_encountered_major",
      },
    ],
    effects: [
      { type: "exclude_answer", questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
    ],
    evidence: "Definition",
    reason:
      "Same relationship as flow_excludes_major_friction, mapped from the other question's direction so the relationship holds regardless of sequence.",
  },
  {
    id: "flow_suggests_no_friction",
    conditions: [
      { type: "question_answer", questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
    ],
    effects: [
      {
        type: "suggest_answer",
        questionId: "friction_encountered_q1",
        optionId: "friction_encountered_none",
      },
    ],
    confidence: 0.9,
    reason:
      "Flow usually implies low friction, and major friction is already ruled out, so no-friction is the strongly likely fit.",
  },
  {
    id: "missed_schedule_suggests_decay_wobble",
    conditions: [
      {
        type: "question_answer",
        questionId: "consistency_adherence_q1",
        optionId: "consistency_adherence_missed",
      },
    ],
    effects: [
      { type: "suggest_answer", questionId: "decay_check_q1", optionId: "decay_check_wobble" },
    ],
    confidence: 0.74,
    reason:
      "A missed schedule is a direct precursor to decay and often reflects some wobble before it becomes a larger drift.",
  },
  {
    id: "onschedule_suggests_decay_solid",
    conditions: [
      {
        type: "question_answer",
        questionId: "consistency_adherence_q1",
        optionId: "consistency_adherence_onschedule",
      },
    ],
    effects: [
      { type: "suggest_answer", questionId: "decay_check_q1", optionId: "decay_check_solid" },
    ],
    confidence: 0.72,
    reason:
      "Consistency and decay are inverse indicators; being on schedule lowers the odds the habit is slipping.",
  },
  {
    id: "decay_slipping_suggests_missed_schedule",
    conditions: [
      { type: "question_answer", questionId: "decay_check_q1", optionId: "decay_check_slipping" },
    ],
    effects: [
      {
        type: "suggest_answer",
        questionId: "consistency_adherence_q1",
        optionId: "consistency_adherence_partial",
      },
    ],
    confidence: 0.7,
    reason:
      "If the habit is visibly slipping, an off-schedule cadence is the most likely explanation; a full miss is a stronger claim than one drift signal warrants.",
  },
  {
    id: "decay_solid_suggests_onschedule",
    conditions: [
      { type: "question_answer", questionId: "decay_check_q1", optionId: "decay_check_solid" },
    ],
    effects: [
      {
        type: "suggest_answer",
        questionId: "consistency_adherence_q1",
        optionId: "consistency_adherence_onschedule",
      },
    ],
    confidence: 0.7,
    reason: "If decay is absent, a stable schedule is the straightforward matching signal.",
  },
  {
    id: "flow_suggests_long_session",
    conditions: [
      { type: "question_answer", questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
    ],
    effects: [
      { type: "suggest_answer", questionId: "time_invested_q1", optionId: "time_invested_over60" },
    ],
    confidence: 0.65,
    reason: "Total flow usually accompanies a session that ran long enough to lose track of time.",
  },
  {
    id: "long_session_suggests_flow",
    conditions: [
      { type: "question_answer", questionId: "time_invested_q1", optionId: "time_invested_over60" },
    ],
    effects: [
      { type: "suggest_answer", questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
    ],
    confidence: 0.6,
    reason:
      "A long session is more likely to have reached deep focus, though time alone doesn't guarantee it.",
  },
  {
    id: "overreach_suggests_under_recovered",
    conditions: [
      {
        type: "question_answer",
        questionId: "challenge_stretch_q1",
        optionId: "challenge_stretch_overreach",
      },
    ],
    effects: [
      {
        type: "suggest_answer",
        questionId: "recovery_quality_q1",
        optionId: "recovery_quality_not_really",
      },
    ],
    confidence: 0.68,
    reason: "Pushing past the edge usually reflects a body and mind that weren't fully ready.",
  },
  {
    id: "under_recovered_suggests_overreach",
    conditions: [
      {
        type: "question_answer",
        questionId: "recovery_quality_q1",
        optionId: "recovery_quality_not_really",
      },
    ],
    effects: [
      {
        type: "suggest_answer",
        questionId: "challenge_stretch_q1",
        optionId: "challenge_stretch_overreach",
      },
    ],
    confidence: 0.64,
    reason: "Arriving under-recovered makes it easier to overreach before noticing the limit.",
  },
  {
    id: "overreach_suggests_derailed",
    conditions: [
      {
        type: "question_answer",
        questionId: "challenge_stretch_q1",
        optionId: "challenge_stretch_overreach",
      },
    ],
    effects: [
      { type: "suggest_answer", questionId: "resilience_q1", optionId: "resilience_derailed" },
    ],
    confidence: 0.66,
    reason: "Pushed too far is the most common way a session's energy falls apart.",
  },
  {
    id: "derailed_suggests_overreach",
    conditions: [
      { type: "question_answer", questionId: "resilience_q1", optionId: "resilience_derailed" },
    ],
    effects: [
      {
        type: "suggest_answer",
        questionId: "challenge_stretch_q1",
        optionId: "challenge_stretch_overreach",
      },
    ],
    confidence: 0.62,
    reason: "When energy derails, the stretch was usually set beyond what the day could absorb.",
  },
  {
    id: "milestone_suggests_no_friction",
    conditions: [
      {
        type: "question_answer",
        questionId: "progress_realized_q1",
        optionId: "progress_realized_milestone",
      },
    ],
    effects: [
      {
        type: "suggest_answer",
        questionId: "friction_encountered_q1",
        optionId: "friction_encountered_none",
      },
    ],
    confidence: 0.66,
    reason: "Reaching a milestone usually means the session wasn't dominated by obstacles.",
  },
  {
    id: "no_friction_suggests_milestone",
    conditions: [
      {
        type: "question_answer",
        questionId: "friction_encountered_q1",
        optionId: "friction_encountered_none",
      },
    ],
    effects: [
      {
        type: "suggest_answer",
        questionId: "progress_realized_q1",
        optionId: "progress_realized_milestone",
      },
    ],
    confidence: 0.58,
    reason:
      "A smooth session is more likely to have reached a meaningful point, though effort matters too.",
  },
  {
    id: "fully_recovered_suggests_flow",
    conditions: [
      {
        type: "question_answer",
        questionId: "recovery_quality_q1",
        optionId: "recovery_quality_absolutely",
      },
    ],
    effects: [
      { type: "suggest_answer", questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
    ],
    confidence: 0.6,
    reason: "Feeling fully ready makes sustained deep focus easier to reach.",
  },
  {
    id: "flow_suggests_recovered",
    conditions: [
      { type: "question_answer", questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
    ],
    effects: [
      {
        type: "suggest_answer",
        questionId: "recovery_quality_q1",
        optionId: "recovery_quality_absolutely",
      },
    ],
    confidence: 0.62,
    reason: "Reaching flow is a sign the session's energy was sufficient.",
  },
  {
    id: "intrinsic_suggests_onschedule",
    conditions: [
      {
        type: "question_answer",
        questionId: "curiosity_pull_q1",
        optionId: "curiosity_pull_wanted",
      },
    ],
    effects: [
      {
        type: "suggest_answer",
        questionId: "consistency_adherence_q1",
        optionId: "consistency_adherence_onschedule",
      },
    ],
    confidence: 0.6,
    reason: "Work that pulls you in tends to be the work you keep showing up for.",
  },
  {
    id: "obligation_suggests_partial",
    conditions: [
      {
        type: "question_answer",
        questionId: "curiosity_pull_q1",
        optionId: "curiosity_pull_obligation",
      },
    ],
    effects: [
      {
        type: "suggest_answer",
        questionId: "consistency_adherence_q1",
        optionId: "consistency_adherence_partial",
      },
    ],
    confidence: 0.58,
    reason: "Work done purely from obligation is easier to drift off-schedule.",
  },
];

// -- Question relevance evaluators --
export const QUESTION_EVALUATORS: QuestionRelevanceEvaluator[] = [
  {
    questionId: "reflection_captured_q1",
    modifiers: [
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "progress_realized_q1",
            optionId: "progress_realized_forward",
          },
        ],
        adjustment: 0.1,
        confidence: 0.8,
        reason: "Partial progress is still worth a light reflection prompt.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "progress_realized_q1",
            optionId: "progress_realized_milestone",
          },
        ],
        adjustment: 0.2,
        confidence: 0.9,
        reason: "Milestone moments carry outsized learning value and deserve a reflection prompt.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "depth_of_focus_q1",
            optionId: "depth_of_focus_flow",
          },
        ],
        adjustment: 0.25,
        confidence: 0.9,
        reason: "Flow is a rare, highly informative state to learn from.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "friction_encountered_q1",
            optionId: "friction_encountered_major",
          },
        ],
        adjustment: 0.2,
        confidence: 0.8,
        reason:
          "Major friction is a rich source of learning about what broke or blocked the session.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "friction_encountered_q1",
            optionId: "friction_encountered_minor",
          },
        ],
        adjustment: 0.09,
        confidence: 0.75,
        reason:
          "Minor friction still offers a cheap learning signal if it was resolved successfully.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "time_invested_q1",
            optionId: "time_invested_over60",
          },
        ],
        adjustment: 0.1,
        confidence: 0.7,
        reason: "Long sessions accumulate more information worth reflecting on.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "curiosity_pull_q1",
            optionId: "curiosity_pull_wanted",
          },
        ],
        adjustment: 0.08,
        confidence: 0.6,
        reason: "Intrinsic motivation often produces more subtle learning worth preserving.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "depth_of_focus_q1",
            optionId: "depth_of_focus_flow",
          },
          {
            type: "question_answer",
            questionId: "progress_realized_q1",
            optionId: "progress_realized_milestone",
          },
        ],
        adjustment: 0.18,
        confidence: 0.88,
        reason:
          "Flow plus a milestone is an ideal learning moment: process and outcome are both visible.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "friction_encountered_q1",
            optionId: "friction_encountered_major",
          },
          {
            type: "question_answer",
            questionId: "progress_realized_q1",
            optionId: "progress_realized_none",
          },
        ],
        adjustment: 0.18,
        confidence: 0.78,
        reason:
          "When work stalled and friction is clear, the question of 'what got in the way' is often the most instructive part of the session.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "challenge_stretch_q1",
            optionId: "challenge_stretch_overreach",
          },
          { type: "question_answer", questionId: "resilience_q1", optionId: "resilience_derailed" },
        ],
        adjustment: 0.15,
        confidence: 0.8,
        reason:
          "An overreach that derailed the session is exactly the kind of thing worth examining for the next cycle.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "consistency_adherence_q1",
            optionId: "consistency_adherence_missed",
          },
          {
            type: "question_answer",
            questionId: "decay_check_q1",
            optionId: "decay_check_slipping",
          },
        ],
        adjustment: 0.12,
        confidence: 0.76,
        reason:
          "Missed cadence plus actual slip is a high-value reflection moment before the drift compounds.",
      },
    ],
  },
  {
    questionId: "recovery_quality_q1",
    modifiers: [
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "challenge_stretch_q1",
            optionId: "challenge_stretch_overreach",
          },
        ],
        adjustment: 0.28,
        confidence: 0.9,
        reason:
          "Overreach is exactly the kind of effort that makes recovery quality worth checking.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "challenge_stretch_q1",
            optionId: "challenge_stretch_stretch",
          },
        ],
        adjustment: 0.12,
        confidence: 0.8,
        reason: "A stretch session still benefits from checking whether recovery was adequate.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "challenge_stretch_q1",
            optionId: "challenge_stretch_comfort",
          },
        ],
        adjustment: -0.2,
        confidence: 0.75,
        reason: "Comfort-zone work leaves little recovery signal to investigate.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "friction_encountered_q1",
            optionId: "friction_encountered_major",
          },
        ],
        adjustment: 0.17,
        confidence: 0.75,
        reason:
          "Major friction often points to under-recovery or a mismatch between effort and readiness.",
      },
      {
        conditions: [
          { type: "question_answer", questionId: "resilience_q1", optionId: "resilience_derailed" },
        ],
        adjustment: 0.2,
        confidence: 0.84,
        reason:
          "A derailed session naturally invites checking how well the body and mind were prepared.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "depth_of_focus_q1",
            optionId: "depth_of_focus_flow",
          },
        ],
        adjustment: -0.15,
        confidence: 0.8,
        reason: "Flow is itself evidence that recovery state was sufficient for the session.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "time_invested_q1",
            optionId: "time_invested_over60",
          },
        ],
        adjustment: 0.1,
        confidence: 0.7,
        reason: "Long sessions make stamina and recovery more relevant to the outcome.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "time_invested_q1",
            optionId: "time_invested_under15",
          },
        ],
        adjustment: -0.1,
        confidence: 0.7,
        reason:
          "Very short sessions leave less room for recovery to meaningfully affect the result.",
      },
      {
        conditions: [
          { type: "question_answer", questionId: "decay_check_q1", optionId: "decay_check_solid" },
        ],
        adjustment: -0.1,
        confidence: 0.7,
        reason:
          "Stable overall energy lowers the urgency of interrogating this session's recovery profile.",
      },
    ],
  },
  {
    questionId: "friction_encountered_q1",
    modifiers: [
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "depth_of_focus_q1",
            optionId: "depth_of_focus_distracted",
          },
        ],
        adjustment: 0.25,
        confidence: 0.8,
        reason: "Distracted sessions usually had friction that kept attention from settling.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "progress_realized_q1",
            optionId: "progress_realized_none",
          },
        ],
        adjustment: 0.2,
        confidence: 0.8,
        reason: "No progress often points to friction as the reason momentum never formed.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "consistency_adherence_q1",
            optionId: "consistency_adherence_missed",
          },
        ],
        adjustment: 0.15,
        confidence: 0.7,
        reason:
          "A missed schedule usually means friction or other obstacles blocked the habit from holding.",
      },
      {
        conditions: [
          { type: "question_answer", questionId: "resilience_q1", optionId: "resilience_derailed" },
        ],
        adjustment: 0.18,
        confidence: 0.76,
        reason:
          "A derailed session should usually be traceable to friction or obstacles that got in the way.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "challenge_stretch_q1",
            optionId: "challenge_stretch_overreach",
          },
        ],
        adjustment: 0.1,
        confidence: 0.7,
        reason: "Overreach often creates friction worth identifying after the fact.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "depth_of_focus_q1",
            optionId: "depth_of_focus_flow",
          },
        ],
        adjustment: -0.2,
        confidence: 0.88,
        reason:
          "Flow is the clearest inverse of friction, so this question loses urgency conditions flow is present.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "progress_realized_q1",
            optionId: "progress_realized_milestone",
          },
        ],
        adjustment: -0.15,
        confidence: 0.8,
        reason: "Milestone sessions are less likely to be defined by an obstacle-heavy experience.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "consistency_adherence_q1",
            optionId: "consistency_adherence_onschedule",
          },
        ],
        adjustment: -0.12,
        confidence: 0.72,
        reason: "On-schedule work has less reason to be explained by friction in the first place.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "time_invested_q1",
            optionId: "time_invested_under15",
          },
        ],
        adjustment: -0.08,
        confidence: 0.65,
        reason:
          "Very short sessions leave less time for friction to meaningfully shape the experience.",
      },
    ],
  },
  {
    questionId: "resilience_q1",
    modifiers: [
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "friction_encountered_q1",
            optionId: "friction_encountered_major",
          },
        ],
        adjustment: 0.2,
        confidence: 0.82,
        reason:
          "Major friction makes how you handled your energy directly relevant to the outcome.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "challenge_stretch_q1",
            optionId: "challenge_stretch_stretch",
          },
        ],
        adjustment: 0.12,
        confidence: 0.8,
        reason:
          "A stretch is a real test of whether energy and willpower hold up as the work gets hard.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "challenge_stretch_q1",
            optionId: "challenge_stretch_overreach",
          },
        ],
        adjustment: 0.18,
        confidence: 0.8,
        reason: "Overreach makes the data on energy adaptation especially important.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "challenge_stretch_q1",
            optionId: "challenge_stretch_comfort",
          },
        ],
        adjustment: -0.15,
        confidence: 0.7,
        reason:
          "Comfort-zone work usually requires little adaptation, so resilience is less informative.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "friction_encountered_q1",
            optionId: "friction_encountered_none",
          },
        ],
        adjustment: -0.15,
        confidence: 0.72,
        reason: "No friction lowers the urgency of asking how energy held up through obstacles.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "recovery_quality_q1",
            optionId: "recovery_quality_not_really",
          },
        ],
        adjustment: 0.2,
        confidence: 0.84,
        reason:
          "Under-recovery makes how well you adapted the session's energy an especially relevant question.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "recovery_quality_q1",
            optionId: "recovery_quality_absolutely",
          },
        ],
        adjustment: -0.15,
        confidence: 0.8,
        reason: "Feeling fully recovered makes the resilience question less consequential.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "depth_of_focus_q1",
            optionId: "depth_of_focus_flow",
          },
        ],
        adjustment: -0.15,
        confidence: 0.8,
        reason:
          "Flow usually means the session wasn't derailed by energy; less is left to explain here.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "time_invested_q1",
            optionId: "time_invested_under15",
          },
        ],
        adjustment: -0.1,
        confidence: 0.65,
        reason: "Short sessions leave less room for energy-management dynamics to matter.",
      },
    ],
  },
  {
    questionId: "decay_check_q1",
    modifiers: [
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "consistency_adherence_q1",
            optionId: "consistency_adherence_missed",
          },
        ],
        adjustment: 0.25,
        confidence: 0.88,
        reason: "Missing the planned cadence is the most direct precursor to active decay.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "consistency_adherence_q1",
            optionId: "consistency_adherence_partial",
          },
        ],
        adjustment: 0.12,
        confidence: 0.75,
        reason:
          "Off-schedule behavior is a real warning sign of drift, though less severe than a miss.",
      },
      {
        conditions: [
          {
            type: "question_answer",
            questionId: "consistency_adherence_q1",
            optionId: "consistency_adherence_onschedule",
          },
        ],
        adjustment: -0.2,
        confidence: 0.83,
        reason: "On schedule is a strong negative signal for active decay.",
      },
      {
        conditions: [
          { type: "question_answer", questionId: "resilience_q1", optionId: "resilience_derailed" },
        ],
        adjustment: 0.12,
        confidence: 0.7,
        reason:
          "An energy-derailed session can be an early warning sign that the base habit is slipping.",
      },
      {
        conditions: [{ type: "domain", domainId: "maintaining", attached: true }],
        adjustment: 0.14,
        evidence: "Definition",
        reason:
          "Maintaining is explicitly about preventing a slip, so this question is more relevant in that domain.",
      },
    ],
  },
];

// -- Contradiction rules --
export const CONTRADICTION_RULES: ContradictionRule[] = [
  {
    id: "contradiction_recovered_but_derailed",
    conditions: [
      {
        type: "question_answer",
        questionId: "recovery_quality_q1",
        optionId: "recovery_quality_absolutely",
      },
      { type: "question_answer", questionId: "resilience_q1", optionId: "resilience_derailed" },
    ],
    reason:
      "Fully recovered yet fully derailed is a surprising pairing; confirm the energy story before treating both as true.",
    severity: "warning",
    evidence: "Definition",
  },
  {
    id: "contradiction_under_recovered_but_flow",
    conditions: [
      {
        type: "question_answer",
        questionId: "recovery_quality_q1",
        optionId: "recovery_quality_not_really",
      },
      { type: "question_answer", questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
    ],
    reason: "Total flow despite feeling unprepared is unusual; confirm the energy state.",
    severity: "warning",
    confidence: 0.85,
  },
  {
    id: "contradiction_comfort_but_milestone",
    conditions: [
      {
        type: "question_answer",
        questionId: "challenge_stretch_q1",
        optionId: "challenge_stretch_comfort",
      },
      {
        type: "question_answer",
        questionId: "progress_realized_q1",
        optionId: "progress_realized_milestone",
      },
    ],
    reason: "A milestone while staying entirely in the comfort zone is unusual; confirm.",
    severity: "info",
    confidence: 0.8,
  },
  {
    id: "contradiction_short_session_but_milestone",
    conditions: [
      {
        type: "question_answer",
        questionId: "time_invested_q1",
        optionId: "time_invested_under15",
      },
      {
        type: "question_answer",
        questionId: "progress_realized_q1",
        optionId: "progress_realized_milestone",
      },
    ],
    reason: "A milestone inside fifteen minutes is rare enough to double-check.",
    severity: "info",
    confidence: 0.7,
  },
];

// -- Check-in archetypes --
export const CHECK_IN_ARCHETYPES: CheckInArchetype[] = [
  {
    id: "deep_work",
    name: "Deep Work",
    conditions: [
      { type: "question_answer", questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
      {
        type: "question_answer",
        questionId: "challenge_stretch_q1",
        optionId: "challenge_stretch_stretch",
      },
      {
        type: "question_answer",
        questionId: "progress_realized_q1",
        optionId: "progress_realized_milestone",
      },
    ],
    bonus: 0.12,
    reason: "Flow, stretch, and a milestone capture the classic deep-work signature.",
    evidence: "Definition",
  },
  {
    id: "perseverance",
    name: "Perseverance",
    conditions: [
      {
        type: "question_answer",
        questionId: "friction_encountered_q1",
        optionId: "friction_encountered_major",
      },
      {
        type: "question_answer",
        questionId: "challenge_stretch_q1",
        optionId: "challenge_stretch_stretch",
      },
      {
        type: "question_answer",
        questionId: "progress_realized_q1",
        optionId: "progress_realized_milestone",
      },
    ],
    bonus: 0.1,
    reason:
      "This is the session where the work got hard and the effort still produced something real.",
    confidence: 0.85,
  },
  {
    id: "discipline",
    name: "Discipline",
    conditions: [
      {
        type: "question_answer",
        questionId: "consistency_adherence_q1",
        optionId: "consistency_adherence_onschedule",
      },
      {
        type: "question_answer",
        questionId: "curiosity_pull_q1",
        optionId: "curiosity_pull_obligation",
      },
      {
        type: "question_answer",
        questionId: "progress_realized_q1",
        optionId: "progress_realized_milestone",
      },
    ],
    bonus: 0.1,
    reason: "The habit held, the work was required, and the outcome still mattered.",
    evidence: "Definition",
  },
  {
    id: "curiosity_breakthrough",
    name: "Curiosity Breakthrough",
    conditions: [
      {
        type: "question_answer",
        questionId: "curiosity_pull_q1",
        optionId: "curiosity_pull_wanted",
      },
      { type: "question_answer", questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
      {
        type: "question_answer",
        questionId: "progress_realized_q1",
        optionId: "progress_realized_milestone",
      },
    ],
    bonus: 0.12,
    reason:
      "Intrinsic pull plus flow plus progress is a strong curiosity-driven breakthrough pattern.",
    confidence: 0.86,
  },
  {
    id: "comeback",
    name: "Comeback",
    conditions: [
      {
        type: "question_answer",
        questionId: "recovery_quality_q1",
        optionId: "recovery_quality_not_really",
      },
      {
        type: "question_answer",
        questionId: "friction_encountered_q1",
        optionId: "friction_encountered_major",
      },
      {
        type: "question_answer",
        questionId: "progress_realized_q1",
        optionId: "progress_realized_milestone",
      },
    ],
    bonus: 0.1,
    reason: "Low recovery, high friction, and a milestone is a comeback-type session worth noting.",
    confidence: 0.83,
  },
  {
    id: "consistent_excellence",
    name: "Consistent Excellence",
    conditions: [
      {
        type: "question_answer",
        questionId: "consistency_adherence_q1",
        optionId: "consistency_adherence_onschedule",
      },
      { type: "question_answer", questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
      {
        type: "question_answer",
        questionId: "progress_realized_q1",
        optionId: "progress_realized_milestone",
      },
    ],
    bonus: 0.12,
    reason:
      "On schedule, in flow, and still reaching a milestone is a standout consistency pattern.",
    evidence: "Definition",
  },
  {
    id: "learning_session",
    name: "Learning Session",
    conditions: [
      {
        type: "question_answer",
        questionId: "challenge_stretch_q1",
        optionId: "challenge_stretch_stretch",
      },
      {
        type: "question_answer",
        questionId: "reflection_captured_q1",
        optionId: "reflection_captured_insight",
      },
    ],
    bonus: 0.09,
    reason: "A stretch plus captured learning is a classic learning-session signature.",
    confidence: 0.8,
  },
  {
    id: "momentum",
    name: "Momentum",
    conditions: [
      {
        type: "question_answer",
        questionId: "progress_realized_q1",
        optionId: "progress_realized_milestone",
      },
      {
        type: "question_answer",
        questionId: "reflection_captured_q1",
        optionId: "reflection_captured_nextaction",
      },
    ],
    bonus: 0.08,
    reason: "Milestone plus a next action is the clearest momentum pattern in the system.",
    confidence: 0.8,
  },
  {
    id: "steady_hand",
    name: "Steady Hand",
    conditions: [
      {
        type: "question_answer",
        questionId: "consistency_adherence_q1",
        optionId: "consistency_adherence_onschedule",
      },
      { type: "question_answer", questionId: "decay_check_q1", optionId: "decay_check_solid" },
      {
        type: "question_answer",
        questionId: "friction_encountered_q1",
        optionId: "friction_encountered_none",
      },
    ],
    bonus: 0.1,
    reason:
      "On schedule, no signs of slipping, nothing got in the way — this is what successful maintenance looks like.",
    evidence: "Definition",
  },
  {
    id: "building_the_groove",
    name: "Building the Groove",
    conditions: [
      {
        type: "question_answer",
        questionId: "consistency_adherence_q1",
        optionId: "consistency_adherence_onschedule",
      },
      {
        type: "question_answer",
        questionId: "resilience_q1",
        optionId: "resilience_adapted",
      },
      {
        type: "question_answer",
        questionId: "curiosity_pull_q1",
        optionId: "curiosity_pull_wanted",
      },
    ],
    bonus: 0.1,
    reason: "On schedule, adapted well, and genuinely wanted to — the habit is taking root.",
    confidence: 0.82,
  },
  {
    id: "rabbit_hole",
    name: "Rabbit Hole",
    conditions: [
      {
        type: "question_answer",
        questionId: "curiosity_pull_q1",
        optionId: "curiosity_pull_wanted",
      },
      {
        type: "question_answer",
        questionId: "depth_of_focus_q1",
        optionId: "depth_of_focus_flow",
      },
      {
        type: "question_answer",
        questionId: "time_invested_q1",
        optionId: "time_invested_over60",
      },
    ],
    bonus: 0.1,
    reason:
      "Genuine pull, total absorption, lost track of time — exploring doesn't need a milestone to be a win.",
    confidence: 0.8,
  },
];
