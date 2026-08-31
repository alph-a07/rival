import { RIVAL_MATH_CONFIG } from "@/domain/config/tuningConstants";

export interface HoltResult {
  level: number;
  trend: number;
  forecast: number | null;
  residual: number | null;
}

/**
 * Turns a raw score into a smoothed level and trend using Holt's linear trend
 * method with adaptive smoothing factors.
 */
export function holtStep(
  n: number,
  rawScore: number,
  prevLevel: number | null, // For previous checkin in the same continuous domain segment of the same endeavour
  prevTrend: number | null,
): HoltResult {
  if (n < 1) {
    throw new Error(`holtStep called with invalid n=${n}; n must be >= 1`);
  }

  // First check-in in the segment
  if (n === 1 || prevLevel === null || prevTrend === null) {
    return { level: rawScore, trend: 0.0, forecast: null, residual: null };
  }

  const alpha = Math.max(RIVAL_MATH_CONFIG.ALPHA_MIN, 1 / n);
  const beta = Math.max(RIVAL_MATH_CONFIG.BETA_MIN, 1 / n);

  const forecast = prevLevel + prevTrend;
  const residual = rawScore - forecast;

  // Apply Holt's linear trend method
  const level = alpha * rawScore + (1 - alpha) * forecast;
  const trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;

  return { level, trend, forecast, residual };
}
