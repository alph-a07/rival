import type { IconName } from "@/design-system/icons";
import type { GisTier } from "./Gis";

export type DomainColorToken =
  | "var(--color-building)"
  | "var(--color-learning)"
  | "var(--color-exploring)"
  | "var(--color-practicing)"
  | "var(--color-habit)"
  | "var(--color-maintaining)";

/** A domain represents a category of knowledge or skills. */
export interface Domain {
  id: string;
  name: string;
  definition: string;
  icon?: IconName;
  colorToken: DomainColorToken;
  gisMap: Record<string, GisTier>; // gisId -> tier (mandatory/recommended/optional)
  /**
   * Expected check-in cadence in days for cadence-driven domains (habit / practicing / maintaining).
   * `null` for open-ended domains (learning / exploring / building).
   */
  cadenceDays?: number;
}
