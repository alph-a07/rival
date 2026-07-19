import type { Gis, GisTier } from "@/domain/models/Gis";
import type { Response } from "@/domain/models/CheckIn";
import { RIVAL_MATH_CONFIG } from "@/domain/config/tuningConstants";

const TIER_WEIGHT_MULTIPLIER: Record<GisTier, number> = {
  mandatory: RIVAL_MATH_CONFIG.TIER_WEIGHT_MULTIPLIER.mandatory,
  optional: RIVAL_MATH_CONFIG.TIER_WEIGHT_MULTIPLIER.optional,
  recommended: RIVAL_MATH_CONFIG.TIER_WEIGHT_MULTIPLIER.recommended,
};

/**
 * Stateless scoring engine for check-ins.
 *
 * Each GIS has a base weight (W_gis) and a tier multiplier (M_tier). Each
 * question has options with fractional values (0.0-1.0). The raw score is
 * calculated as:
 *
 * - For each active GIS:
 *
 *   - Calculate potential weight: W_gis * M_tier
 *   - Calculate earned weight: potential weight * average answer value
 * - Sum earned weights across all active GIS.
 * - Normalize by dividing total earned weight by total potential weight.
 * - Apply synergy/friction modifier (M_hybrid). Final score is clamped between 0
 *   and 100.
 */
export class GisEngine {
  /** Calculates a check-in's normalized raw score (0-100). */
  static calculateRawScore(
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
        return; // active but completely unanswered: earns 0, penalizing the score
      }

      // Resolve and sum the fractional values for all submitted responses
      const totalAnswerValue = gisResponses.reduce((sum, response) => {
        const answerValue = this.resolveAnswerValue(gis, response);
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

  /**
   * Resolves a single Response into a fractional value (0.0-1.0). Multi-select
   * questions sum the values of all selected options and cap at 1.0.
   */
  private static resolveAnswerValue(gis: Gis, response: Response): number | undefined {
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
}
