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
  gisMap: Map<string, GisTier>; // gisId -> tier (mandatory/recommended/optional)
}
