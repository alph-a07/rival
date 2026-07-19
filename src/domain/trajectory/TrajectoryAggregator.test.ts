import { expect, test, describe } from "vitest";
import { TrajectoryAggregator } from "./TrajectoryAggregator";

describe("TrajectoryAggregator", () => {
  describe("zScore", () => {
    test("returns baseline false if history is less than 2 items", () => {
      expect(TrajectoryAggregator.zScore(5, [1])).toEqual({
        value: 0,
        hasBaseline: false,
      });
      expect(TrajectoryAggregator.zScore(5, [])).toEqual({
        value: 0,
        hasBaseline: false,
      });
    });

    test("returns baseline false if history variance is exactly 0", () => {
      // Mean = 5, Stdev = 0.
      expect(TrajectoryAggregator.zScore(6, [5, 5, 5])).toEqual({
        value: 0,
        hasBaseline: false,
      });
    });

    test("calculates standard z-score correctly with baseline true", () => {
      // History: 2, 4, 4, 4, 5, 5, 7, 9. Mean = 5, Stdev = 2.
      const history = [2, 4, 4, 4, 5, 5, 7, 9];

      expect(TrajectoryAggregator.zScore(5, history)).toEqual({
        value: 0,
        hasBaseline: true,
      });
      expect(TrajectoryAggregator.zScore(7, history)).toEqual({
        value: 1,
        hasBaseline: true,
      });
      expect(TrajectoryAggregator.zScore(3, history)).toEqual({
        value: -1,
        hasBaseline: true,
      });
    });
  });

  describe("domainRollup", () => {
    test("averages z-scores of current endeavours", () => {
      const history = [2, 4, 4, 4, 5, 5, 7, 9]; // Mean=5, Stdev=2
      // endeavour 1: 7 (z=1)
      // endeavour 2: 3 (z=-1)
      // endeavour 3: 9 (z=2)
      // Average z-score = (1 + -1 + 2) / 3 = 2/3
      const rollup = TrajectoryAggregator.domainRollup([7, 3, 9], history);

      expect(rollup.hasBaseline).toBe(true);
      expect(rollup.value).toBeCloseTo(2 / 3, 3);
    });

    test("returns baseline false if no endeavours exist in domain", () => {
      expect(TrajectoryAggregator.domainRollup([], [1, 2, 3])).toEqual({
        value: 0,
        hasBaseline: false,
      });
    });

    test("excludes endeavours that do not have a baseline yet", () => {
      // If history is empty, all these trends will yield hasBaseline: false
      const rollup = TrajectoryAggregator.domainRollup([7, 3, 9], []);
      expect(rollup).toEqual({ value: 0, hasBaseline: false });
    });
  });

  describe("overallTrajectory", () => {
    test("averages domain rollups directly", () => {
      const overall = TrajectoryAggregator.overallTrajectory([
        { value: 1.5, hasBaseline: true },
        { value: -0.5, hasBaseline: true },
        { value: 0.5, hasBaseline: true },
      ]);

      expect(overall.hasBaseline).toBe(true);
      expect(overall.value).toBeCloseTo(0.5, 3);
    });

    test("returns baseline false if no domains exist", () => {
      expect(TrajectoryAggregator.overallTrajectory([])).toEqual({
        value: 0,
        hasBaseline: false,
      });
    });

    test("excludes domains without a baseline from the average calculation", () => {
      const overall = TrajectoryAggregator.overallTrajectory([
        { value: 1.5, hasBaseline: true },
        { value: 0, hasBaseline: false }, // Should be ignored entirely, not treated as 0
        { value: 0.5, hasBaseline: true },
      ]);

      // The average should be (1.5 + 0.5) / 2 = 1.0.
      // If the false baseline was incorrectly included as a 0, it would be (1.5 + 0 + 0.5) / 3 = 0.66
      expect(overall.hasBaseline).toBe(true);
      expect(overall.value).toBe(1.0);
    });
  });
});
