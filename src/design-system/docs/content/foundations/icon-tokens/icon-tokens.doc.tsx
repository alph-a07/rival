import type { RegistryEntry } from "@/design-system/docs/types/registry.types";
import { IconTokensPreview } from "./IconTokensPreview";

export const iconTokensDoc: RegistryEntry = {
  id: "icon-tokens",
  title: "Icon Tokens",
  category: "Foundations",
  description: "Tint and size tokens for icons, kept separate from body-text color tokens.",
  sections: [{ type: "custom", customRender: () => <IconTokensPreview /> }],
};
