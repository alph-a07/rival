import type {
  AnsweredOption,
  AnswerInferenceRule,
  CheckInContext,
  Clarification,
  Condition,
  ContradictionRule,
  DetectedContradiction,
  EvaluatedArchetype,
  EvaluatedAnswerInference,
  EvaluatedQuestionRelevance,
  EvidenceType,
  ExplanationRecord,
  OptionBelief,
  QuestionBelief,
  QuestionRelevanceEvaluator,
  CheckInArchetype,
} from "./types";
import { RIVAL_MATH_CONFIG } from "@/domain/config/tuningConstants";
import { Logger } from "@/core/logging/logger";
import { conditionHolds } from "./ConditionEvaluator";
import type { EvaluatorLookups } from "./ConditionEvaluator";
import {
  buildExplanation,
  clampScore,
  matchedConditions,
  resolveEvidence,
  sortExplanations,
} from "./utils";

/** Ordinal rank of an evidence tier, used only to pick a belief's dominant tier for display. */
const EVIDENCE_RANK: Record<EvidenceType, number> = {
  Definition: 3,
  StrongHeuristic: 2,
  WeakHeuristic: 1,
  Hypothesis: 0,
};

/** Fires rules whose conditions all hold, producing the explainable deductions that feed the belief engine. */
export function evaluateAnswerInferences(
  rules: AnswerInferenceRule[],
  context: CheckInContext,
  lookups?: EvaluatorLookups,
): EvaluatedAnswerInference[] {
  const applicableRules = rules.filter((rule) =>
    rule.conditions.every((condition) => conditionHolds(condition, context, lookups)),
  );
  const conditionsByRuleId = new Map<string, Condition[]>();

  const result: EvaluatedAnswerInference[] = applicableRules
    .sort(sortRulesByConfidence)
    .flatMap((rule) => {
      conditionsByRuleId.set(rule.id, rule.conditions);
      const { confidence, evidence } = resolveEvidence(rule);
      return rule.effects.map((inference) => {
        const explanation = buildExplanation(
          rule.reason ?? "Missing explanation.",
          confidence,
          evidence,
        );

        return {
          inference,
          confidence,
          sourceRuleId: rule.id,
          evidence,
          explanations: [explanation],
        };
      });
    });

  if (result.length > 0) {
    Logger.behavior.group(
      `Deductions (${result.length})`,
      (g) => {
        for (const r of result) {
          g.info(
            `${r.inference.type} ${r.inference.questionId} → ${r.inference.optionId} | ${r.sourceRuleId} (${r.confidence.toFixed(2)}, ${r.evidence})${matchedConditions(conditionsByRuleId.get(r.sourceRuleId) ?? [], context, lookups)}`,
          );
        }
      },
      "DEBUG",
    );
  }

  return result;
}

/** Compare function for rules - sorts rules by confidence in descending order */
function sortRulesByConfidence(a: AnswerInferenceRule, b: AnswerInferenceRule): number {
  return resolveEvidence(b).confidence - resolveEvidence(a).confidence;
}

/** Accumulates per-option beliefs via noisy-OR; exclusions hard-zero the option. Consumed by `deriveQuestionPresentation`. */
export function evaluateBeliefs(
  inferences: EvaluatedAnswerInference[],
): Map<string, QuestionBelief> {
  const beliefsByQuestion = new Map<string, Map<string, OptionBelief>>();
  const excludedByQuestion = new Map<string, Set<string>>();

  for (const evaluated of inferences) {
    const { inference, confidence, evidence, sourceRuleId } = evaluated;

    if (inference.type === "exclude_answer") {
      const excluded = excludedByQuestion.get(inference.questionId) ?? new Set<string>();
      excluded.add(inference.optionId);
      excludedByQuestion.set(inference.questionId, excluded);
      continue;
    }

    const optionBeliefs =
      beliefsByQuestion.get(inference.questionId) ?? new Map<string, OptionBelief>();
    const existing = optionBeliefs.get(inference.optionId);

    if (existing) {
      existing.support = 1 - (1 - existing.support) * (1 - confidence); // Noisy OR: 1 - Π(1 - s_i)
      existing.contributingRuleIds.push(sourceRuleId);
      if (EVIDENCE_RANK[evidence] > EVIDENCE_RANK[existing.evidence]) {
        existing.evidence = evidence;
      }
    } else {
      optionBeliefs.set(inference.optionId, {
        optionId: inference.optionId,
        support: confidence,
        contributingRuleIds: [sourceRuleId],
        evidence,
      });
    }
    beliefsByQuestion.set(inference.questionId, optionBeliefs);
  }

  // Exclusion wins: strip excluded options from their belief maps regardless of stream order.
  for (const [questionId, excluded] of excludedByQuestion) {
    const optionBeliefs = beliefsByQuestion.get(questionId);
    if (!optionBeliefs) {
      continue;
    }
    for (const optionId of excluded) {
      optionBeliefs.delete(optionId);
    }
  }

  const result = new Map<string, QuestionBelief>();
  const questionIds = new Set([...beliefsByQuestion.keys(), ...excludedByQuestion.keys()]);
  for (const questionId of questionIds) {
    const optionBeliefs = beliefsByQuestion.get(questionId);
    result.set(questionId, {
      questionId,
      beliefs: optionBeliefs ? [...optionBeliefs.values()] : [],
      excludedOptionIds: excludedByQuestion.get(questionId) ?? new Set(),
    });
  }

  if (result.size > 0) {
    Logger.behavior.group(
      `Beliefs`,
      (g) => {
        for (const { questionId, beliefs, excludedOptionIds } of result.values()) {
          for (const b of beliefs) {
            if (b.support > 0) {
              g.info(
                `${questionId}:${b.optionId} → ${b.support.toFixed(2)} (${b.evidence}, ${b.contributingRuleIds.join(" + ")})`,
              );
            }
          }
          if (excludedOptionIds.size > 0) {
            g.info(`${questionId}: excluded [${[...excludedOptionIds].join(", ")}]`);
          }
        }
      },
      "DEBUG",
    );
  }

  return result;
}

/** Scores each question's relevance from its base default plus applicable modifier adjustments. */
export function evaluateQuestionRelevance(
  evaluators: QuestionRelevanceEvaluator[],
  context: CheckInContext,
  defaultScoreByQuestion: ReadonlyMap<string, number> = new Map(),
  lookups?: EvaluatorLookups,
): EvaluatedQuestionRelevance[] {
  return evaluators.map((evaluator) => {
    let score =
      defaultScoreByQuestion.get(evaluator.questionId) ??
      RIVAL_MATH_CONFIG.DEFAULT_QUESTION_SCORE;
    const explanations: ExplanationRecord[] = [];
    const evidence = new Set<EvidenceType>();
    const applied: { reason: string; adjustment: number }[] = [];

    for (const mod of evaluator.modifiers) {
      const applies = mod.conditions.every((condition) =>
        conditionHolds(condition, context, lookups),
      );

      if (applies) {
        const { confidence, evidence: modEvidence } = resolveEvidence(mod);
        const effectiveAdjustment = mod.adjustment * confidence;
        score += effectiveAdjustment;
        applied.push({ reason: mod.reason, adjustment: effectiveAdjustment });

        const explanation = buildExplanation(mod.reason, confidence, modEvidence);
        explanations.push(explanation);
        evidence.add(explanation.evidence);
      }
    }

    const orderedExplanations = sortExplanations(explanations);
    const finalScore = clampScore(score);

    const startingScore =
      defaultScoreByQuestion.get(evaluator.questionId) ??
      RIVAL_MATH_CONFIG.DEFAULT_QUESTION_SCORE;

    Logger.behavior.group(
      `Relevance • ${evaluator.questionId}`,
      (g) => {
        g.info(`Base Score: ${startingScore.toFixed(2)}`);
        for (const m of applied) {
          const sign = m.adjustment >= 0 ? "+" : "";
          g.info(
            `${m.adjustment >= 0 ? "✓" : "✗"} ${m.reason} (${sign}${m.adjustment.toFixed(2)})`,
          );
        }
        g.info(`Final Score: ${finalScore.toFixed(2)}`);
      },
      "DEBUG",
    );

    return {
      questionId: evaluator.questionId,
      score: finalScore,
      explanations: orderedExplanations,
      evidence,
    };
  });
}

/** Turns fired contradiction rules into `DetectedContradiction`s for the clarification step. */
export function detectContradictions(
  contradictionRules: ContradictionRule[],
  context: CheckInContext,
  lookups?: EvaluatorLookups,
): DetectedContradiction[] {
  const detected = contradictionRules
    .filter((rule) =>
      rule.conditions.every((condition) => conditionHolds(condition, context, lookups)),
    )
    .map((rule) => {
      const { confidence, evidence } = resolveEvidence(rule);
      const explanation = buildExplanation(rule.reason, confidence, evidence);
      return {
        id: rule.id,
        reason: rule.reason,
        severity: rule.severity ?? "warning",
        evidence,
        confidence,
        conflictingAnswers: conflictingAnswersFor(rule),
        explanations: [explanation],
      };
    });

  for (const c of detected) {
    if (c.severity === "warning") {
      Logger.checkIn.warn(`Contradiction: ${c.reason}`);
    } else {
      Logger.checkIn.info(`Contradiction (info): ${c.reason}`);
    }
  }

  return detected;
}

/** The specific `question_answer` answers that make up the conflict. */
function conflictingAnswersFor(rule: ContradictionRule): AnsweredOption[] {
  return rule.conditions
    .filter(
      (c): c is { type: "question_answer"; questionId: string; optionId: string } =>
        c.type === "question_answer",
    )
    .map((c) => ({ questionId: c.questionId, optionId: c.optionId }));
}

/** Maps each detected contradiction to a clarification that re-asks the most recent conflicting answer. */
export function deriveClarifications(
  detected: DetectedContradiction[],
  context: CheckInContext,
): Clarification[] {
  const clarifications = detected.map((contradiction) => {
    const { id, reason, severity, confidence, explanations, conflictingAnswers } = contradiction;
    return {
      id,
      reason,
      severity,
      confidence,
      conflictingAnswers,
      reaskQuestionId: pickReaskQuestion(conflictingAnswers, context.answeredSoFar),
      explanations,
    };
  });

  for (const c of clarifications) {
    if (c.severity === "warning") {
      Logger.checkIn.warn(`Clarification: ${c.reason} → re-ask ${c.reaskQuestionId}`);
    } else {
      Logger.checkIn.info(`Clarification: ${c.reason} → re-ask ${c.reaskQuestionId}`);
    }
  }

  return clarifications;
}

/** Re-ask the conflicting answer given most recently in the stream — the most likely slip. */
function pickReaskQuestion(
  conflictingAnswers: AnsweredOption[],
  answeredSoFar: AnsweredOption[],
): string {
  let reask = conflictingAnswers[0].questionId;
  let lastIndex = -1;
  for (const answer of conflictingAnswers) {
    const index = answeredSoFar.findLastIndex(
      (a) => a.questionId === answer.questionId && a.optionId === answer.optionId,
    );
    if (index >= lastIndex) {
      lastIndex = index;
      reask = answer.questionId;
    }
  }
  return reask;
}

/** Recognizes session archetypes from how many of their conditions hold. */
export function evaluateCheckInArchetypes(
  archetypes: CheckInArchetype[],
  context: CheckInContext,
  lookups?: EvaluatorLookups,
): EvaluatedArchetype[] {
  const matchedByArchId = new Map<string, string>();

  const recognized = archetypes
    .map((archetype) => {
      const satisfiedCount = archetype.conditions.filter((condition) =>
        conditionHolds(condition, context, lookups),
      ).length;
      const totalConditions = archetype.conditions.length;
      const allHeld = satisfiedCount === totalConditions;

      if (
        !allHeld &&
        totalConditions > 0 &&
        satisfiedCount / totalConditions < RIVAL_MATH_CONFIG.ARCHETYPE_EMERGE_MIN_FRACTION
      ) {
        return null;
      }

      const emergence = allHeld ? "confirmed" : "emerging";
      const { confidence: baseConfidence, evidence } = resolveEvidence(archetype);
      const confidence = allHeld
        ? baseConfidence
        : baseConfidence * (satisfiedCount / totalConditions);
      const explanation = buildExplanation(
        allHeld
          ? archetype.reason
          : `${satisfiedCount} of ${totalConditions} signals match the "${archetype.name}" pattern so far.`,
        confidence,
        evidence,
      );

      matchedByArchId.set(
        archetype.id,
        matchedConditions(archetype.conditions, context, lookups),
      );

      return {
        id: archetype.id,
        name: archetype.name,
        bonus: archetype.bonus,
        reason: archetype.reason,
        confidence,
        evidence,
        satisfiedCount,
        totalConditions,
        emergence,
        explanations: [explanation],
      };
    })
    .filter((archetype): archetype is EvaluatedArchetype => archetype !== null);

  for (const a of recognized) {
    Logger.behavior.info(
      `Archetype ${a.name}: ${a.emergence} (${a.satisfiedCount}/${a.totalConditions})${matchedByArchId.get(a.id) ?? ""}`,
    );
  }

  return recognized;
}
