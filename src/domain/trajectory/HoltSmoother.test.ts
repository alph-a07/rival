import { expect, test, describe } from "vitest";
import { holtStep } from "./HoltSmoother";
import { RIVAL_MATH_CONFIG } from "@/domain/config/tuningConstants";

describe("holtStep Adaptive Algorithm", () => {
  test("matches the 6-day worked example from the math spec exactly", () => {
    const rawScores = [60, 68, 55, 70, 75, 78];

    let prevLevel: number | null = null;
    let prevTrend: number | null = null;

    const results = rawScores.map((raw, index) => {
      const n = index + 1;
      const result = holtStep(n, raw, prevLevel, prevTrend);
      prevLevel = result.level;
      prevTrend = result.trend;
      return result;
    });

    // Day 1
    expect(results[0].level).toBeCloseTo(60.0, 1);
    expect(results[0].trend).toBeCloseTo(0.0, 1);

    // Day 2
    expect(results[1].forecast).toBeCloseTo(60.0, 1);
    expect(results[1].residual).toBeCloseTo(8.0, 1);
    expect(results[1].level).toBeCloseTo(64.0, 1);
    expect(results[1].trend).toBeCloseTo(2.0, 1);

    // Day 3
    expect(results[2].forecast).toBeCloseTo(66.0, 1);
    expect(results[2].residual).toBeCloseTo(-11.0, 1);
    expect(results[2].level).toBeCloseTo(62.3, 1);
    expect(results[2].trend).toBeCloseTo(0.8, 1);

    // Day 4
    expect(results[3].forecast).toBeCloseTo(63.1, 1);
    expect(results[3].residual).toBeCloseTo(6.9, 1);
    expect(results[3].level).toBeCloseTo(64.8, 1);
    expect(results[3].trend).toBeCloseTo(1.2, 1);

    // Day 5
    expect(results[4].forecast).toBeCloseTo(66.0, 1);
    expect(results[4].residual).toBeCloseTo(9.0, 1);
    expect(results[4].level).toBeCloseTo(67.8, 1);
    expect(results[4].trend).toBeCloseTo(1.6, 1);

    // Day 6
    expect(results[5].forecast).toBeCloseTo(69.4, 1);
    expect(results[5].residual).toBeCloseTo(8.6, 1);
    expect(results[5].level).toBeCloseTo(70.8, 1);
    expect(results[5].trend).toBeCloseTo(1.8, 1);
  });

  test("resets cleanly after a segment change mid-history", () => {
    let prevLevel: number | null = null;
    let prevTrend: number | null = null;
    [60, 68, 55].forEach((raw, i) => {
      const r = holtStep(i + 1, raw, prevLevel, prevTrend);
      prevLevel = r.level;
      prevTrend = r.trend;
    });
    // prevLevel/prevTrend now hold old-segment state (~62.3 / ~0.8)

    // Caller correctly resets n=1 AND state -> clean fresh start
    const freshStart = holtStep(1, 90, prevLevel, prevTrend);
    expect(freshStart.level).toBe(90);
    expect(freshStart.trend).toBe(0);
    expect(freshStart.forecast).toBeNull();
    expect(freshStart.residual).toBeNull();

    // Safety net: even if a caller BUG leaves n un-reset, passing null state
    // alone still forces a fresh start -- old segment data can't leak in.
    const stillResets = holtStep(4, 90, null, null);
    expect(stillResets.level).toBe(90);
    expect(stillResets.trend).toBe(0);
  });

  test("throws an error if n is less than 1", () => {
    expect(() => {
      holtStep(0, 100, 50, 2);
    }).toThrow(/invalid n=0/);

    expect(() => {
      holtStep(-5, 100, 50, 2);
    }).toThrow(/must be >= 1/);
  });

  test("respects ALPHA_MIN and BETA_MIN floor limits dynamically at high values of n", () => {
    // Pick an n so large that 1/n is guaranteed to be smaller than any reasonable config minimum
    const n = 1000;
    const raw_t = 100;
    const prevLevel = 50;
    const prevTrend = 2;

    const result = holtStep(n, raw_t, prevLevel, prevTrend);

    const expectedForecast = prevLevel + prevTrend;
    const expectedResidual = raw_t - expectedForecast;

    const expectedLevel =
      RIVAL_MATH_CONFIG.ALPHA_MIN * raw_t + (1 - RIVAL_MATH_CONFIG.ALPHA_MIN) * expectedForecast;

    const expectedTrend =
      RIVAL_MATH_CONFIG.BETA_MIN * (expectedLevel - prevLevel) +
      (1 - RIVAL_MATH_CONFIG.BETA_MIN) * prevTrend;

    expect(result.forecast).toBe(expectedForecast);
    expect(result.residual).toBe(expectedResidual);
    expect(result.level).toBeCloseTo(expectedLevel, 4);
    expect(result.trend).toBeCloseTo(expectedTrend, 4);
  });
});
