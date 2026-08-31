import { RIVAL_MATH_CONFIG } from "@/domain/config/tuningConstants";
import { Logger } from "@/core/logging/logger";
import { clampScore, generateMutualExclusionContradictions } from "./utils";
import { buildLookups, conditionHolds, conditionIsApplicable } from "./ConditionEvaluator";
import {
  evaluateAnswerInferences,
  evaluateBeliefs,
  deriveClarifications,
  detectContradictions,
  evaluateQuestionRelevance,
  evaluateCheckInArchetypes,
} from "./engine";
import { deriveQuestionPresentation } from "./PresentationPolicy";
import {
  ANSWER_INFERENCE_RULES,
  CONTRADICTION_RULES,
  QUESTION_EVALUATORS,
  CHECK_IN_ARCHETYPES,
} from "./ruleDefinitions";
import type {
  AnswerInferenceRule,
  CheckInArchetype,
  CheckInContext,
  CheckInRuleSets,
  CheckInUnderstanding,
  ContradictionRule,
  QuestionRelevanceEvaluator,
  QuestionView,
  RankedQuestion,
} from "./types";

/** Thin wrapper for the default rule sets. Mostly never overridden in practice. */
const DEFAULT_RULE_SETS: Required<CheckInRuleSets> = {
  answerInferenceRules: ANSWER_INFERENCE_RULES,
  questionEvaluators: QUESTION_EVALUATORS,
  contradictionRules: CONTRADICTION_RULES,
  sessionArchetypes: CHECK_IN_ARCHETYPES,
};

export function evaluateCheckIn(
  context: CheckInContext,
  ruleSets: CheckInRuleSets = {},
): CheckInUnderstanding {
  const { answeredSoFar, enabledGis } = context;
  Logger.performance.mark("checkIn.evaluate:start");

  const rules = { ...DEFAULT_RULE_SETS, ...ruleSets };
  const lookups = buildLookups(context);
  const participatingQuestionIds = lookups.participatingQuestionIds;

  // -- Scope each rule family to the participating question/GIS set --
  const scopedAnswerRules: AnswerInferenceRule[] = rules.answerInferenceRules
    .filter((rule) =>
      rule.conditions.every((condition) =>
        conditionIsApplicable(condition, context, lookups),
      ),
    )
    .map((rule) => ({
      ...rule,
      effects: rule.effects.filter((effect) => participatingQuestionIds.has(effect.questionId)),
    }))
    .filter((rule) => rule.effects.length > 0);

  const scopedEvaluators: QuestionRelevanceEvaluator[] = rules.questionEvaluators
    .filter((evaluator) => participatingQuestionIds.has(evaluator.questionId))
    .map((evaluator) => ({
      ...evaluator,
      modifiers: evaluator.modifiers.filter((modifier) =>
        modifier.conditions.every((condition) =>
          conditionIsApplicable(condition, context, lookups),
        ),
      ),
    }));

  const contradictionRules: ContradictionRule[] = [
    ...rules.contradictionRules.filter((rule) =>
      rule.conditions.every((condition) =>
        conditionIsApplicable(condition, context, lookups),
      ),
    ),
    ...generateMutualExclusionContradictions(enabledGis),
  ];

  const scopedArchetypes: CheckInArchetype[] = rules.sessionArchetypes.filter((archetype) =>
    archetype.conditions.every((condition) =>
      conditionIsApplicable(condition, context, lookups),
    ),
  );

  // -- Deductions, beliefs, relevance --
  const inferences = evaluateAnswerInferences(scopedAnswerRules, context, lookups);
  const beliefsByQuestion = evaluateBeliefs(inferences);

  // -- Default relevance scores (tier blended with GIS baseWeight) --
  const defaultScoreByQuestion = new Map<string, number>();
  for (const gis of enabledGis) {
    const tier = context.gisTierById?.[gis.id];
    const tierScore = tier
      ? RIVAL_MATH_CONFIG.DEFAULT_QUESTION_SCORE_BY_TIER[tier]
      : RIVAL_MATH_CONFIG.DEFAULT_QUESTION_SCORE;
    const weightFactor =
      RIVAL_MATH_CONFIG.DEFAULT_SCORE_BASE_WEIGHT_FLOOR +
      (1 - RIVAL_MATH_CONFIG.DEFAULT_SCORE_BASE_WEIGHT_FLOOR) *
        (gis.baseWeight / RIVAL_MATH_CONFIG.MAX_GIS_BASE_WEIGHT);
    const defaultScore = clampScore(tierScore * weightFactor);
    for (const question of gis.questions) {
      defaultScoreByQuestion.set(question.id, defaultScore);
    }
  }

  const evaluatedQuestions = evaluateQuestionRelevance(
    scopedEvaluators,
    context,
    defaultScoreByQuestion,
    lookups,
  );
  const evaluatedByQuestion = new Map(
    evaluatedQuestions.map((question) => [question.questionId, question] as const),
  );

  // -- Contradictions, clarifications, archetypes --
  const contradictions = detectContradictions(contradictionRules, context, lookups);
  const clarifications = deriveClarifications(contradictions, context);
  const reaskQuestionIds = new Set(
    clarifications.map((clarification) => clarification.reaskQuestionId),
  );

  const archetypes = evaluateCheckInArchetypes(scopedArchetypes, context, lookups);
  const archetypeById = new Map(archetypes.map((a) => [a.id, a] as const));
  const archetypePullByQuestion = new Map<string, number>();
  for (const raw of scopedArchetypes) {
    const evaluated = archetypeById.get(raw.id);
    if (!evaluated || evaluated.totalConditions === 0) {
      continue;
    }
    const pullPerCondition =
      evaluated.bonus * (evaluated.satisfiedCount / evaluated.totalConditions);
    for (const condition of raw.conditions) {
      if (condition.type !== "question_answer") {
        continue;
      }
      if (!conditionHolds(condition, context, lookups)) {
        archetypePullByQuestion.set(
          condition.questionId,
          (archetypePullByQuestion.get(condition.questionId) ?? 0) + pullPerCondition,
        );
      }
    }
  }

  const answeredQuestionIds = new Set(answeredSoFar.map((answer) => answer.questionId));
  const questions: QuestionView[] = [];

  for (const gis of enabledGis) {
    for (const question of gis.questions) {
      const defaultScore =
        defaultScoreByQuestion.get(question.id) ?? RIVAL_MATH_CONFIG.DEFAULT_QUESTION_SCORE;
      const evaluated = evaluatedByQuestion.get(question.id);
      const score = evaluated ? clampScore(evaluated.score) : clampScore(defaultScore);
      const isAnswered = answeredQuestionIds.has(question.id);

      const basePresentation = deriveQuestionPresentation(
        isAnswered,
        beliefsByQuestion.get(question.id) ?? {
          questionId: question.id,
          beliefs: [],
          excludedOptionIds: new Set(),
        },
        evaluated,
        defaultScore,
        question.options.map((option) => option.id),
      );
      const presentation = reaskQuestionIds.has(question.id)
        ? { ...basePresentation, state: "clarify" as const }
        : basePresentation;

      questions.push({
        questionId: question.id,
        presentation,
        score,
        explanations: evaluated ? evaluated.explanations : [],
        evidence: evaluated ? [...evaluated.evidence] : [],
      });
    }
  }

  // -- Rank remaining questions by value of information --
  const remainingQuestions: RankedQuestion[] = questions
    .map((question, index) => {
      const uncertainty = question.presentation.soleRemainingOptionId
        ? RIVAL_MATH_CONFIG.UNCERTAINTY_SOLE_REMAINING
        : question.presentation.prefilledOptionIds.length > 0
          ? RIVAL_MATH_CONFIG.UNCERTAINTY_PREFILLED
          : RIVAL_MATH_CONFIG.UNCERTAINTY_OPEN;
      const archetypePull = archetypePullByQuestion.get(question.questionId) ?? 0;
      const valueOfInformation = Number((question.score * uncertainty + archetypePull).toFixed(3));
      return { question, index, uncertainty, archetypePull, valueOfInformation };
    })
    .filter((item) => !answeredQuestionIds.has(item.question.questionId))
    .sort((a, b) => b.valueOfInformation - a.valueOfInformation || a.index - b.index)
    .map((item, order) => ({
      questionId: item.question.questionId,
      score: item.question.score,
      uncertainty: item.uncertainty,
      archetypePull: item.archetypePull,
      valueOfInformation: item.valueOfInformation,
      order: order + 1,
    }));

  const result: CheckInUnderstanding = {
    questionIds: questions.map((question) => question.questionId),
    questions,
    inferences,
    contradictions,
    clarifications,
    archetypes,
    remainingQuestions,
  };

  if (Logger.checkIn.isEnabled("INFO")) {
    Logger.checkIn.info(
      `Check-in understood — ${questions.length} questions, ${inferences.length} deductions, ${contradictions.length} contradictions, ${clarifications.length} clarifications, ${archetypes.length} archetypes, ${remainingQuestions.length} remaining`,
    );
  }

  Logger.behavior.group(
    `Decisions`,
    (g) => {
      for (const q of questions) {
        const p = q.presentation;
        if (p.state === "resolved" && p.prefilledOptionIds.length > 0) {
          g.info(`✓ ${q.questionId} → resolved, prefill [${p.prefilledOptionIds.join(", ")}]`);
        } else if (p.state === "competing") {
          g.info(
            `~ ${q.questionId} → competing (${p.prefilledOptionIds.join(", ")} vs ${(p.competingOptionIds ?? []).join(", ")})`,
          );
        } else if (p.soleRemainingOptionId) {
          g.info(`↳ ${q.questionId} → one-tap confirm ${p.soleRemainingOptionId}`);
        } else if (p.state === "clarify") {
          g.info(`? ${q.questionId} → clarify`);
        }
      }
      for (const a of archetypes) {
        g.info(`archetype ${a.name}: ${a.emergence} (${a.satisfiedCount}/${a.totalConditions})`);
      }
      if (remainingQuestions.length > 0) {
        g.info(
          `next: ${remainingQuestions
            .slice(0, 5)
            .map((r) => r.questionId)
            .join(", ")}${remainingQuestions.length > 5 ? "…" : ""}`,
        );
      }
    },
    "DEBUG",
  );

  Logger.performance.measure("checkIn.evaluate", "checkIn.evaluate:start");
  return result;
}
