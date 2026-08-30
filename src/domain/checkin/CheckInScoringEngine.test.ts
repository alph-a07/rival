import { expect, test, describe } from "vitest";
import { CheckInScoringEngine } from "./CheckInScoringEngine";
import type { Response } from "@/data/schema/CheckIn";
import type { Gis, GisTier } from "@/domain/models/Gis";

describe("CheckInScoringEngine", () => {
  const mockGisA: Gis = {
    id: "gis_a",
    name: "GIS A",
    baseWeight: 10,
    questions: [
      {
        id: "q1",
        text: "Single-select question",
        type: "single-select",
        options: [
          { id: "a1", label: "Full", value: 1.0 },
          { id: "a2", label: "Half", value: 0.5 },
          { id: "a3", label: "None", value: 0.0 },
        ],
      },
    ],
  };

  const mockGisB: Gis = {
    id: "gis_b",
    name: "GIS B",
    baseWeight: 5,
    questions: [
      {
        id: "q2",
        text: "Single-select question",
        type: "single-select",
        options: [
          { id: "b1", label: "Yes", value: 1.0 },
          { id: "b2", label: "No", value: 0.0 },
        ],
      },
    ],
  };

  const mockGisC: Gis = {
    id: "gis_c",
    name: "GIS C",
    baseWeight: 10,
    questions: [
      {
        id: "q3",
        text: "Multi-select question",
        type: "multi-select",
        options: [
          { id: "c1", label: "Option 1", value: 0.6 },
          { id: "c2", label: "Option 2", value: 0.5 },
          { id: "c3", label: "Option 3", value: 0.3 },
        ],
      },
    ],
  };

  const mockGisD: Gis = {
    id: "gis_d",
    name: "GIS D (Multi-Question)",
    baseWeight: 10,
    questions: [
      {
        id: "q_first",
        text: "Question 1",
        type: "single-select",
        options: [
          { id: "opt1", label: "Perfect", value: 1.0 },
          { id: "opt2", label: "Zero", value: 0.0 },
        ],
      },
      {
        id: "q_second",
        text: "Question 2",
        type: "single-select",
        options: [
          { id: "opt3", label: "Perfect", value: 1.0 },
          { id: "opt4", label: "Half", value: 0.5 },
        ],
      },
    ],
  };

  const mockGisMixedTypes: Gis = {
    id: "gis_mixed",
    name: "GIS Mixed Question Types",
    baseWeight: 10,
    questions: [
      {
        id: "q_single",
        text: "Single Select Question",
        type: "single-select",
        options: [
          { id: "opt_s1", label: "Perfect", value: 1.0 },
          { id: "opt_s2", label: "Half", value: 0.5 },
        ],
      },
      {
        id: "q_multi",
        text: "Multi Select Question",
        type: "multi-select",
        options: [
          { id: "opt_m1", label: "Habit A", value: 0.4 },
          { id: "opt_m2", label: "Habit B", value: 0.4 },
          { id: "opt_m3", label: "Habit C", value: 0.4 },
        ],
      },
    ],
  };

  describe("calculateRawScore", () => {
    test("applies tier penalties to non-mandatory GIS", () => {
      const activeGis: Map<Gis, GisTier> = new Map([
        [mockGisA, "mandatory"],
        [mockGisB, "recommended"],
      ]);
      // Total possible weight = 13.75
      const responses: Response[] = [
        { gisId: "gis_a", questionId: "q1", optionIds: ["a1"] }, // earns 10
        { gisId: "gis_b", questionId: "q2", optionIds: ["b2"] }, // earns 0
      ];

      const score = CheckInScoringEngine.calculateRawScore(activeGis, responses);
      // 10 / 13.75 * 100 = 72.7272...
      expect(score).toBeCloseTo(72.72, 1);
    });

    test("ignores unanswered GIS safely (friction budget trim)", () => {
      const activeGis: Map<Gis, GisTier> = new Map([[mockGisB, "optional"]]);
      const responses: Response[] = [{ gisId: "gis_b", questionId: "q2", optionIds: ["b1"] }];

      const score = CheckInScoringEngine.calculateRawScore(activeGis, responses);
      expect(score).toBe(100);
    });

    test("penalizes a GIS that is active but genuinely unanswered", () => {
      const activeGis: Map<Gis, GisTier> = new Map([
        [mockGisA, "mandatory"],
        [mockGisB, "mandatory"],
      ]);
      const responses: Response[] = [
        { gisId: "gis_a", questionId: "q1", optionIds: ["a1"] },
        // no response for gis_b at all
      ];

      // Total possible = 15. Earned = 10. Score = 66.67, not 100.
      const score = CheckInScoringEngine.calculateRawScore(activeGis, responses);
      expect(score).toBeCloseTo(66.67, 1);
    });

    test("applies hybrid modifiers and caps at 100", () => {
      const activeGis: Map<Gis, GisTier> = new Map([[mockGisA, "mandatory"]]);
      const responses: Response[] = [{ gisId: "gis_a", questionId: "q1", optionIds: ["a1"] }];

      const score = CheckInScoringEngine.calculateRawScore(activeGis, responses, 1.2);
      expect(score).toBe(100);

      const score2 = CheckInScoringEngine.calculateRawScore(activeGis, responses, 0.8);
      expect(score2).toBe(80);
    });

    test("returns 0 if total possible weight is 0", () => {
      expect(CheckInScoringEngine.calculateRawScore(new Map(), [], 1.0)).toBe(0);
    });

    test("sums values of multiple selected options", () => {
      const activeGis: Map<Gis, GisTier> = new Map([[mockGisC, "mandatory"]]);
      const responses: Response[] = [
        { gisId: "gis_c", questionId: "q3", optionIds: ["c1", "c3"] }, // 0.6 + 0.3 = 0.9
      ];

      const score = CheckInScoringEngine.calculateRawScore(activeGis, responses);
      expect(score).toBe(90);
    });

    test("caps combined value at 1.0 when selections exceed it", () => {
      const activeGis: Map<Gis, GisTier> = new Map([[mockGisC, "mandatory"]]);
      const responses: Response[] = [
        { gisId: "gis_c", questionId: "q3", optionIds: ["c1", "c2"] }, // 0.6 + 0.5 = 1.1 -> capped to 1.0
      ];

      const score = CheckInScoringEngine.calculateRawScore(activeGis, responses);
      expect(score).toBe(100);
    });

    test("ignores unknown option ids within a multi-select response", () => {
      const activeGis: Map<Gis, GisTier> = new Map([[mockGisC, "mandatory"]]);
      const responses: Response[] = [
        { gisId: "gis_c", questionId: "q3", optionIds: ["c1", "does_not_exist"] },
      ];

      const score = CheckInScoringEngine.calculateRawScore(activeGis, responses);
      expect(score).toBe(60);
    });

    test("treats a response with no valid option ids as unanswered", () => {
      const activeGis: Map<Gis, GisTier> = new Map([[mockGisA, "mandatory"]]);
      const responses: Response[] = [
        { gisId: "gis_a", questionId: "q1", optionIds: ["not_a_real_option"] },
      ];

      const score = CheckInScoringEngine.calculateRawScore(activeGis, responses);
      expect(score).toBe(0);
    });

    test("treats a response referencing an unknown questionId as unanswered", () => {
      const activeGis: Map<Gis, GisTier> = new Map([[mockGisA, "mandatory"]]);
      const responses: Response[] = [
        { gisId: "gis_a", questionId: "not_a_real_question", optionIds: ["a1"] },
      ];

      const score = CheckInScoringEngine.calculateRawScore(activeGis, responses);
      expect(score).toBe(0);
    });

    test("averages responses for a GIS with multiple questions", () => {
      const activeGis = new Map<Gis, GisTier>([[mockGisD, "mandatory"]]);

      const responses: Response[] = [
        { gisId: "gis_d", questionId: "q_first", optionIds: ["opt1"] }, // 1.0
        { gisId: "gis_d", questionId: "q_second", optionIds: ["opt4"] }, // 0.5
      ];

      // Average of 1.0 and 0.5 is 0.75 -> earned 7.5 / 10 = 75.
      const score = CheckInScoringEngine.calculateRawScore(activeGis, responses);
      expect(score).toBe(75);
    });

    test("averages responses for a GIS mixing single-select and multi-select questions", () => {
      const activeGis = new Map<Gis, GisTier>([[mockGisMixedTypes, "mandatory"]]);

      const responses: Response[] = [
        { gisId: "gis_mixed", questionId: "q_single", optionIds: ["opt_s2"] },
        {
          gisId: "gis_mixed",
          questionId: "q_multi",
          optionIds: ["opt_m1", "opt_m2"],
        },
      ];

      // Q1: 0.5. Q2: min(1.0, 0.4+0.4)=0.8. Avg = 0.65 -> score 65.
      const score = CheckInScoringEngine.calculateRawScore(activeGis, responses);
      expect(score).toBe(65);
    });

    test("penalizes partial completion of a multi-question GIS", () => {
      const activeGis = new Map<Gis, GisTier>([[mockGisD, "mandatory"]]);

      const responses: Response[] = [
        { gisId: "gis_d", questionId: "q_first", optionIds: ["opt1"] }, // scores 1.0
        // q_second is missing entirely
      ];

      // Q1 value: 1.0. Q2 value: 0 (missing). Avg = 0.5 -> score 50.
      const score = CheckInScoringEngine.calculateRawScore(activeGis, responses);
      expect(score).toBe(50);
    });

    test("clamps the score at the floor of 0", () => {
      const activeGis = new Map<Gis, GisTier>([[mockGisA, "mandatory"]]);
      const responses: Response[] = [{ gisId: "gis_a", questionId: "q1", optionIds: ["a1"] }];

      const score = CheckInScoringEngine.calculateRawScore(activeGis, responses, 0);
      expect(score).toBe(0);
    });
  });

  describe("computeByGisId", () => {
    const registry: Gis[] = [mockGisA, mockGisC, mockGisD];

    test("single-select resolves to the option's value", () => {
      const byGisId = CheckInScoringEngine.computeByGisId(
        [{ gisId: "gis_a", questionId: "q1", optionIds: ["a2"] }],
        registry,
      );
      expect(byGisId["gis_a"]).toBeCloseTo(0.5, 6);
    });

    test("multi-select sums and caps at 1.0", () => {
      const byGisId = CheckInScoringEngine.computeByGisId(
        [{ gisId: "gis_c", questionId: "q3", optionIds: ["c1", "c2"] }],
        registry,
      );
      expect(byGisId["gis_c"]).toBeCloseTo(1.0, 6);
    });

    test("averages across a GIS with multiple questions", () => {
      const byGisId = CheckInScoringEngine.computeByGisId(
        [
          { gisId: "gis_d", questionId: "q_first", optionIds: ["opt1"] }, // 1.0
          { gisId: "gis_d", questionId: "q_second", optionIds: ["opt4"] }, // 0.5
        ],
        registry,
      );
      expect(byGisId["gis_d"]).toBeCloseTo(0.75, 6);
    });

    test("partial completion drags the average toward 0", () => {
      const byGisId = CheckInScoringEngine.computeByGisId(
        [{ gisId: "gis_d", questionId: "q_first", optionIds: ["opt1"] }],
        registry,
      );
      expect(byGisId["gis_d"]).toBeCloseTo(0.5, 6);
    });

    test("skips responses for GIS not in the registry", () => {
      const byGisId = CheckInScoringEngine.computeByGisId(
        [{ gisId: "unknown", questionId: "q1", optionIds: ["a1"] }],
        registry,
      );
      expect(byGisId["unknown"]).toBeUndefined();
    });

    test("returns an empty record for no responses", () => {
      expect(CheckInScoringEngine.computeByGisId([])).toEqual({});
    });
  });
});
