import { RIVAL_MATH_CONFIG } from "@/domain/config/tuningConstants";
import { clampScore } from "./utils";
import type {
  EvaluatedQuestionRelevance,
  OptionBelief,
  QuestionBelief,
  QuestionPresentation,
} from "./types";

/**
 * The only UI-deciding function in the inference package.
 * It is the single place that turns a question's accumulated belief state into a render directive the UI can
 * act on without re-deriving any reasoning.
 *
 * Precedence — a live deduction always wins over hiding:
 *   1. directly answered                                   -> resolved
 *   2. top belief clears its support bar AND margin        -> resolved (prefilled)
 *   3. top belief + a runner-up above the competing floor  -> competing (soft hint)
 *   4. any live deduction (suggest OR exclude)             -> suggested/active (kept visible)
 *   5. otherwise                                           -> score-based hide/collapse/defer/optional/active
 */
export function deriveQuestionPresentation(
  isAnsweredDirectly: boolean,
  belief: QuestionBelief,
  evaluatedQuestion?: EvaluatedQuestionRelevance,
  defaultScore: number = RIVAL_MATH_CONFIG.DEFAULT_QUESTION_SCORE,
  optionIds: string[] = [],
): QuestionPresentation {
  const disabledOptionIds = belief.excludedOptionIds;

  if (isAnsweredDirectly) {
    return {
      state: "resolved",
      prefilledOptionIds: [],
      disabledOptionIds,
      soleRemainingOptionId: null,
    };
  }

  // Exactly one option surviving the exclusions becomes a confirm target.
  const remainingOptionIds = optionIds.filter((id) => !disabledOptionIds.has(id));
  const soleRemainingOptionId = remainingOptionIds.length === 1 ? remainingOptionIds[0] : null;

  const score = evaluatedQuestion ? clampScore(evaluatedQuestion.score) : clampScore(defaultScore);

  const sorted = [...belief.beliefs].sort((a, b) => b.support - a.support);
  const top = sorted[0];
  const runnerUp = sorted[1];
  // A live deduction is a signal strong enough to act on.
  // Negligible support (below MIN_SUPPORT_FLOOR) must not bypass the relevance cascade
  // Hard exclusions always count, since they're certain.
  const hasLiveDeduction =
    (top !== undefined && top.support >= RIVAL_MATH_CONFIG.MIN_SUPPORT_FLOOR) ||
    disabledOptionIds.size > 0;

  const resolve = top ? resolveOption(sorted) : null;

  if (resolve?.state === "resolved") {
    return {
      state: "resolved",
      prefilledOptionIds: [top.optionId],
      disabledOptionIds,
      soleRemainingOptionId,
    };
  }

  if (resolve?.state === "competing") {
    return {
      state: "competing",
      prefilledOptionIds: [top.optionId],
      disabledOptionIds,
      soleRemainingOptionId,
      competingOptionIds: [runnerUp!.optionId],
    };
  }

  if (!hasLiveDeduction) {
    if (score < RIVAL_MATH_CONFIG.QUESTION_HIDE_THRESHOLD) {
      return {
        state: "hidden",
        prefilledOptionIds: [],
        disabledOptionIds,
        soleRemainingOptionId,
      };
    }

    if (score < RIVAL_MATH_CONFIG.PRESENTATION_COLLAPSED_THRESHOLD) {
      return {
        state: "collapsed",
        prefilledOptionIds: [],
        disabledOptionIds,
        soleRemainingOptionId,
      };
    }

    if (score < RIVAL_MATH_CONFIG.PRESENTATION_DEFERRED_THRESHOLD) {
      return {
        state: "deferred",
        prefilledOptionIds: [],
        disabledOptionIds,
        soleRemainingOptionId,
      };
    }

    if (score < RIVAL_MATH_CONFIG.PRESENTATION_OPTIONAL_THRESHOLD) {
      return {
        state: "optional",
        prefilledOptionIds: [],
        disabledOptionIds,
        soleRemainingOptionId,
      };
    }
  }

  if (hasLiveDeduction && top) {
    return {
      state: score >= RIVAL_MATH_CONFIG.PRESENTATION_SUGGESTED_THRESHOLD ? "suggested" : "active",
      prefilledOptionIds: [top.optionId],
      disabledOptionIds,
      soleRemainingOptionId,
    };
  }

  return {
    state: "active",
    prefilledOptionIds: [],
    disabledOptionIds,
    soleRemainingOptionId,
  };
}

/**
 * Belief-based resolve with a margin guard.
 * The top option must clear the single support bar *and* lead the runner-up by at least `MIN_RESOLVE_MARGIN`.
 * Otherwise, if a runner-up clears the competing floor the question is `competing`; if not, `resolveOption` returns `null` and the caller decides suggested/active from the score.
 */
function resolveOption(
  beliefs: OptionBelief[],
):
  | { state: "resolved"; winner: OptionBelief }
  | { state: "competing"; top: OptionBelief; runnerUp: OptionBelief }
  | null {
  const sorted = [...beliefs].sort((a, b) => b.support - a.support);
  const [top, runnerUp] = sorted;
  const margin = top.support - (runnerUp?.support ?? 0);

  if (
    top.support >= RIVAL_MATH_CONFIG.MIN_RESOLVE_SUPPORT &&
    margin >= RIVAL_MATH_CONFIG.MIN_RESOLVE_MARGIN
  ) {
    return { state: "resolved", winner: top };
  }
  if (runnerUp && runnerUp.support > RIVAL_MATH_CONFIG.COMPETING_FLOOR) {
    return { state: "competing", top, runnerUp };
  }
  return null;
}
