import { RIVAL_MATH_CONFIG } from "@/domain/config/tuningConstants";
import type { Gis } from "@/domain/models/Gis";
import type { Response } from "@/data/schema/CheckIn";
import { ConditionEvaluator } from "./ConditionEvaluator";
import type {
  AnsweredOption,
  CheckInContext,
  Condition,
  ContradictionRule,
  EvidenceType,
  ExplanationRecord,
} from "./types";
import type { EvaluatorLookups } from "./ConditionEvaluator";

/** Clamps a relevance/confidence/support score to the normalized [0, 1] range. */
export function clampScore(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// -- Evidence resolution: one confidence dial, tier derived from it --

/** Derives a heuristic evidence tier from confidence, in fixed non-overlapping bands. */
export function deriveEvidence(confidence: number): EvidenceType {
  if (confidence >= RIVAL_MATH_CONFIG.STRONG_HEURISTIC_MIN) {
    return "StrongHeuristic";
  }
  if (confidence >= RIVAL_MATH_CONFIG.WEAK_HEURISTIC_MIN) {
    return "WeakHeuristic";
  }
  return "Hypothesis";
}

/** Resolves a rule/modifier to its effective confidence and derived tier; `Definition` is certain (1.0). */
export function resolveEvidence(rule: { evidence: "Definition" } | { confidence: number }): {
  confidence: number;
  evidence: EvidenceType;
} {
  if ("evidence" in rule) {
    return { confidence: 1, evidence: "Definition" };
  }
  const c = clampScore(rule.confidence);
  return { confidence: c, evidence: deriveEvidence(c) };
}

// -- Explainability helpers --

/** Builds a canonical explanation record, clamping confidence to [0, 1]. */
export function buildExplanation(
  reason: string,
  confidence: number,
  evidence: EvidenceType,
): ExplanationRecord {
  return { reason, confidence: clampScore(confidence), evidence };
}

/**
 * Orders explanation records deterministically — by descending confidence, then
 * by reason (alphabetical) to break ties. Keeps relevance/explanation output
 * stable regardless of rule authoring order.
 */
export function sortExplanations(explanations: ExplanationRecord[]): ExplanationRecord[] {
  return [...explanations].sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    return a.reason.localeCompare(b.reason);
  });
}

// -- Structural contradiction derivation --

/**
 * Derives a mutual-exclusion contradiction for every pair of options in each
 * participating single-select question. This generalizes the former
 * hand-authored same-question contradiction to all single-select questions,
 * derived from option structure rather than written rule-by-rule.
 */
export function generateMutualExclusionContradictions(enabledGis: Gis[]): ContradictionRule[] {
  const rules: ContradictionRule[] = [];
  for (const gis of enabledGis) {
    for (const question of gis.questions) {
      if (question.type === "multi-select") {
        continue;
      }
      const options = question.options;
      for (let i = 0; i < options.length; i++) {
        for (let j = i + 1; j < options.length; j++) {
          rules.push({
            id: `mutual_exclusion_${question.id}_${options[i].id}_${options[j].id}`,
            conditions: [
              { type: "question_answer", questionId: question.id, optionId: options[i].id },
              { type: "question_answer", questionId: question.id, optionId: options[j].id },
            ],
            reason: `"${options[i].label}" and "${options[j].label}" are mutually exclusive choices of the same question.`,
            severity: "info",
            evidence: "Definition",
          });
        }
      }
    }
  }
  return rules;
}

// -- Input bridging --

/**
 * Renders which of a rule's conditions held in a compact, human-readable form,
 * for logging the causal *why* behind a decision. Returns an empty string when
 * nothing matched so callers can omit the clause cleanly.
 *
 * This reads conditions via the single source of truth (`ConditionEvaluator`) —
 * it never re-implements condition semantics, it only formats the outcome.
 */
export function matchedConditions(
  conditions: readonly Condition[],
  context: CheckInContext,
  lookups?: EvaluatorLookups,
): string {
  const held = conditions.filter((condition) =>
    ConditionEvaluator.holds(condition, context, lookups),
  );
  if (held.length === 0) {
    return "";
  }
  const parts = held.map((c) => {
    switch (c.type) {
      case "question_answer":
        return `${c.questionId}=${c.optionId}`;
      case "gis":
        return `gis:${c.gisId}${c.attached ? "" : "!="}`;
      case "weight":
        return `weight:${c.gisId}${c.comparator}${c.value}`;
      case "domain":
        return `domain:${c.domainId}${c.attached ? "" : "!="}`;
    }
  });
  return ` [caused by: ${parts.join(", ")}]`;
}

/**
 * Flattens persisted check-in responses into one `AnsweredOption` per selected
 * option. Multi-select responses produce several tuples; single-select produce
 * one. This is the bridge from the `CheckIn` data model into `CheckInContext`.
 */
export function responsesToAnsweredOptions(responses: Response[]): AnsweredOption[] {
  return responses.flatMap((response) =>
    response.optionIds.map((optionId) => ({
      questionId: response.questionId,
      optionId,
    })),
  );
}
