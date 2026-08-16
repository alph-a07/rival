import type { Gis, GisTier } from "@/domain/models/Gis";

/** Classifies evidence quality, from certain to speculative */
export type EvidenceType = "Definition" | "StrongHeuristic" | "WeakHeuristic" | "Hypothesis";

export interface ExplanationRecord {
  reason: string;
  confidence: number;
  evidence: EvidenceType;
}

/**
 * The single evidence/confidence contract shared by every rule-like construct:
 * a `Definition` link is logically certain (confidence forbidden), otherwise a
 * heuristic carries one `confidence` from which the tier is derived.
 */
export type ConfidenceDial =
  | { evidence: "Definition"; confidence?: never }
  | { confidence: number };

/**
 * Base type for all behavioral rules.
 *
 * Authors either mark a rule `Definition` (logically certain — confidence is
 * structurally forbidden) or give it a single `confidence` dial. The heuristic
 * evidence tier (StrongHeuristic/WeakHeuristic/Hypothesis) is DERIVED from that
 * confidence, never authored alongside it, so the two can't drift apart.
 */
export type BehaviorRule = {
  id: string;
  conditions: Condition[];
  reason?: string;
} & ConfidenceDial;

/** Union of matchable facts: an answer, a GIS, a GIS score threshold, or a domain. */
export type Condition =
  | { type: "question_answer"; questionId: string; optionId: string }
  | { type: "gis"; gisId: string; attached: boolean }
  | { type: "weight"; gisId: string; comparator: "gte" | "lte"; value: number }
  | { type: "domain"; domainId: string; attached: boolean };

/** User's selected answer for a question. Flat, primitive representation of "the user said X" */
export interface AnsweredOption {
  questionId: string;
  optionId: string;
}

// -- Deductive Inference Contracts --

/** Rules that derive answer-level effects from conditions. */
export type AnswerInferenceRule = BehaviorRule & {
  effects: AnswerInference[];
  reason?: string;
};

/** Union of all possible answer inference types */
export type AnswerInference = SuggestAnswerInference | ExcludeAnswerInference;

/**
 * Interface for suggesting an answer.
 * A soft directional guess: “likely pick X”. It prefills but rarely auto-resolves.
 */
export interface SuggestAnswerInference {
  type: "suggest_answer";
  questionId: string;
  optionId: string;
}

/** A hard elimination: the option is ruled out, and can auto-resolve if only one option remains. */
export interface ExcludeAnswerInference {
  type: "exclude_answer";
  questionId: string;
  optionId: string;
}

export interface EvaluatedAnswerInference {
  inference: AnswerInference;
  confidence: number;
  sourceRuleId: string;
  evidence: EvidenceType;
  explanations: ExplanationRecord[];
}

// -- Evaluative Question Contracts --

export interface QuestionRelevanceEvaluator {
  questionId: string;
  modifiers: QuestionRelevanceModifier[];
}

/**
 * A conditional relevance shove. Shares the `ConfidenceDial` contract: either
 * `Definition` (logically certain) or a single `confidence` from which the
 * heuristic tier is derived.
 */
export type QuestionRelevanceModifier = {
  conditions: Condition[];
  adjustment: number;
  reason: string;
} & ConfidenceDial;

export interface EvaluatedQuestionRelevance {
  questionId: string;
  score: number;
  explanations: ExplanationRecord[];
  evidence: Set<EvidenceType>;
}

// -- Contradiction / Resolution / Archetype Contracts --

/** Rules that detect narratively surprising answer combinations */
export type ContradictionRule = BehaviorRule & {
  reason: string;
  severity?: "info" | "warning";
};

/** Rules that define check-in archetypes (meaningful check-in patterns for added value. e.g. "Deep Work") */
export type CheckInArchetype = BehaviorRule & {
  name: string;
  bonus: number;
  reason: string;
};

export interface DetectedContradiction {
  id: string;
  reason: string;
  severity: "info" | "warning";
  confidence: number;
  evidence: EvidenceType;
  conflictingAnswers: AnsweredOption[];
  explanations: ExplanationRecord[];
}

/** An actionable request to resolve a contradiction: "These answers conflict; reconfirm question Y" */
export interface Clarification {
  id: string;
  reason: string;
  severity: "info" | "warning";
  confidence: number;
  conflictingAnswers: AnsweredOption[];
  reaskQuestionId: string;
  explanations: ExplanationRecord[];
}

export interface EvaluatedArchetype {
  id: string;
  name: string;
  bonus: number;
  reason: string;
  confidence: number;
  evidence: EvidenceType;
  explanations: ExplanationRecord[];
  satisfiedCount: number;
  totalConditions: number;
  emergence: "emerging" | "confirmed";
}

// -- Belief Contracts (Presentation input)--

/** Accumulated support for one option plus the rules that produced it. */
export interface OptionBelief {
  optionId: string;
  /** Accumulated support in [0,1]; 0 for an option that only lost support. */
  support: number;
  contributingRuleIds: string[];
  evidence: EvidenceType;
}

/**
 * The per-question outcome of the belief engine: surviving option beliefs plus
 * the options hard-excluded by `exclude_answer` effects.
 */
export interface QuestionBelief {
  questionId: string;
  /** Beliefs for options that remain candidates (not hard-excluded). */
  beliefs: OptionBelief[];
  /** Options removed outright by hard exclusions. */
  excludedOptionIds: Set<string>;
}

// -- UI Contracts --

export type QuestionPresentationState =
  | "hidden"
  | "collapsed"
  | "deferred"
  | "optional"
  | "active"
  | "suggested"
  | "resolved"
  | "competing"
  | "clarify";

export interface QuestionPresentation {
  state: QuestionPresentationState;
  prefilledOptionIds: string[];
  disabledOptionIds: Set<string>;
  soleRemainingOptionId: string | null;
  /**
   * Populated only in `competing` state: the alternative options the system is
   * genuinely torn between, shown as a soft "also consider X" hint — never a
   * blocking reconfirm.
   */
  competingOptionIds?: string[];
}

// -- Check-in Orchestration Contracts --

/** Immutable input to a single `evaluateCheckIn` pass; the only thing the engines read. */
export interface CheckInContext {
  /** Answers recorded so far in this check-in (one `AnsweredOption` per **selected option**). */
  answeredSoFar: AnsweredOption[];
  /** The enabled (participating) GIS definitions for this check-in. */
  enabledGis: Gis[];
  /** Tier (mandatory/recommended/optional) of each enabled GIS, when known. */
  gisTierById?: Record<string, GisTier>;
  /** Per-GIS fractional score (0..1), keyed by gisId. Empty when unavailable. */
  answerValueByGisId?: Record<string, number>;
  /** The selected domain id, when resolved. */
  selectedDomainId?: string;
}

/** A participating question with its presentation decision and the reasoning behind it. */
export interface QuestionView {
  questionId: string;
  presentation: QuestionPresentation;
  /** The evaluated relevance score that lead the derivation of the presentation state. */
  score: number;
  explanations: ExplanationRecord[];
  evidence: EvidenceType[];
}

/** A not-yet-answered participating question, ranked by behavioral value. */
export interface RankedQuestion {
  questionId: string;
  score: number;
  /** How uncertain we are about this question's answer (0..1). */
  uncertainty: number;
  /** Boost from an emerging archetype that needs this question to confirm. */
  archetypePull: number;
  /** Composite behavioral value driving the ordering (score * uncertainty + pull). */
  valueOfInformation: number;
  /** 1-based priority; lower is more valuable to ask next. */
  order: number;
}

/** The single, unified read of a check-in that the UI renders. */
export interface CheckInUnderstanding {
  /** Participating question ids, in GIS definition order. */
  questionIds: string[];
  /** Presentation + reasoning for every participating question. */
  questions: QuestionView[];
  /** Deductive inferences (suggest/exclude), scoped to participating questions. */
  inferences: EvaluatedAnswerInference[];
  /** Contradictions detected in the current answer set. */
  contradictions: DetectedContradiction[];
  /** Actionable clarifications derived from detected contradictions. */
  clarifications: Clarification[];
  /** Session archetypes matched by the current answer set. */
  archetypes: EvaluatedArchetype[];
  /** Unanswered participating questions, ranked by behavioral value. */
  remainingQuestions: RankedQuestion[];
}

/** A collection of all rule sets used in the check-in process. */
export interface CheckInRuleSets {
  answerInferenceRules?: AnswerInferenceRule[];
  questionEvaluators?: QuestionRelevanceEvaluator[];
  contradictionRules?: ContradictionRule[];
  sessionArchetypes?: CheckInArchetype[];
}
