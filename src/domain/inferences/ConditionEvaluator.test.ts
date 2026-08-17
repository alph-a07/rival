import { describe, expect, test } from "vitest";
import { GisRegistry } from "@/domain/gis/gisDefinitions";
import { ConditionEvaluator } from "./ConditionEvaluator";
import type { CheckInContext, Condition } from "./types";

describe("ConditionEvaluator", () => {
  const enabledGis = GisRegistry.all().filter((gis) =>
    ["depth_of_focus", "time_invested", "challenge_stretch"].includes(gis.id),
  );
  const answeredSoFar = [{ questionId: "depth_of_focus_q1", optionId: "depth_of_focus_flow" }];
  const answerValueByGisId = { depth_of_focus: 0.82, time_invested: 0.4 };

  const baseContext: CheckInContext = { answeredSoFar, enabledGis, answerValueByGisId };

  /** Tests whether question_answer conditions are met */
  test("matches question_answer conditions", () => {
    const condition: Condition = {
      type: "question_answer",
      questionId: "depth_of_focus_q1",
      optionId: "depth_of_focus_flow",
    };
    expect(ConditionEvaluator.holds(condition, baseContext)).toBe(true);
  });

  /** Tests whether question_answer conditions fail when answer is not present */
  test("fails question_answer when answer is not present", () => {
    const condition: Condition = {
      type: "question_answer",
      questionId: "depth_of_focus_q1",
      optionId: "depth_of_focus_distracted",
    };
    expect(ConditionEvaluator.holds(condition, baseContext)).toBe(false);
  });

  /** Tests whether GIS attached and detached checks are met */
  test("matches gis attached and detached checks", () => {
    expect(
      ConditionEvaluator.holds(
        { type: "gis", gisId: "depth_of_focus", attached: true },
        baseContext,
      ),
    ).toBe(true);
    expect(
      ConditionEvaluator.holds(
        { type: "gis", gisId: "recovery_quality", attached: false },
        baseContext,
      ),
    ).toBe(true);
  });

  /** Tests whether weight conditions are evaluated correctly for gte and lte */
  test("evaluates weight conditions for gte and lte", () => {
    expect(
      ConditionEvaluator.holds(
        { type: "weight", gisId: "depth_of_focus", comparator: "gte", value: 0.8 },
        baseContext,
      ),
    ).toBe(true);
    expect(
      ConditionEvaluator.holds(
        { type: "weight", gisId: "time_invested", comparator: "lte", value: 0.5 },
        baseContext,
      ),
    ).toBe(true);
  });

  /** Tests whether missing GIS weight is treated as 0 */
  test("treats missing GIS weight as 0", () => {
    expect(
      ConditionEvaluator.holds(
        { type: "weight", gisId: "recovery_quality", comparator: "lte", value: 0.1 },
        baseContext,
      ),
    ).toBe(true);
    expect(
      ConditionEvaluator.holds(
        { type: "weight", gisId: "recovery_quality", comparator: "gte", value: 0.1 },
        baseContext,
      ),
    ).toBe(false);
  });

  /** Tests whether domain conditions are met */
  test("matches domain conditions", () => {
    const buildingContext: CheckInContext = { ...baseContext, selectedDomainId: "building" };
    expect(
      ConditionEvaluator.holds(
        { type: "domain", domainId: "building", attached: true },
        buildingContext,
      ),
    ).toBe(true);
    expect(
      ConditionEvaluator.holds(
        { type: "domain", domainId: "maintaining", attached: false },
        buildingContext,
      ),
    ).toBe(true);
  });

  /** Tests whether conditions are applicable based on scoping rules */
  describe("isApplicable (scoping)", () => {
    /** Tests whether question_answer conditions are applicable based on participation */
    test("participating question is applicable", () => {
      expect(
        ConditionEvaluator.isApplicable(
          { type: "question_answer", questionId: "depth_of_focus_q1", optionId: "x" },
          baseContext,
        ),
      ).toBe(true);
    });

    /** Tests whether question_answer conditions are not applicable when the user has not participated */
    test("non-participating question is not applicable", () => {
      expect(
        ConditionEvaluator.isApplicable(
          { type: "question_answer", questionId: "friction_encountered_q1", optionId: "x" },
          baseContext,
        ),
      ).toBe(false);
    });

    /** Tests whether GIS attached conditions are applicable based on enabled GIS */
    test("attached GIS must be enabled; absence conditions always applicable", () => {
      expect(
        ConditionEvaluator.isApplicable(
          { type: "gis", gisId: "depth_of_focus", attached: true },
          baseContext,
        ),
      ).toBe(true);
      expect(
        ConditionEvaluator.isApplicable(
          { type: "gis", gisId: "recovery_quality", attached: true },
          baseContext,
        ),
      ).toBe(false);
      expect(
        ConditionEvaluator.isApplicable(
          { type: "gis", gisId: "recovery_quality", attached: false },
          baseContext,
        ),
      ).toBe(true);
    });

    /** Tests whether weight conditions are applicable based on enabled GIS */
    test("weight requires enabled GIS; domain always applies", () => {
      expect(
        ConditionEvaluator.isApplicable(
          { type: "weight", gisId: "depth_of_focus", comparator: "gte", value: 0 },
          baseContext,
        ),
      ).toBe(true);
      expect(
        ConditionEvaluator.isApplicable(
          { type: "weight", gisId: "recovery_quality", comparator: "gte", value: 0 },
          baseContext,
        ),
      ).toBe(false);
      expect(
        ConditionEvaluator.isApplicable(
          { type: "domain", domainId: "maintaining", attached: true },
          baseContext,
        ),
      ).toBe(true);
    });
  });
});
