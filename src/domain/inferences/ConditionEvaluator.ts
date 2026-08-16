import type { CheckInContext, Condition } from "./types";

/** Precomputed, pass-invariant view of a `CheckInContext`, built once per pass. */
export interface EvaluatorLookups {
  enabledGisIds: string[];
  participatingQuestionIds: Set<string>;
}

export class ConditionEvaluator {
  /** Builds the pass-invariant lookups once per pass; reused by `holds`/`isApplicable`. */
  static buildLookups(context: CheckInContext): EvaluatorLookups {
    const enabledGisIds = context.enabledGis.map((gis) => gis.id);
    const participatingQuestionIds = new Set<string>();
    for (const gis of context.enabledGis) {
      for (const question of gis.questions) {
        participatingQuestionIds.add(question.id);
      }
    }
    return { enabledGisIds, participatingQuestionIds };
  }

  /** Whether a condition holds given the current check-in context. */
  static holds(condition: Condition, context: CheckInContext, lookups?: EvaluatorLookups): boolean {
    const { answeredSoFar, answerValueByGisId, selectedDomainId } = context;
    const loot = lookups ?? this.buildLookups(context);

    switch (condition.type) {
      case "question_answer":
        return answeredSoFar.some(
          (a) => a.questionId === condition.questionId && a.optionId === condition.optionId,
        );

      case "gis":
        return loot.enabledGisIds.includes(condition.gisId) === condition.attached;

      case "weight": {
        const value = answerValueByGisId?.[condition.gisId] ?? 0;
        return condition.comparator === "gte" ? value >= condition.value : value <= condition.value;
      }

      case "domain": {
        const matches = selectedDomainId === condition.domainId;
        return matches === condition.attached;
      }

      default: {
        const exhaustiveCheck: never = condition;
        throw new Error(
          `ConditionEvaluator: unsupported condition ${JSON.stringify(exhaustiveCheck)}`,
        );
      }
    }
  }

  /** Whether a condition could ever be satisfied given the check-in's context (scoping). */
  static isApplicable(
    condition: Condition,
    context: CheckInContext,
    lookups?: EvaluatorLookups,
  ): boolean {
    const loot = lookups ?? this.buildLookups(context);

    switch (condition.type) {
      case "question_answer":
        return loot.participatingQuestionIds.has(condition.questionId);
      case "gis":
        return condition.attached ? loot.enabledGisIds.includes(condition.gisId) : true;
      case "weight":
        return loot.enabledGisIds.includes(condition.gisId);
      case "domain":
        return true;
      default: {
        const exhaustiveCheck: never = condition;
        throw new Error(
          `ConditionEvaluator: unsupported condition ${JSON.stringify(exhaustiveCheck)}`,
        );
      }
    }
  }
}
