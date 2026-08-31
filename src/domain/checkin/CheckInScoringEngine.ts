import type { Gis, GisTier } from "@/domain/models/Gis";
import type { Response } from "@/domain/models/CheckIn";
import { RIVAL_MATH_CONFIG } from "@/domain/config/tuningConstants";
import { GisRegistry } from "@/domain/gis/gisDefinitions";

const TIER_WEIGHT_MULTIPLIER: Record<GisTier, number> = {
  mandatory: RIVAL_MATH_CONFIG.TIER_WEIGHT_MULTIPLIER.mandatory,
  optional: RIVAL_MATH_CONFIG.TIER_WEIGHT_MULTIPLIER.optional,
  recommended: RIVAL_MATH_CONFIG.TIER_WEIGHT_MULTIPLIER.recommended,
};

/** The per-GIS fraction answer value (0..1), keyed by `gisId`, for a set of responses. */
export function computeByGisId(
  responses: Response[],
  gisRegistry: readonly Gis[] = GisRegistry.all(),
): Record<string, number> {
  const byId = new Map(gisRegistry.map((gis) => [gis.id, gis] as const));
  const byGisId = new Map<string, number[]>();

  for (const response of responses) {
    const gis = byId.get(response.gisId);
    if (!gis) {
      continue; // ignore responses for unknown GIS
    }
    const resolved = resolveAnswerValue(gis, response);
    const bucket = byGisId.get(response.gisId);
    if (bucket) {
      bucket.push(resolved ?? 0);
    } else {
      byGisId.set(response.gisId, [resolved ?? 0]);
    }
  }

  const result: Record<string, number> = {};
  for (const [gisId, values] of byGisId) {
    const gis = byId.get(gisId)!;
    // Skipped questions drag the average toward 0, matching calculateRawScore.
    const total = values.reduce((sum, v) => sum + v, 0);
    result[gisId] = total / gis.questions.length;
  }
  return result;
}

/** Calculates a check-in's normalized raw score (0-100). */
export function calculateRawScore(
  activeGis: Map<Gis, GisTier>,
  responses: Response[],
  modifier: number = 1.0,
): number {
  let sessionPotentialWeight = 0;
  let sessionEarnedWeight = 0;

  activeGis.forEach((tier, gis) => {
    const potentialGisWeight = gis.baseWeight * TIER_WEIGHT_MULTIPLIER[tier];
    sessionPotentialWeight += potentialGisWeight;

    const gisResponses = responses.filter((r) => r.gisId === gis.id);

    if (gisResponses.length === 0) {
      return; // no responses for this GIS, so it contributes 0 to the earned weight
    }

    // Resolve and sum the fractional values for all submitted responses
    const totalAnswerValue = gisResponses.reduce((sum, response) => {
      const answerValue = resolveAnswerValue(gis, response);
      return sum + (answerValue ?? 0);
    }, 0);

    // Average across all questions owned by this GIS.
    // Skipped questions naturally drag the average toward 0.
    const averageAnswerValue = totalAnswerValue / gis.questions.length;

    sessionEarnedWeight += potentialGisWeight * averageAnswerValue;
  });

  if (sessionPotentialWeight === 0) {
    return 0;
  }

  const normalizedScore = (sessionEarnedWeight / sessionPotentialWeight) * 100;
  const scoreWithSynergy = normalizedScore * modifier;

  return Math.min(Math.max(scoreWithSynergy, 0), 100);
}

/** Resolves a single Response into a fractional value (0.0-1.0). */
function resolveAnswerValue(gis: Gis, response: Response): number | undefined {
  const question = gis.questions.find((q) => q.id === response.questionId);
  if (!question) {
    return undefined;
  }

  const selectedValues = response.optionIds
    .map((optionId) => question.options.find((o) => o.id === optionId)?.value)
    .filter((value): value is number => value !== undefined);

  if (selectedValues.length === 0) {
    return undefined;
  }

  const sum = selectedValues.reduce((total, value) => total + value, 0);
  return Math.min(1.0, sum);
}
