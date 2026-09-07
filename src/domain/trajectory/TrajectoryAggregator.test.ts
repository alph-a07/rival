import { expect, test, describe } from "vitest";
import {
  zScore,
  domainRollup,
  overallTrajectory,
  type TrajectoryReading,
} from "./trajectoryAggregator";

describe("trajectory aggregate fns", () => {
  describe("zScore", () => {
    test("returns baseline false (new) if history is less than 2 items", () => {
      expect(zScore(5, [1])).toEqual({
        value: 0,
        hasBaseline: false,
        label: "new",
      });
      expect(zScore(5, [])).toEqual({
        value: 0,
        hasBaseline: false,
        label: "new",
      });
    });

    test("returns baseline false (new) if history variance is exactly 0", () => {
      // Mean = 5, Stdev = 0.
      expect(zScore(6, [5, 5, 5])).toEqual({
        value: 0,
        hasBaseline: false,
        label: "new",
      });
    });

    test("calculates standard z-score correctly with baseline true", () => {
      // History: 2, 4, 4, 4, 5, 5, 7, 9. Mean = 5, Stdev = 2.
      const history = [2, 4, 4, 4, 5, 5, 7, 9];

      expect(zScore(5, history)).toEqual({
        value: 0,
        hasBaseline: true,
        label: "steady",
      });
      expect(zScore(7, history)).toEqual({
        value: 1,
        hasBaseline: true,
        label: "climbing",
      });
      expect(zScore(3, history)).toEqual({
        value: -1,
        hasBaseline: true,
        label: "cooling",
      });
    });
  });

  describe("domainRollup", () => {
    test("averages z-scores of current endeavours with derived label", () => {
      const history = [2, 4, 4, 4, 5, 5, 7, 9]; // Mean=5, Stdev=2
      // endeavour 1: 7 (z=1)
      // endeavour 2: 3 (z=-1)
      // endeavour 3: 9 (z=2)
      // Average z-score = (1 + -1 + 2) / 3 = 2/3 -> above CLIMB (0.5) => climbing
      const rollup = domainRollup([7, 3, 9], history);

      expect(rollup.hasBaseline).toBe(true);
      expect(rollup.value).toBeCloseTo(2 / 3, 3);
      expect(rollup.label).toBe("climbing");
    });

    test("returns baseline false (new) if no endeavours exist in domain", () => {
      expect(domainRollup([], [1, 2, 3])).toEqual({
        value: 0,
        hasBaseline: false,
        label: "new",
      });
    });

    test("excludes endeavours that do not have a baseline yet", () => {
      // If history is empty, all these trends will yield hasBaseline: false
      const rollup = domainRollup([7, 3, 9], []);
      expect(rollup).toEqual({ value: 0, hasBaseline: false, label: "new" });
    });
  });

  describe("overallTrajectory", () => {
    test("averages domain rollups directly, deriving the label from the average", () => {
      const overall = overallTrajectory([reading(1.5), reading(-0.5), reading(0.5)]);

      expect(overall.hasBaseline).toBe(true);
      // (1.5 + -0.5 + 0.5) / 3 = 0.5 -> exactly at CLIMB => climbing
      expect(overall.value).toBeCloseTo(0.5, 3);
      expect(overall.label).toBe("climbing");
    });

    test("returns baseline false (new) if no domains exist", () => {
      expect(overallTrajectory([])).toEqual({
        value: 0,
        hasBaseline: false,
        label: "new",
      });
    });

    test("excludes domains without a baseline from the average calculation", () => {
      const overall = overallTrajectory([reading(1.5), noBaseline(), reading(0.5)]);

      // The average should be (1.5 + 0.5) / 2 = 1.0.
      // If the false baseline was incorrectly included as a 0, it would be (1.5 + 0 + 0.5) / 3 = 0.66
      expect(overall.hasBaseline).toBe(true);
      expect(overall.value).toBe(1.0);
      expect(overall.label).toBe("climbing");
    });
  });

  describe("reading labels", () => {
    test("a reading without a baseline is labelled new", () => {
      expect(noBaseline().label).toBe("new");
      // Even a strongly positive raw value is new without a baseline to compare against
      expect(zScore(9, []).label).toBe("new");
    });

    test("a reading above the climb threshold is climbing", () => {
      expect(reading(0.6).label).toBe("climbing");
    });

    test("a reading below the cool threshold is cooling", () => {
      expect(reading(-0.6).label).toBe("cooling");
    });

    test("a reading between the thresholds is steady", () => {
      expect(reading(0).label).toBe("steady");
    });
  });
});

/**
 * Build a fully-labeled reading for a given normalized value (hasBaseline true).
 */
function reading(value: number): TrajectoryReading {
  return {
    value,
    hasBaseline: true,
    label: labelOf(value, true),
  };
}

/** A reading without a comparison baseline (label `new`). */
function noBaseline(): TrajectoryReading {
  return { value: 0, hasBaseline: false, label: "new" };
}

/** Mirror of the aggregator's private banding for building test inputs. */
function labelOf(value: number, hasBaseline: boolean): "climbing" | "steady" | "cooling" | "new" {
  if (!hasBaseline) {
    return "new";
  }
  if (value >= 0.5) {
    return "climbing";
  }
  if (value <= -0.5) {
    return "cooling";
  }
  return "steady";
}
