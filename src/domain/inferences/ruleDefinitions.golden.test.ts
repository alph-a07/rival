import { describe, expect, test } from "vitest";
import {
  AnswerInferenceEngine,
  ContradictionEngine,
  QuestionEvaluationEngine,
  CheckInArchetypeEngine,
} from "./engine";
import {
  ANSWER_INFERENCE_RULES,
  CONTRADICTION_RULES,
  QUESTION_EVALUATORS,
  CHECK_IN_ARCHETYPES,
} from "./ruleDefinitions";
import type { AnsweredOption, CheckInContext } from "./types";

/** Builds an empty-check-in context (no enabled GIS) for engine-level tests. */
function context(answeredSoFar: AnsweredOption[], selectedDomainId?: string): CheckInContext {
  return { answeredSoFar, enabledGis: [], answerValueByGisId: {}, selectedDomainId };
}

describe("behavioral rules (golden)", () => {
  test("no answers keeps baseline behavior stable", () => {
    const answeredSoFar: AnsweredOption[] = [];

    const contradictions = ContradictionEngine.detect(CONTRADICTION_RULES, context(answeredSoFar));
    const archetypes = CheckInArchetypeEngine.evaluate(CHECK_IN_ARCHETYPES, context(answeredSoFar));
    const evaluatedQuestions = QuestionEvaluationEngine.evaluate(
      QUESTION_EVALUATORS,
      context(answeredSoFar),
    );

    const reflection = evaluatedQuestions.find((q) => q.questionId === "reflection_captured_q1");

    expect(contradictions).toEqual([]);
    expect(archetypes).toEqual([]);
    // No modifiers apply with no answers, and there is no per-question base
    // score anymore — the uniform `DEFAULT_QUESTION_SCORE` (0.5) is the base.
    expect(reflection?.score).toBe(0.5);
    expect(reflection?.explanations).toEqual([]);
  });

  test("flow answer produces stable inference effects", () => {
    const answeredSoFar: AnsweredOption[] = [
      { questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
    ];

    const inferences = AnswerInferenceEngine.evaluate(
      ANSWER_INFERENCE_RULES,
      context(answeredSoFar),
    );

    const golden = inferences.map((item) => ({
      sourceRuleId: item.sourceRuleId,
      inference: item.inference,
      confidence: Number(item.confidence.toFixed(2)),
      evidence: item.evidence,
      explanations: item.explanations.map((e) => ({
        reason: e.reason,
        confidence: Number(e.confidence.toFixed(2)),
        evidence: e.evidence,
      })),
    }));

    expect(golden).toEqual([
      {
        sourceRuleId: "flow_excludes_major_friction",
        inference: {
          type: "exclude_answer",
          questionId: "friction_encountered_q1",
          optionId: "friction_encountered_major",
        },
        confidence: 1,
        evidence: "Definition",
        explanations: [
          {
            reason:
              "Total flow is definitionally incompatible with major friction — friction is what breaks flow.",
            confidence: 1,
            evidence: "Definition",
          },
        ],
      },
      {
        sourceRuleId: "flow_suggests_no_friction",
        inference: {
          type: "suggest_answer",
          questionId: "friction_encountered_q1",
          optionId: "friction_encountered_none",
        },
        confidence: 0.9,
        evidence: "StrongHeuristic",
        explanations: [
          {
            reason:
              "Flow usually implies low friction, and major friction is already ruled out, so no-friction is the strongly likely fit.",
            confidence: 0.9,
            evidence: "StrongHeuristic",
          },
        ],
      },
      {
        sourceRuleId: "flow_suggests_long_session",
        inference: {
          type: "suggest_answer",
          questionId: "time_invested_q1",
          optionId: "time_invested_over60",
        },
        confidence: 0.65,
        evidence: "WeakHeuristic",
        explanations: [
          {
            reason:
              "Total flow usually accompanies a session that ran long enough to lose track of time.",
            confidence: 0.65,
            evidence: "WeakHeuristic",
          },
        ],
      },
      {
        sourceRuleId: "flow_suggests_recovered",
        inference: {
          type: "suggest_answer",
          questionId: "recovery_quality_q1",
          optionId: "recovery_quality_absolutely",
        },
        confidence: 0.62,
        evidence: "WeakHeuristic",
        explanations: [
          {
            reason: "Reaching flow is a sign the session's energy was sufficient.",
            confidence: 0.62,
            evidence: "WeakHeuristic",
          },
        ],
      },
    ]);
  });

  test("recovered + derailed produces canonical contradiction", () => {
    const answeredSoFar: AnsweredOption[] = [
      { questionId: "recovery_quality_q1", optionId: "recovery_quality_absolutely" },
      { questionId: "resilience_q1", optionId: "resilience_derailed" },
    ];

    const contradictions = ContradictionEngine.detect(CONTRADICTION_RULES, context(answeredSoFar));

    const golden = contradictions.map((c) => ({
      id: c.id,
      reason: c.reason,
      severity: c.severity,
      confidence: Number(c.confidence.toFixed(2)),
      evidence: c.evidence,
      explanations: c.explanations.map((e) => ({
        reason: e.reason,
        confidence: Number(e.confidence.toFixed(2)),
        evidence: e.evidence,
      })),
    }));

    expect(golden).toEqual([
      {
        id: "contradiction_recovered_but_derailed",
        reason:
          "Fully recovered yet fully derailed is a surprising pairing; confirm the energy story before treating both as true.",
        severity: "warning",
        confidence: 1,
        evidence: "Definition",
        explanations: [
          {
            reason:
              "Fully recovered yet fully derailed is a surprising pairing; confirm the energy story before treating both as true.",
            confidence: 1,
            evidence: "Definition",
          },
        ],
      },
    ]);
  });

  test("flow + milestone + curiosity keeps reflection question saturated", () => {
    const answeredSoFar: AnsweredOption[] = [
      { questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
      { questionId: "progress_realized_q1", optionId: "progress_realized_milestone" },
      { questionId: "curiosity_pull_q1", optionId: "curiosity_pull_wanted" },
    ];

    const evaluatedQuestions = QuestionEvaluationEngine.evaluate(
      QUESTION_EVALUATORS,
      context(answeredSoFar),
    );

    const reflection = evaluatedQuestions.find((q) => q.questionId === "reflection_captured_q1");

    expect(reflection).toBeDefined();
    expect(reflection?.score).toBeCloseTo(1, 5);
    expect(reflection?.explanations.length).toBe(4);

    const reasons = reflection?.explanations.map((e) => e.reason) ?? [];
    expect(reasons).toEqual([
      "Flow is a rare, highly informative state to learn from.",
      "Milestone moments carry outsized learning value and deserve a reflection prompt.",
      "Flow plus a milestone is an ideal learning moment: process and outcome are both visible.",
      "Intrinsic motivation often produces more subtle learning worth preserving.",
    ]);
  });

  test("flow + stretch + milestone confirms deep_work archetype", () => {
    const answeredSoFar: AnsweredOption[] = [
      { questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" },
      { questionId: "challenge_stretch_q1", optionId: "challenge_stretch_stretch" },
      { questionId: "progress_realized_q1", optionId: "progress_realized_milestone" },
    ];

    const archetypes = CheckInArchetypeEngine.evaluate(CHECK_IN_ARCHETYPES, context(answeredSoFar));

    const deepWork = archetypes.find((a) => a.id === "deep_work");
    expect(deepWork).toBeDefined();
    expect(deepWork).toMatchObject({
      id: "deep_work",
      name: "Deep Work",
      bonus: 0.12,
      confidence: 1,
      evidence: "Definition",
      satisfiedCount: 3,
      totalConditions: 3,
      emergence: "confirmed",
    });
    expect(deepWork?.explanations[0].reason).toBe(
      "Flow, stretch, and a milestone capture the classic deep-work signature.",
    );
  });
});
