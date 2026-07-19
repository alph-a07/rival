import { expect, test, describe } from "vitest";
import { ConsistencyTracker } from "./ConsistencyTracker";
import { RIVAL_MATH_CONFIG } from "@/domain/config/tuningConstants";

describe("ConsistencyTracker", () => {
  describe("insufficient data gate (rival-v1-content-decisions.md §3)", () => {
    test("returns warming_up below n=5, regardless of residuals", () => {
      expect(ConsistencyTracker.evaluate([1, 2, 3], 4)).toBe("warming_up");
    });

    test("returns warming_up at n=5 if fewer than 4 valid residuals exist", () => {
      expect(ConsistencyTracker.evaluate([1, 2, 3], 5)).toBe("warming_up");
    });

    test("starts reading consistency once n=5 AND at least 4 valid residuals exist", () => {
      const result = ConsistencyTracker.evaluate([1, -1, 1, -1], 5);
      expect(result).not.toBe("warming_up");
    });

    test("ignores null placeholders from early check-ins when counting valid residuals", () => {
      expect(ConsistencyTracker.evaluate([null, 1, -1, 1, -1], 5)).not.toBe("warming_up");
    });
  });

  describe("adaptive window (w_min=5, w_max=21)", () => {
    test("window grows 1:1 with n between w_min and w_max", () => {
      const residuals = [50, -50, 60, -60, 50, -50, 60, -60, 50, -50, 1, -1];
      // stdev ~49.5 across all 12 -> deep in the top band
      expect(ConsistencyTracker.evaluate(residuals, 12)).toBe("in_the_storm");
    });

    test("window caps at 21 so old erratic residuals eventually fall out", () => {
      const erraticHead = [50, -50, 60, -60, 50, -50, 60, -60, 50, -50];
      const steadyTail = Array.from({ length: 25 }, (_, i) => (i % 2 === 0 ? 1 : -1));
      const full = [...erraticHead, ...steadyTail];

      // Mid-history (n=12): window=12 still includes the erratic head.
      expect(ConsistencyTracker.evaluate(full.slice(0, 12), 12)).toBe("in_the_storm");

      // Later (n=35): window caps at 21, entirely inside the steady tail.
      expect(ConsistencyTracker.evaluate(full, 35)).toBe("dialed_in");
    });
  });

  describe("dynamic stdev thresholds", () => {
    const thresholds = RIVAL_MATH_CONFIG.CONSISTENCY_THRESHOLDS;

    test("reads dynamic bands correctly based on config", () => {
      const tier0 = thresholds[0];
      const stdev0 = tier0.limit / 2; // Safely below the limit
      expect(ConsistencyTracker.evaluate(generateResiduals(stdev0), 6)).toBe(tier0.status);

      const tier2 = thresholds[2];
      const prevLimit = thresholds[1].limit;
      // Target an stdev exactly halfway between the previous limit and this limit
      const stdev2 = prevLimit + (tier2.limit - prevLimit) / 2;
      expect(ConsistencyTracker.evaluate(generateResiduals(stdev2), 6)).toBe(tier2.status);

      const highestLimit = thresholds[thresholds.length - 1].limit;
      const extremeStdev = highestLimit + 10; // Safely above all limits
      expect(ConsistencyTracker.evaluate(generateResiduals(extremeStdev), 6)).toBe("in_the_storm");
    });

    test("'climbing but erratic' is representable: high stdev regardless of trend direction", () => {
      // A wildly swinging but positive residual set still reads erratic
      const residuals = [30, 25, -35, 28, -30, 35]; // Mean ~8.8, Stdev ~29

      // As long as the variance beats the highest limit, it's erratic
      const result = ConsistencyTracker.evaluate(residuals, 6);
      expect(result).toBe("in_the_storm");
    });
  });
});

function generateResiduals(targetStdev: number): number[] {
  return Array.from({ length: 6 }, (_, i) => (i % 2 === 0 ? targetStdev : -targetStdev));
}
