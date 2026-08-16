import { describe, expect, test } from "vitest";
import { BeliefEngine } from "./engine";
import { deriveEvidence } from "./utils";
import type { EvidenceType, EvaluatedAnswerInference } from "./types";

function inf(
  ruleId: string,
  questionId: string,
  optionId: string,
  type: "suggest_answer" | "exclude_answer",
  confidence: number,
  evidence?: EvidenceType,
): EvaluatedAnswerInference {
  return {
    inference: { type, questionId, optionId },
    confidence,
    sourceRuleId: ruleId,
    evidence: evidence ?? deriveEvidence(confidence),
    explanations: [],
  };
}

describe("BeliefEngine", () => {
  test("two agreeing suggestions compound via noisy-OR", () => {
    const beliefs = BeliefEngine.evaluate([
      inf("a", "q1", "o1", "suggest_answer", 0.9),
      inf("b", "q1", "o1", "suggest_answer", 0.9),
    ]).get("q1")!;

    const o1 = beliefs.beliefs.find((b) => b.optionId === "o1")!;
    // Support is now the raw confidence (no tier scaling), compounded by noisy-OR.
    const expected = 1 - (1 - 0.9) * (1 - 0.9);
    expect(o1.support).toBeCloseTo(expected, 5);
    expect(o1.contributingRuleIds).toEqual(["a", "b"]);
    expect(o1.evidence).toBe("StrongHeuristic");
  });

  test("disagreeing suggestions both survive in the same belief map", () => {
    const beliefs = BeliefEngine.evaluate([
      inf("overreach", "recovery_q1", "not_really", "suggest_answer", 0.68),
      inf("flow", "recovery_q1", "absolutely", "suggest_answer", 0.62),
    ]).get("recovery_q1")!;

    const optionIds = beliefs.beliefs.map((b) => b.optionId).sort();
    expect(optionIds).toEqual(["absolutely", "not_really"]);
  });

  test("an exclusion hard-zeros the option and drops its suggestion belief", () => {
    const beliefs = BeliefEngine.evaluate([
      inf("a", "q1", "o1", "suggest_answer", 0.9),
      inf("x", "q1", "o1", "exclude_answer", 1, "Definition"),
    ]).get("q1")!;

    expect(beliefs.excludedOptionIds.has("o1")).toBe(true);
    expect(beliefs.beliefs.find((b) => b.optionId === "o1")).toBeUndefined();
  });

  test("exclusion wins regardless of stream order (even a same-tier suggestion after it)", () => {
    const beliefs = BeliefEngine.evaluate([
      inf("excl", "q1", "o1", "exclude_answer", 1, "Definition"),
      inf("sugg", "q1", "o1", "suggest_answer", 1, "Definition"),
    ]).get("q1")!;

    expect(beliefs.excludedOptionIds.has("o1")).toBe(true);
    expect(beliefs.beliefs.find((b) => b.optionId === "o1")).toBeUndefined();
  });

  test("keeps the strongest-tier evidence as the belief's dominant tier", () => {
    const beliefs = BeliefEngine.evaluate([
      inf("a", "q1", "o1", "suggest_answer", 0.4), // derives Hypothesis
      inf("b", "q1", "o1", "suggest_answer", 0.9), // derives StrongHeuristic
    ]).get("q1")!;

    const o1 = beliefs.beliefs.find((b) => b.optionId === "o1")!;
    expect(o1.evidence).toBe("StrongHeuristic");
    const expected = 1 - (1 - 0.4) * (1 - 0.9);
    expect(o1.support).toBeCloseTo(expected, 5);
  });
});
