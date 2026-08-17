import { describe, expect, test } from "vitest";
import { DomainRegistry } from "@/domain/domains/domainDefinitions";
import { GisRegistry } from "@/domain/gis/gisDefinitions";
import {
  ANSWER_INFERENCE_RULES,
  CONTRADICTION_RULES,
  QUESTION_EVALUATORS,
  CHECK_IN_ARCHETYPES,
} from "./ruleDefinitions";
import type { Condition } from "./types";

const optionByQuestion = new Map<string, Set<string>>();
for (const gis of GisRegistry.all()) {
  for (const question of gis.questions) {
    optionByQuestion.set(question.id, new Set(question.options.map((o) => o.id)));
  }
}
const gisIds = new Set(GisRegistry.all().map((g) => g.id));
const domainIds = new Set(DomainRegistry.all().map((d) => d.id));

function allConditions(): Condition[] {
  const fromRules = [
    ...ANSWER_INFERENCE_RULES,
    ...CONTRADICTION_RULES,
    ...CHECK_IN_ARCHETYPES,
  ].flatMap((rule) => rule.conditions);
  const fromEvaluators = QUESTION_EVALUATORS.flatMap((evaluator) =>
    evaluator.modifiers.flatMap((modifier) => modifier.conditions),
  );
  return [...fromRules, ...fromEvaluators];
}

describe("rule integrity", () => {
  test("all rule ids are unique across the package", () => {
    const ids = [
      ...ANSWER_INFERENCE_RULES.map((r) => r.id),
      ...CONTRADICTION_RULES.map((r) => r.id),
      ...CHECK_IN_ARCHETYPES.map((r) => r.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every question_answer condition references an existing question and option", () => {
    const conditions = allConditions().filter((c) => c.type === "question_answer");
    expect(conditions.length).toBeGreaterThan(0);
    for (const c of conditions) {
      expect(optionByQuestion.get(c.questionId)?.has(c.optionId)).toBe(true);
    }
  });

  test("every gis/weight condition references an existing GIS", () => {
    const conditions = allConditions().filter(
      (c): c is Extract<Condition, { type: "gis" | "weight" }> =>
        c.type === "gis" || c.type === "weight",
    );
    for (const c of conditions) {
      expect(gisIds.has(c.gisId)).toBe(true);
    }
  });

  test("every domain condition references an existing domain", () => {
    const conditions = allConditions().filter((c) => c.type === "domain");
    for (const c of conditions) {
      expect(domainIds.has(c.domainId)).toBe(true);
    }
  });

  test("answer inference effects target existing questions and options", () => {
    for (const rule of ANSWER_INFERENCE_RULES) {
      for (const effect of rule.effects) {
        expect(optionByQuestion.get(effect.questionId)?.has(effect.optionId)).toBe(true);
      }
    }
  });

  test("question evaluators target existing questions", () => {
    for (const evaluator of QUESTION_EVALUATORS) {
      expect(optionByQuestion.has(evaluator.questionId)).toBe(true);
    }
  });

  test("every hard exclusion is Definition-tier and no option is excluded twice", () => {
    const excludeSeen = new Set<string>();
    for (const rule of ANSWER_INFERENCE_RULES) {
      const isDefinition = "evidence" in rule;
      for (const effect of rule.effects) {
        if (effect.type === "exclude_answer") {
          expect(isDefinition).toBe(true);
          const key = `${effect.questionId}:${effect.optionId}`;
          expect(excludeSeen.has(key)).toBe(false);
          excludeSeen.add(key);
        }
      }
    }
  });

  test("declared confidences are normalized and Definition flags are well-formed", () => {
    const rules = [...ANSWER_INFERENCE_RULES, ...CONTRADICTION_RULES, ...CHECK_IN_ARCHETYPES];
    for (const rule of rules) {
      if (rule.confidence !== undefined) {
        expect(rule.confidence).toBeGreaterThanOrEqual(0);
        expect(rule.confidence).toBeLessThanOrEqual(1);
      }
      if ("evidence" in rule) {
        expect(rule.evidence).toBe("Definition");
      }
    }
  });
});
