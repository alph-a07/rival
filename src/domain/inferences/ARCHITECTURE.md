# Inference Engine Architecture

The behavioral layer that turns a check-in into an intelligent, context-aware conversation. It decides what Rival understands about the current session, what to ask next, and how to present every question — always deterministically and with an auditable reason.

**One-sentence purpose:** _Rival reads the answers a user has given ("facts"), reasons about the session ("brain"), and produces a complete, ranked, explained view of what to render ("presentation") that the UI simply draws._

This document is the single source of truth for the package: it explains the architecture (the three-layer model), the **contracts** (the type vocabulary and why each type exists), and the **engines** (what each does and why). It is built bottom-up so you can reconstruct the whole design from first principles.

---

## The three-layer model

```
   FACTS                 BRAIN                      PRESENTATION                UI
 ┌────────────┐   ┌──────────────────────┐   ┌────────────────────────┐   ┌──────────┐
 │CheckInContext│──▶│  evaluateCheckIn    │──▶│ CheckInUnderstanding   │──▶│ viewmodel │
 │ (inputs)    │   │   orchestrates      │   │  (decisions + reasons) │   │ + render │
 └────────────┘   │   the engines        │   └────────────────────────┘   └──────────┘
                  └──────────────────────┘
```

- **Facts** = `CheckInContext`: what the user has actually answered, which GIS are participating, per-GIS scores, and the selected domain. Pure input, immutable.
- **Brain** = `evaluateCheckIn(context)`: stateless, deterministic. Runs every engine over the same context and folds their outputs into one understanding.
- **Presentation** = `CheckInUnderstanding`: the brain's _read_ — per-question presentation + reasons, deductions, contradictions, clarifications, archetypes, and the ranked list of remaining questions.
- **UI** = a viewmodel that rebuilds the context after each user action and re-invokes `evaluateCheckIn`, then renders the understanding.

The loop the UI follows:

```
User action → update CheckInContext → evaluateCheckIn(context)
            → CheckInUnderstanding  → render
```

**Why `CheckInContext` is the sole input:** every engine reads the same immutable context and nothing else. That single-input design is what keeps the whole package pure, deterministic, and UI-agnostic — the same context always yields the same understanding.

---

## The build order (bottom-up mental model)

The package is best read in dependency order — each layer depends only on the ones above it:

```
types → utils (helpers) → conditionEvaluator → engines → ruleDefinitions
     → orchestrator (evaluateCheckIn)  (no public barrel — deep-import entry points)
```

- **`types.ts`** — the contracts/vocabulary (below). Understanding the types _is_ understanding the design.
- **`utils.ts`** — shared helpers: `clampScore`, the evidence-resolution functions (`deriveEvidence`, `resolveEvidence`), `buildExplanation`, `sortExplanations`, `matchedConditions`, `generateMutualExclusionContradictions`.
- **`conditionEvaluator.ts`** — the single interpreter of `Condition`.
- **`engine.ts`** — the knowledge functions (`evaluateAnswerInferences`, `evaluateBeliefs`, `evaluateQuestionRelevance`, `detectContradictions`, `deriveClarifications`, `evaluateCheckInArchetypes`).
- **`ruleDefinitions.ts`** — the authored behavioral knowledge.
- **`orchestrator.ts`** — `evaluateCheckIn`, the public entry point.
- **`presentationPolicy.ts`** — the single UI-deciding component.

(The package has **no front-door `index.ts`** — consumers deep-import what they need, e.g. `@/domain/inferences/orchestrator` for `evaluateCheckIn` and `@/domain/inferences/types` for the contracts. There is intentionally no barrel so the API surface stays explicit and tree-shakeable.)

---

## Facts: the input contract (`CheckInContext`)

Built by the caller (the viewmodel) from the persisted check-in + active endeavour/domain. It is the **only** thing the brain reads.

| Field                | Meaning                                                                             |
| -------------------- | ----------------------------------------------------------------------------------- |
| `answeredSoFar`      | every selected `(questionId, optionId)` so far                                      |
| `enabledGis`         | the GIS participating in this check-in (their `Question[]` define the question set) |
| `gisTierById`        | tier (mandatory/recommended/optional) per enabled GIS, used for default prominence  |
| `answerValueByGisId` | fractional per-GIS score (0..1); feeds `weight` conditions                          |
| `selectedDomainId`   | the domain, feeds `domain` conditions                                               |

The caller (a viewmodel) builds `answeredSoFar` — the flat `AnsweredOption[]` the context wants — inline while collecting the user's responses. This is the only translation between the persistence model and the engine's flat input model.

---

## The one load-bearing idea: a single confidence dial

The whole engine is built around **one canonical measure of "how strong is a signal"**: the rule's `confidence`. Everything else — the "evidence tier" — is **derived** from that single number, never authored alongside it.

### One dial, not two

Rule authors pick exactly one thing:

```ts
type BehaviorRule =
  | { evidence: "Definition"; confidence?: never; ... }  // logically certain, no dial
  | { confidence: number; ... };                          // a heuristic: one confidence
```

- **`Definition`** is the one author-set flag: a logically-certain link (e.g. "flow ⇔ ¬major friction"), structurally forbidden from carrying a confidence — it is always effective `1.0`.
- **Heuristics** carry a single `confidence` (0..1). The evidence tier (`StrongHeuristic` / `WeakHeuristic` / `Hypothesis`) is **derived** from that number by `deriveEvidence`, using fixed, non-overlapping bands:

```ts
deriveEvidence(confidence):
  confidence >= 0.85  → "StrongHeuristic"
  confidence >= 0.5   → "WeakHeuristic"
  otherwise           → "Hypothesis"
```

Because the bands are non-overlapping and derived from the confidence, a tier can never drift out of sync with the number that produced it. Rule authors set exactly one thing — either `evidence: "Definition"` (logically certain, no dial) or a heuristic `confidence` — so tier and confidence cannot disagree by construction.

`resolveEvidence(rule)` resolves a rule/modifier into `{ confidence, evidence }`: Definition → `(1, "Definition")`; a heuristic → `(clamped confidence, derived tier)`. This is the single resolution function every engine uses.

### No double-counting

Confidence is the single "how much" number. Belief support and relevance adjustments use the **raw resolved confidence** directly — a `0.9` heuristic contributes `0.9`, a Definition contributes `1.0`. The evidence tier is a derived **label** for display/audit; it never shapes the math, so the same concept is never counted twice.

---

## The contracts (`types.ts`) — the vocabulary

### The evidence & explanation core

- **`EvidenceType`** = `"Definition" | "StrongHeuristic" | "WeakHeuristic" | "Hypothesis"`. `Definition` is author-set (logical certainty); the other three are derived from a rule's confidence (see above). `Hypothesis` is the band below `0.5` — no authored rule lands there today, and any such rule would be labeled automatically.
- **`ExplanationRecord`** `{ reason, confidence, evidence }`. The atom of explainability. Every decision emits one or more of these so the UI can say _why_.

### Conditions & answers (what the engines match on)

- **`Condition`** — a discriminated union over four matchable facts:
  - `question_answer { questionId, optionId }` — "did the user pick this option?"
  - `gis { gisId, attached }` — "is this GIS participating?" (`attached: false` matches its _absence_)
  - `weight { gisId, comparator: gte|lte, value }` — "does this GIS's fractional score clear a threshold?"
  - `domain { domainId, attached }` — "is this the selected domain?"

  **Significance:** this is the single input vocabulary shared by every engine and   rule. Rules are just lists of conditions + effects; the conditions are interpreted   by exactly one place (`conditionHolds`). The `weight` and `gis` conditions are   implemented and available to any authored rule.

- **`AnsweredOption`** `{ questionId, optionId }` — one selected option; the flat
  primitive representation of "the user said X" that `answeredSoFar` is made of.

### The behavior-rule core (a discriminated union)

- **`BehaviorRule`** — a discriminated union that makes an invalid state
  _unrepresentable_:

  ```ts   type BehaviorRule =
    | { evidence: "Definition"; confidence?: never; ... }   // certain, no dial
    | { confidence: number; ... };                          // heuristic: one confidence
  ```

  **Why:** a "92% confident definitional link" is a contradiction in terms. The Definition branch may not declare a confidence (it's always `1.0`); a heuristic branch must. `resolveEvidence` enforces the same invariant at runtime.

### Deductive inference contracts

- **`SuggestAnswerInference`** `{ type: "suggest_answer", questionId, optionId }` — a soft directional guess: "likely pick X". It prefills but rarely auto-resolves.
- **`ExcludeAnswerInference`** `{ type: "exclude_answer", questionId, optionId }` — a hard elimination: "X is ruled out". Always Definition-tier, always certain.
- **`AnswerInference`** = the union of the two above. **`AnswerInferenceRule`** is a `BehaviorRule` plus an `effects: AnswerInference[]` list (one rule can carry several effects).
- **`EvaluatedAnswerInference`** `{ inference, confidence, sourceRuleId, evidence, explanations }` — a fired inference stamped with _why_ (source rule) and _how strongly_. This is the public, explainable telemetry record of every deduction.

**Significance of the suggest/exclude split:** it is the three-tier taxonomy in miniature. Suggestions are soft and reversible; exclusions are absolute. The belief engine treats them completely differently (accumulate vs. hard-zero).

### Evaluative question contracts

- **`QuestionRelevanceModifier`** — a conditional relevance shove: `conditions`, `adjustment` (can be negative), `reason`, and either `evidence: "Definition"` or a single `confidence` (the tier is derived). Same one-dial discipline as rules.
- **`QuestionRelevanceEvaluator`** `{ questionId, modifiers[] }` — the full scoring recipe for one question.
- **`EvaluatedQuestionRelevance`** `{ questionId, score, explanations, evidence: Set }` — the resulting relevance score plus the ordered evidence that produced it.

**Significance:** this is the _relevance_ axis — how much a question matters to ask — as opposed to the _belief_ axis — what we think the answer is. The engines keep them separate and only `deriveQuestionPresentation` merges them.

### Contradiction / resolution / archetype contracts

- **`ContradictionRule`** — a `BehaviorRule` plus `reason` and `severity` (`info | warning`). Hand-authored, narratively surprising _combinations_.
- **`DetectedContradiction`** `{ id, reason, severity, confidence, evidence, conflictingAnswers, explanations }` — a fired contradiction. `conflictingAnswers` lists the specific answers involved, so the clarification step needs no re-derivation.
- **`Clarification`** `{ id, reason, severity, confidence, conflictingAnswers, reaskQuestionId, explanations }` — an actionable prompt: "these answers conflict — re-confirm question Y".
- **`CheckInArchetype`** — a `BehaviorRule` plus `name` and `bonus` (a ranking boost). A recognizable session _pattern_ (e.g. Deep Work).
- **`EvaluatedArchetype`** — an archetype stamped with its progress: `satisfiedCount/totalConditions`, `emergence: "emerging" | "confirmed"`, scaled confidence, and the explanation.

### Belief contracts (the presentation input)

- **`OptionBelief`** `{ optionId, support, contributingRuleIds, evidence }` — how strongly the accumulated evidence supports one option. `support` is the noisy-OR combined confidence; `contributingRuleIds` make the belief auditable; `evidence` is the strongest contributor's derived tier (display/audit only — the resolve bar keys on `support`).
- **`QuestionBelief`** `{ questionId, beliefs[], excludedOptionIds: Set }` — the belief engine's per-question output. Exactly what `deriveQuestionPresentation` consumes.

### UI contracts

- **`QuestionPresentationState`** — the full state lattice: `hidden | collapsed | deferred | optional | active | suggested | resolved | competing | clarify`. Each is a distinct render affordance, from "don't show" to "one-tap confirm".
- **`QuestionPresentation`** `{ state, prefilledOptionIds, disabledOptionIds, soleRemainingOptionId, competingOptionIds? }` — everything the UI needs to draw one question's options. `competingOptionIds` is only present in the `competing` state and carries the alternative the system is torn between.

### Orchestration contracts (the output)

- **`QuestionView`** `{ questionId, presentation, score, explanations, evidence[] }` — a question plus its presentation decision and the reasoning behind it.
- **`RankedQuestion`** `{ questionId, score, uncertainty, archetypePull, valueOfInformation, order }` — an unanswered question ranked by behavioral value (VOI), with the composite broken out so the UI (and debug mode) can see _why_ it ranks where it does.
- **`CheckInUnderstanding`** — the single, unified read: `questionIds`, `questions`, `inferences`, `contradictions`, `clarifications`, `archetypes`, `remainingQuestions`. One object, everything the UI needs.
- **`CheckInRuleSets`** — optional per-call overrides for any of the four rule families; defaults come from `ruleDefinitions.ts`.

---

## Brain: who does what

Knowledge functions live in `engine.ts`. Each has **exactly one responsibility** and is a plain exported function (no class in the public surface). Functions produce _knowledge_; only `deriveQuestionPresentation` decides _UI_, and it lives in its own module (`presentationPolicy.ts`) precisely so the knowledge layer and the single UI-deciding component stay physically separated.

### `conditionHolds` + `conditionIsApplicable` (the single interpreter of `Condition`)

A stateless class of static methods that every engine and rule relies on:

- **`holds(condition, context)`** — runtime truth. Does this condition currently match? (Did they answer X? Is this GIS attached? Did the score clear the weight? Is this the domain?)
- **`isApplicable(condition, context)`** — _could_ this condition ever be true in this check-in? A condition on a non-participating question/GIS can never hold. This is the scoping primitive that lets the orchestrator drop irrelevant reasoning while keeping truth-checking in one place.
- **`buildLookups(context)`** — precomputes the pass-invariant enabled-GIS and participating-question sets once per pass, so the hot condition evaluator never rebuilds them.

**Why the `holds`/`isApplicable` split:** `holds` answers "is it true now," `isApplicable` answers "is it worth considering at all." The exhaustive `never` switch throws on unknown condition types, so adding a new condition kind is a compile-time-forced change.

### Orchestrator — `orchestrator.ts`

`evaluateCheckIn(context, ruleSets?)` is the single public entry point. Steps:

1. **Scope.** Filter every rule family to the participating question/GIS set via `conditionIsApplicable`, so no reasoning ever targets a question that isn't being asked. Also auto-generate same-question mutual-exclusion contradiction rules from the participating single-select questions (`generateMutualExclusionContradictions`).
2. **Run.** Call all engines over the same (immutable) context, threading the shared `lookups` so the pass-invariant sets are built once.
3. **Fold.** Accumulate per-option beliefs, assemble per-question `QuestionView`s, apply the `"clarify"` presentation override where a clarification targets a question, and compute the value-of-information ranking.
4. **Return** a single `CheckInUnderstanding`.

### Engines

| Component                   | Responsibility                                                                                                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `evaluateAnswerInferences`  | Filters rules whose conditions all `conditionHolds`, sorts them by effective confidence (deterministic precedence), and flattens each rule's effects into the explainable `EvaluatedAnswerInference[]` — the debug/telemetry record and the belief engine's input. |
| `evaluateBeliefs`           | **The UX core.** Turns the inference list into a per-option belief for every question. Suggestions combine via noisy-OR (`1 - Π(1 - c_i)` over confidences); exclusions hard-zero the option outright. See below.                                                  |
| `evaluateQuestionRelevance` | Scores each question's relevance: base score (tier × baseWeight default) plus each applicable modifier's `adjustment × confidence`, clamped to [0,1], with the ordered explanations behind every adjustment.                                                       |
| `detectContradictions`      | Detects suspicious answer combinations (curated narratively-surprising pairs + auto-derived mutual exclusions) and emits `DetectedContradiction`s with severity.                                                                                                   |
| `deriveClarifications`      | **A pure transform** over `DetectedContradiction[]` → actionable `Clarification`s (the conflicting answers and the question to re-ask). No second filter pass.                                                                                                     |
| `evaluateCheckInArchetypes` | Recognizes session patterns with partial matching. Emits `EvaluatedArchetype`s that are `emerging` (≥ half of signals) or `confirmed` (all signals), with confidence scaled by progress.                                                                           |

### `evaluateBeliefs` (winner-take-all is gone)

`evaluateBeliefs` turns the inference list into per-option beliefs instead of reducing suggestions to a single `Math.max` winner — agreement is expressed as a noisy-OR combination and every contributor is retained.

**Why noisy-OR and not `max`?** `max` throws away everything but the winner and can't express _agreement_. Noisy-OR is the probabilistic way to say "more independent sources agreeing ⇒ more confident," which is exactly how a human gets more sure. And because each belief retains its contributors, it stays auditable.

- **Suggest effects** combine via noisy-OR, so independent agreeing signals genuinely reinforce each other (two `0.9`-confidence signals compound to `0.99`), and disagreeing signals both survive in the same map.
- **Exclude effects** are always Definition-tier and **hard-zero** the option's support — no blending, no ambiguity.
- Each belief keeps the strongest contributor's derived evidence tier (for display/audit); the resolve decision keys on `support`, not the tier.

`OptionBelief` = `{ optionId, support, contributingRuleIds, evidence }`, grouped per
question into `QuestionBelief = { questionId, beliefs, excludedOptionIds }`.

### `evaluateQuestionRelevance`

Scores each question's relevance: start at the base score (GIS tier default blended with the GIS's `baseWeight`), apply every modifier whose conditions `holds`, scaling the adjustment by the modifier's resolved confidence. Clamps to `[0,1]`, sorts explanations by confidence (then reason).

**Why one confidence dial and no tier weight?** The old `0.6 + confidence*0.8` formula ignored evidence entirely; the later `confidence × tierWeight` double-counted it. Now a modifier's effect is `adjustment × its single confidence` — one number, no separate tier scaling, no redundancy.

### `detectContradictions` + `deriveClarifications`

`detectContradictions` finds rules whose conditions all `holds` and turns them into `DetectedContradiction`s (with `conflictingAnswers` extracted from their `question_answer` conditions). It serves both curated contradictions _and_ the auto-generated mutual-exclusion rules.

`deriveClarifications` is **a pure transform** — no second filter pass. It takes already-detected contradictions and maps each into a `Clarification`, computing `reaskQuestionId` by picking the _most recently given_ conflicting answer (the most likely slip).

**Why merged?** `detectContradictions` fires rules whose conditions all `holds`; `deriveClarifications` is a mapping over those already-detected results (no second filter pass computing the same predicate).

### `evaluateCheckInArchetypes`

For each archetype, counts how many conditions `holds`. Surfaces it only if fully satisfied (`confirmed`) or if the satisfied fraction clears the emergence floor (`emerging`). Confidence scales with progress for `emerging` archetypes; Definition archetypes get full confidence.

**Why the floor?** Surfacing a 1-of-3 match as a "pattern" would be noise. Requiring ≥ half of the signals keeps the feature honest.

---

## Presentation: the output contract

`CheckInUnderstanding` is what the UI consumes.

| Field                       | The UI uses it for                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `questions: QuestionView[]` | render each question; `QuestionView.presentation` + `explanations` say _how_ and _why_ |
| `inferences`                | debug/telemetry; also source of prefills & disabled options                            |
| `contradictions`            | surface "these conflict" notices                                                       |
| `clarifications`            | the active re-confirm prompt (which question to revisit)                               |
| `archetypes`                | session badges / context ("this is shaping up like Deep Work")                         |
| `remainingQuestions`        | the ordered list of what to ask next                                                   |

`QuestionPresentation` per question:

- `state` — `hidden | collapsed | deferred | optional | active | suggested | resolved | competing | clarify`
- `prefilledOptionIds` — options to prefill (array: multi-select-safe)
- `disabledOptionIds` — options ruled out (hard exclusions)
- `soleRemainingOptionId` — when exactly one option survives, render a one-tap confirm
- `competingOptionIds` — populated only in `competing` state: the alternative(s) the system is genuinely torn between (a soft "also consider X" hint)

### The margin-based resolve (and the `competing` state)

`resolveOption` decides when accumulated belief is strong enough to auto-resolve:

```
sorted beliefs by support margin = top.support - (runnerUp?.support ?? 0)

if top.support >= MIN_RESOLVE_SUPPORT && margin >= MIN_RESOLVE_MARGIN → resolved else if runnerUp.support > COMPETING_FLOOR                           → competing else                                                                 → suggested
```

The resolve bar is a **single threshold on `support`** (`MIN_RESOLVE_SUPPORT` = `0.95`), keyed on the actual accumulated confidence rather than a per-tier table. Because `support` is a noisy-OR of confidences, this is intentionally conservative: a lone heuristic (≤ `0.9`) never auto-resolves; only a Definition rule (support `1.0`) or two strong agreeing signals (e.g. `0.9 + 0.9 → ~0.99`) clear it. Confidences are compared as-is, so a thin margin surfaces as an honest `competing` state instead of a fake-confident resolve.

**`competing` is deliberately non-blocking.** Curated contradictions go through the full `clarify` reconfirm flow because they are hand-picked, narratively surprising pairs worth interrupting for. A competing belief is different: it's the system honestly saying "two decent signals disagree, here's our best guess and the alternative" — a small "we're not totally sure — also consider X" chip next to the prefilled pick, never a modal.

### `deriveQuestionPresentation` precedence (a live deduction always wins over hiding)

1. directly answered → `resolved`
2. top belief clears its bar AND margin → `resolved` (prefilled)
3. top belief + runner-up above the competing floor → `competing` (soft hint)
4. any live deduction (suggest OR exclude) → `suggested`/`active` (kept visible)
5. otherwise → score-based `hidden/collapsed/deferred/optional/active`

A belief must clear `MIN_SUPPORT_FLOOR` to count as a "live deduction" — a sub-10% signal is effectively noise and must not bypass the relevance cascade or force a prefill.

---

## Knowledge — `ruleDefinitions.ts`

The product's behavioral understanding, authored once: `ANSWER_INFERENCE_RULES` (deductive effects), `QUESTION_EVALUATORS` (relevance shaping), `CONTRADICTION_RULES` (cross-question conflicts), `SESSION_ARCHETYPES` (session signatures).

### The taxonomy of "the system has an opinion"

These are three genuinely different strengths:

1. **Hard exclude** (`exclude_answer`, Definition-tier, confidence forced to 1.0) → the option is removed from the UI outright. No ambiguity, no belief math. The belief engine hard-zeros it.
2. **Curated `ContradictionRule`** → hand-authored, narratively surprising, and **worth interrupting for** — facts about _combinations_ the belief engine can't infer on its own (e.g. "recovered but derailed"). The list stays small: pairs already handled by a hard exclude or by same-question belief competition are not re-authored here.
3. **Competing belief** (generic, auto-derived) → falls out of the belief engine for free whenever two options of the same question both clear the competing floor. No hand-authoring needed — there are combinatorially too many possible co-occurring suggestion pairs to ever hand-write.

### `BehaviorRule` is a discriminated union

The invalid state — a "definitional" rule with 92% confidence, which doesn't mean anything — is **unrepresentable**, not just avoided by convention:

```ts
type BehaviorRule =
  | { evidence: "Definition"; confidence?: never; ... }        // always certain, no dial
  | { confidence: number; ... };                               // heuristic: one confidence, tier derived
```

`Definition` rules cannot declare a confidence dial; heuristics declare a single confidence and the tier is derived. `QuestionRelevanceModifier` follows the same discipline.

---

## Calibration — `src/domain/config/tuningConstants.ts`

All thresholds live in one place **outside** this package (in `src/domain/config/`) since they are shared with the check-in scoring + trajectory engines:

- **`MIN_RESOLVE_SUPPORT`** (`0.95`) — the single resolve bar on belief support. A lone heuristic never clears it; Definition (support 1.0) or two strong agreeing signals do. Adjusting one number retunes resolve aggressiveness globally.
- **`STRONG_HEURISTIC_MIN` / `WEAK_HEURISTIC_MIN`** — the non-overlapping bands that derive a heuristic tier from confidence (`≥0.85` Strong, `≥0.5` Weak, else Hypothesis).
- **`MIN_RESOLVE_MARGIN`** — the lead the top belief must hold over the runner-up to auto-resolve instead of surfacing `competing`.
- **`COMPETING_FLOOR`** — the runner-up support that turns a close call into a `competing` presentation.
- **`MIN_SUPPORT_FLOOR`** — the support below which a belief is treated as noise (not a live deduction).
- Tier default scores and the baseWeight blend (`DEFAULT_QUESTION_SCORE_BY_TIER`, `DEFAULT_SCORE_BASE_WEIGHT_FLOOR`, `MAX_GIS_BASE_WEIGHT`), archetype emergence fraction, VOI uncertainty weights, and the presentation tiers.
- `clampScore` (3-decimal VOI rounding) keeps ordering deterministic against floating-point noise.

---

## Features the engine enables

Mapped to the product requirement ("intelligent companion, not a static questionnaire"):

1. **Progressive refinement** — the whole brain is re-run after every answer, so each new fact immediately re-ranks what's left.
2. **Conservative inference of likely answers** — `suggest_answer` prefills an option, only auto-`resolved` when its accumulated belief clears the resolve bar (with a margin guard).
3. **Compounding agreement** — two independent signals that agree genuinely make Rival _more_ confident (noisy-OR), the way a human would; they can resolve together even when neither alone would.
4. **Elimination of impossible/contradictory options** — `exclude_answer` + `disabledOptionIds`; live deductions are never hidden.
5. **"One option left" auto-collapse** — `soleRemainingOptionId` turns a nearly-decided question into a one-tap confirm (the biggest friction reducer).
6. **Honest uncertainty** — when signals genuinely disagree with no clear winner, the question surfaces as `competing` (a soft "also consider X" hint) instead of confidently prefilling a coin-flip.
7. **Question re-ranking by value of information** — `remainingQuestions` ordered by `score × uncertainty + archetypePull`, so the interaction gets shorter and more relevant as it goes.
8. **Emerging session archetypes** — `emerging`/`confirmed` patterns surface as the session forms, and an emerging archetype pulls forward its confirming question.
9. **Contradiction + clarification loop** — conflicting answers produce a `Clarification` and flip the re-ask question to the `clarify` state.
10. **Auto-derived mutual exclusions** — single-select option pairs generate contradictions from structure, not hand-authored rules.
11. **Explainability everywhere** — every decision carries `reason`, `confidence`, `evidence`, and (for relevance) the ordered explanation list; fully deterministic ordering.
12. **GIS scoping** — reasoning is always confined to the participating questions, so Rival never deduces about questions the user won't see.

---

## How the rest of the UI uses this engine's intelligence

The engine is deliberately UI-agnostic: it returns decisions + reasons, and the UI renders them. The integration surface is a **single check-in viewmodel** that owns the loop:

```
answer(questionId, value):
  append to context.answeredSoFar          # a new fact
  understanding = evaluateCheckIn(context) # re-run the brain
  render(understanding)                    # draw what it says
```

Concrete rendering decisions the UI makes _from_ the understanding — it never re-derives reasoning itself:

- **Flow of questions** → iterate `remainingQuestions` in order (or `questions`).
- **A question's options** → render from the GIS definition, honoring `disabledOptionIds` (show as ruled-out with the reason) and `prefilledOptionIds` (pre-selected, visually distinct as "suggested").
- **Confirm collapse** → if `soleRemainingOptionId` is set, render a single confirm button instead of the full option list.
- **Competing hint** → if `state` is `competing`, render a small "also consider X" chip (from `competingOptionIds`) next to the prefilled pick — a soft, non-blocking affordance.
- **Clarification** → if a question is in `clarify` state, render a "you said X, but that conflicts with Y — which is right?" prompt; the user's choice is just another `answer()` call that re-runs the brain.
- **Archetype cues** → if `archetypes` contains `emerging`/`confirmed`, show a subtle context badge ("shaping up like Deep Work").
- **Session summary / result** → consume `archetypes`, `contradictions`, and the final score to personalize the result phase.
- **Debug/explain mode** → render `explanations` verbatim for any question.

Nothing outside the viewmodel calls the engines directly. The package has no single `index.ts` barrel — consumers import the entry points they need by deep path: `@/domain/inferences/orchestrator` (`evaluateCheckIn`), `@/domain/inferences/types` (the contracts), the rule sets, and the engines (for testing/tooling), and the evidence helpers.

---

## Design note: evidence and confidence are one dial

Evidence and confidence are a single axis, not two: authors set one `confidence` number for a heuristic, and the evidence tier is **derived** from it. There is no separate tier scaling, so a tier label can never fight its own confidence number:

- **Confidence is the single number authors set** (for heuristics). It is the "how much" — both the belief `support` contribution and the relevance adjustment.
- **Evidence is a derived label** from that confidence (via `deriveEvidence`), used for display, audit, and logging — it never shapes the math.
- **`Definition` is the one special flag**: logical certainty, confidence forbidden, always effective `1.0`.

`Hypothesis` is the derived band below `0.5`; no authored rule lands there today, and any such rule would be labeled automatically.

---

## Rule authoring guide

1. Prefer simple `conditions` with an explicit `reason`.
2. Use `effects` only for high-certainty deductions; use evaluator modifiers for uncertain relevance shaping.
3. Set a single `confidence` conservatively for heuristics — the tier is derived, so **do not** author an `evidence` tier next to it. Mark a rule `Definition` only if it is logically certain, and never give a Definition rule a confidence. Excludes are always Definition-tier.
4. Define rules bidirectionally where the relationship is symmetric (e.g. flow ↔ friction), so behavior is order-independent.
5. Do not hand-author a contradiction for a pair already handled by a hard exclude or by same-question belief competition — reserve curated contradictions for genuinely surprising combinations worth interrupting for.
6. Let `ruleDefinitions.integrity.test.ts` validate referential integrity, unique ids, Definition-tier exclusions, exclusion uniqueness, and well-formed confidence/Definition flags.
7. **Pick condition types to match the signal.** `weight` conditions react to an accumulated per-GIS score rather than one option's exact wording — the right tool when a rule should respond to how the session is scoring overall.

---

## Testing strategy

- `conditionEvaluator.test.ts` — condition semantics against real GIS ids.
- `engine.test.ts` — noisy-OR compounding, disagreeing signals surviving, hard-zero exclusions, dominant-tier evidence.
- `orchestrator.test.ts` — end-to-end `evaluateCheckIn` behavior (scoping, deductions, one-option-left, tier/baseWeight defaults, evidence-derived resolve, competing state, compound resolve, emerging archetypes, VOI pull, mutual exclusions, clarifications, determinism).
- `ruleDefinitions.golden.test.ts` — stable golden outputs for canonical scenarios.
- `ruleDefinitions.integrity.test.ts` — every rule reference resolves; ids unique; exclusions are Definition-tier and non-duplicated; confidences normalized.

Recommended command:

```bash
npx vitest run --config vite.config.ts src/domain/inferences
```

---

## Putting it together: the full flow

```
User answers  →  viewmodel builds AnsweredOption[]  →  CheckInContext
                                                      │
        ┌──────────────────────────────────────────┼──────────────────────────────┐
        ▼                                          ▼                              ▼
  scoped answer rules                        scoped evaluators               scoped archetypes
        │                                          │                              │
 evaluateAnswerInferences                 evaluateQuestionRelevance    evaluateCheckInArchetypes
  (flat, explainable)                     (relevance scores)             (emerging/confirmed)
        │                                          │                              │
        ▼                                          ▼                              ▼
 evaluateBeliefs ───────────────────►  evaluatedByQuestion ───────────►  archetypePull
  (per-option support)                              │                          │
        │                                          ▼                          ▼
        └──────────────────────────────►  deriveQuestionPresentation  ──►   VOI ranking
                                             (per-question state)        ──► remainingQuestions
 detectContradictions ─► deriveClarifications (transform) ─► clarifications
        │                                                  │
        ▼                                                  ▼
   contradictions                            CheckInUnderstanding (rendered)
```

Every box is pure and deterministic; the same context always yields the same understanding. That determinism, the explainability (`reason`/`confidence`/ `evidence`/`contributingRuleIds` everywhere), the single confidence dial, and the conservative margin-guarded resolve are what make Rival an _intelligent, trustworthy companion_ rather than a static questionnaire.

