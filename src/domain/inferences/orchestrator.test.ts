import { describe, expect, test } from "vitest";
import { GisRegistry } from "@/domain/gis/gisDefinitions";
import { RIVAL_MATH_CONFIG } from "@/domain/config/tuningConstants";
import type { GisTier } from "@/domain/models/Gis";
import { evaluateCheckIn } from "./orchestrator";
import { PresentationPolicy } from "./PresentationPolicy";
import type { AnsweredOption, CheckInContext, CheckInRuleSets, CheckInArchetype } from "./types";

const VALID_PRESENTATION_STATES = [
  "hidden",
  "collapsed",
  "deferred",
  "optional",
  "active",
  "suggested",
  "resolved",
  "competing",
  "clarify",
];

/** The GIS participating in a typical "building"-style check-in. */
const BUILDING_GIS_IDS = [
  "depth_of_focus",
  "challenge_stretch",
  "progress_realized",
  "time_invested",
  "curiosity_pull",
  "consistency_adherence",
  "friction_encountered",
  "reflection_captured",
  "resilience",
  "recovery_quality",
];

const BUILDING_TIER_BY_GIS: Record<string, GisTier> = {
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
};

function buildContext(
  answeredSoFar: AnsweredOption[],
  enabledGisIds: string[] = BUILDING_GIS_IDS,
  selectedDomainId: string = "building",
): CheckInContext {
  const enabledGis = GisRegistry.all().filter((gis) => enabledGisIds.includes(gis.id));
  const gisTierById: Record<string, GisTier> = {};
  for (const id of enabledGisIds) {
    gisTierById[id] = BUILDING_TIER_BY_GIS[id] ?? "optional";
  }
  return { answeredSoFar, enabledGis, gisTierById, answerValueByGisId: {}, selectedDomainId };
}

describe("evaluateCheckIn", () => {
  test("no answers produces a stable, complete structural baseline", () => {
    const understanding = evaluateCheckIn(buildContext([]));

    expect(understanding.questionIds).toHaveLength(BUILDING_GIS_IDS.length);
    expect(understanding.questions).toHaveLength(BUILDING_GIS_IDS.length);

    // Every participating question gets a valid presentation state.
    for (const question of understanding.questions) {
      expect(VALID_PRESENTATION_STATES).toContain(question.presentation.state);
      expect(question.presentation.disabledOptionIds).toBeInstanceOf(Set);
    }

    // No reasoning yet: no inferences, contradictions, archetypes.
    expect(understanding.inferences).toEqual([]);
    expect(understanding.contradictions).toEqual([]);
    expect(understanding.archetypes).toEqual([]);

    // Every question is still remaining and ranked 1..N.
    expect(understanding.remainingQuestions).toHaveLength(BUILDING_GIS_IDS.length);
    expect(understanding.remainingQuestions.map((q) => q.order)).toEqual(
      Array.from({ length: BUILDING_GIS_IDS.length }, (_, i) => i + 1),
    );
  });

  test("scopes reasoning to the participating GIS", () => {
    // Friction is not participating here, so flow must NOT produce inferences
    // that target friction, and friction must not appear in the understanding.
    const participating = ["depth_of_focus", "challenge_stretch", "progress_realized"];
    const understanding = evaluateCheckIn(
      buildContext(
        [{ questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" }],
        participating,
      ),
    );

    expect(understanding.questionIds).toEqual([
      "depth_of_focus_q1",
      "challenge_stretch_q1",
      "progress_realized_q1",
    ]);
    expect(understanding.questionIds).not.toContain("friction_encountered_q1");

    // The flow -> no-friction suggestion and flow -> exclude-major-friction
    // deductions both target a non-participating question, so they are dropped.
    expect(understanding.inferences).toEqual([]);
  });

  test("flow answer produces a scoped exclusion on participating friction", () => {
    const understanding = evaluateCheckIn(
      buildContext([{ questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" }]),
    );

    // The exclusion deduction survives scoping (friction is participating).
    const exclude = understanding.inferences.find(
      (i) =>
        i.inference.type === "exclude_answer" &&
        i.inference.questionId === "friction_encountered_q1" &&
        i.inference.optionId === "friction_encountered_major",
    );
    expect(exclude).toBeDefined();

    // The answered question is resolved and its exclusion is surfaced on the
    // friction question's presentation.
    const focus = understanding.questions.find((q) => q.questionId === "depth_of_focus_q1");
    const friction = understanding.questions.find(
      (q) => q.questionId === "friction_encountered_q1",
    );
    expect(focus?.presentation.state).toBe("resolved");
    expect(friction?.presentation.disabledOptionIds.has("friction_encountered_major")).toBe(true);

    // A live deduction keeps the question visible: even though flow collapses
    // friction's relevance score below the hide threshold, the exclusion + hint
    // must not be hidden — it is surfaced as an active prefill instead.
    expect(friction?.presentation.state).not.toBe("hidden");
    expect(friction?.presentation.prefilledOptionIds).toEqual(["friction_encountered_none"]);

    // The answered question is no longer in the remaining list.
    expect(understanding.remainingQuestions.map((q) => q.questionId)).not.toContain(
      "depth_of_focus_q1",
    );
  });

  test("a question with exactly one valid option exposes soleRemainingOptionId", () => {
    // Exclude two of consistency's three options (missed, partial), leaving only
    // "onschedule". The presentation collapses to a confirm rather than a list.
    const participating = ["depth_of_focus", "consistency_adherence"];
    const ruleSets: CheckInRuleSets = {
      answerInferenceRules: [
        {
          id: "custom_exclude_two",
          conditions: [
            {
              type: "question_answer",
              questionId: "depth_of_focus_q1",
              optionId: "depth_of_focus_flow",
            },
          ],
          effects: [
            {
              type: "exclude_answer",
              questionId: "consistency_adherence_q1",
              optionId: "consistency_adherence_missed",
            },
            {
              type: "exclude_answer",
              questionId: "consistency_adherence_q1",
              optionId: "consistency_adherence_partial",
            },
          ],
          evidence: "Definition",
          reason: "custom exclusions",
        },
      ],
    };

    const understanding = evaluateCheckIn(
      buildContext(
        [{ questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" }],
        participating,
      ),
      ruleSets,
    );
    const consistency = understanding.questions.find(
      (q) => q.questionId === "consistency_adherence_q1",
    );

    expect(consistency?.presentation.soleRemainingOptionId).toBe(
      "consistency_adherence_onschedule",
    );
    // A live deduction (the exclusions) keeps the question visible.
    expect(consistency?.presentation.state).toBe("active");
  });

  test("surfaces a competing state when two signals disagree with no clear winner", () => {
    // overreach -> under-recovered (0.68 StrongHeuristic -> 0.476) and
    // flow -> fully-recovered (0.62 WeakHeuristic -> 0.248) both target the
    // same recovery question with different options. Neither clears the
    // StrongHeuristic resolve bar and the runner-up clears the competing floor,
    // so recovery is presented as honestly torn rather than a confident pick.
    const participating = ["depth_of_focus", "challenge_stretch", "recovery_quality"];
    const understanding = evaluateCheckIn(
      buildContext(
        [
          { questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
          { questionId: "challenge_stretch_q1", optionId: "challenge_stretch_overreach" },
        ],
        participating,
      ),
    );

    const recovery = understanding.questions.find((q) => q.questionId === "recovery_quality_q1");
    expect(recovery?.presentation.state).toBe("competing");
    expect(recovery?.presentation.prefilledOptionIds).toEqual(["recovery_quality_not_really"]);
    expect(recovery?.presentation.competingOptionIds).toEqual(["recovery_quality_absolutely"]);
  });

  test("two agreeing 0.9-confidence signals compound and can resolve together", () => {
    // Two independent rules agree on friction -> none: neither alone (0.9)
    // clears the resolve bar, but noisy-OR compounds them to 0.99 >= 0.95,
    // resolving the question on the shared belief.
    const ruleSets: CheckInRuleSets = {
      answerInferenceRules: [
        {
          id: "a_suggests_no_friction",
          conditions: [
            {
              type: "question_answer",
              questionId: "depth_of_focus_q1",
              optionId: "depth_of_focus_flow",
            },
          ],
          effects: [
            {
              type: "suggest_answer",
              questionId: "friction_encountered_q1",
              optionId: "friction_encountered_none",
            },
          ],
          confidence: 0.9,
          reason: "independent signal A",
        },
        {
          id: "b_suggests_no_friction",
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
              questionId: "friction_encountered_q1",
              optionId: "friction_encountered_none",
            },
          ],
          confidence: 0.9,
          reason: "independent signal B",
        },
      ],
    };

    const participating = ["depth_of_focus", "challenge_stretch", "friction_encountered"];
    const understanding = evaluateCheckIn(
      buildContext(
        [
          { questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
          { questionId: "challenge_stretch_q1", optionId: "challenge_stretch_overreach" },
        ],
        participating,
      ),
      ruleSets,
    );

    const friction = understanding.questions.find(
      (q) => q.questionId === "friction_encountered_q1",
    );
    expect(friction?.presentation.state).toBe("resolved");
    expect(friction?.presentation.prefilledOptionIds).toEqual(["friction_encountered_none"]);
  });

  test("recognizes a deep-work archetype when its conditions are participating", () => {
    const participating = ["depth_of_focus", "challenge_stretch", "progress_realized"];
    const understanding = evaluateCheckIn(
      buildContext(
        [
          { questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
          { questionId: "challenge_stretch_q1", optionId: "challenge_stretch_stretch" },
          { questionId: "progress_realized_q1", optionId: "progress_realized_milestone" },
        ],
        participating,
      ),
    );

    expect(understanding.archetypes.map((a) => a.id)).toContain("deep_work");
    expect(understanding.remainingQuestions).toEqual([]);
  });

  test("tier defaults drive presentation; states match the tier-scored oracle", () => {
    const understanding = evaluateCheckIn(buildContext([]));

    const tierScoreFor = (gisId: string) =>
      RIVAL_MATH_CONFIG.DEFAULT_QUESTION_SCORE_BY_TIER[BUILDING_TIER_BY_GIS[gisId] ?? "optional"];
    const expectedStateFor = (questionId: string, gisId: string) =>
      PresentationPolicy.deriveQuestionPresentation(
        false,
        { questionId, beliefs: [], excludedOptionIds: new Set() },
        undefined,
        tierScoreFor(gisId),
      ).state;

    const depth = understanding.questions.find((q) => q.questionId === "depth_of_focus_q1");
    const consistency = understanding.questions.find(
      (q) => q.questionId === "consistency_adherence_q1",
    );

    expect(depth?.presentation.state).toBe(expectedStateFor("depth_of_focus_q1", "depth_of_focus"));
    expect(consistency?.presentation.state).toBe(
      expectedStateFor("consistency_adherence_q1", "consistency_adherence"),
    );
  });

  test("a high-confidence Definition suggestion auto-resolves (evidence-aware)", () => {
    const participating = ["depth_of_focus", "friction_encountered"];
    const ruleSets: CheckInRuleSets = {
      answerInferenceRules: [
        {
          id: "custom_resolve_no_friction",
          conditions: [
            {
              type: "question_answer",
              questionId: "depth_of_focus_q1",
              optionId: "depth_of_focus_flow",
            },
          ],
          effects: [
            {
              type: "suggest_answer",
              questionId: "friction_encountered_q1",
              optionId: "friction_encountered_none",
            },
          ],
          evidence: "Definition",
          reason: "custom definitional link",
        },
      ],
    };

    const understanding = evaluateCheckIn(
      buildContext(
        [{ questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" }],
        participating,
      ),
      ruleSets,
    );
    const friction = understanding.questions.find(
      (q) => q.questionId === "friction_encountered_q1",
    );

    // Definition evidence clears the auto-resolve bar at 0.9 confidence.
    expect(friction?.presentation.state).toBe("resolved");
    expect(friction?.presentation.prefilledOptionIds).toEqual(["friction_encountered_none"]);
  });

  test("a low-confidence speculative suggestion does NOT auto-resolve", () => {
    const participating = ["depth_of_focus", "friction_encountered"];
    const ruleSets: CheckInRuleSets = {
      answerInferenceRules: [
        {
          id: "custom_hypothesis_no_friction",
          conditions: [
            {
              type: "question_answer",
              questionId: "depth_of_focus_q1",
              optionId: "depth_of_focus_flow",
            },
          ],
          effects: [
            {
              type: "suggest_answer",
              questionId: "friction_encountered_q1",
              optionId: "friction_encountered_none",
            },
          ],
          confidence: 0.4,
          reason: "speculative link",
        },
      ],
    };

    const understanding = evaluateCheckIn(
      buildContext(
        [{ questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" }],
        participating,
      ),
      ruleSets,
    );
    const friction = understanding.questions.find(
      (q) => q.questionId === "friction_encountered_q1",
    );

    // 0.4 (< resolve bar 0.95) stays a visible prefill only; a lone heuristic
    // never auto-resolves regardless of its derived tier.
    expect(friction?.presentation.state).not.toBe("resolved");
    expect(friction?.presentation.prefilledOptionIds).toEqual(["friction_encountered_none"]);
  });

  test("surfaces an emerging archetype when partially satisfied", () => {
    // deep_work = flow + stretch + milestone. Satisfy 2 of 3 (flow + stretch).
    const participating = ["depth_of_focus", "challenge_stretch", "progress_realized"];
    const understanding = evaluateCheckIn(
      buildContext(
        [
          { questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
          { questionId: "challenge_stretch_q1", optionId: "challenge_stretch_stretch" },
        ],
        participating,
      ),
    );

    const deepWork = understanding.archetypes.find((a) => a.id === "deep_work");
    expect(deepWork).toBeDefined();
    expect(deepWork?.emergence).toBe("emerging");
    expect(deepWork?.satisfiedCount).toBe(2);
    expect(deepWork?.totalConditions).toBe(3);
  });

  test("a lone signal does not surface an archetype", () => {
    const participating = ["depth_of_focus", "challenge_stretch", "progress_realized"];
    const understanding = evaluateCheckIn(
      buildContext(
        [{ questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" }],
        participating,
      ),
    );

    expect(understanding.archetypes).toEqual([]);
  });

  test("emerging archetype pulls its confirming question forward", () => {
    // Isolate the pull with a single custom archetype so no competing archetype
    // (e.g. learning_session) also pulls reflection and confounds the ranking.
    const customArchetype: CheckInArchetype = {
      id: "custom_deep_work",
      name: "Deep Work",
      conditions: [
        {
          type: "question_answer",
          questionId: "depth_of_focus_q1",
          optionId: "depth_of_focus_flow",
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
      bonus: 0.2,
      reason: "custom deep-work signature",
      evidence: "Definition",
    };
    const ruleSets: CheckInRuleSets = { sessionArchetypes: [customArchetype] };

    const understanding = evaluateCheckIn(
      buildContext([
        { questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
        { questionId: "challenge_stretch_q1", optionId: "challenge_stretch_stretch" },
      ]),
      ruleSets,
    );

    const deepWork = understanding.archetypes.find((a) => a.id === "custom_deep_work");
    expect(deepWork?.emergence).toBe("emerging");

    const remaining = understanding.remainingQuestions;
    const progress = remaining.find((q) => q.questionId === "progress_realized_q1");
    expect(progress).toBeDefined();
    expect(progress?.archetypePull).toBeGreaterThan(0);

    const indexOf = (id: string) => remaining.findIndex((q) => q.questionId === id);
    expect(indexOf("progress_realized_q1")).toBeLessThan(indexOf("reflection_captured_q1"));
  });

  test("auto-derives mutual-exclusion contradictions for same-question options", () => {
    const participating = ["challenge_stretch"];
    const understanding = evaluateCheckIn(
      buildContext(
        [
          { questionId: "challenge_stretch_q1", optionId: "challenge_stretch_comfort" },
          { questionId: "challenge_stretch_q1", optionId: "challenge_stretch_overreach" },
        ],
        participating,
      ),
    );

    const mutual = understanding.contradictions.filter((c) =>
      c.id.startsWith("mutual_exclusion_challenge_stretch_q1_"),
    );
    expect(mutual.length).toBeGreaterThan(0);
    expect(mutual[0].severity).toBe("info");
  });

  test("surfaces a clarification and marks the re-ask question", () => {
    const participating = ["recovery_quality", "resilience"];
    const understanding = evaluateCheckIn(
      buildContext(
        [
          { questionId: "recovery_quality_q1", optionId: "recovery_quality_absolutely" },
          { questionId: "resilience_q1", optionId: "resilience_derailed" },
        ],
        participating,
      ),
    );

    const clarification = understanding.clarifications.find(
      (c) => c.id === "contradiction_recovered_but_derailed",
    );
    expect(clarification).toBeDefined();
    expect(clarification?.conflictingAnswers).toHaveLength(2);
    // The most recently given answer (resilience) is the re-ask target.
    expect(clarification?.reaskQuestionId).toBe("resilience_q1");

    const resilience = understanding.questions.find((q) => q.questionId === "resilience_q1");
    expect(resilience?.presentation.state).toBe("clarify");
  });

  test("is deterministic and idempotent", () => {
    const answeredSoFar: AnsweredOption[] = [
      { questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
    ];
    const context = buildContext(answeredSoFar);

    const first = evaluateCheckIn(context);
    const second = evaluateCheckIn(context);

    expect(second.questions).toEqual(first.questions);
    expect(second.remainingQuestions).toEqual(first.remainingQuestions);
    expect(second.inferences).toEqual(first.inferences);
    expect(second.contradictions).toEqual(first.contradictions);
    expect(second.archetypes).toEqual(first.archetypes);
  });
});
