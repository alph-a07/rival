import type { RegistryEntry } from "@/design-system/docs/types/registry.types";
import { ColorPreview } from "./ColorPreview";

export const colorDoc: RegistryEntry = {
  id: "color-system",
  title: "Color System",
  category: "Foundations",
  description: "Semantic roles mapping to dynamic raw primitives.",
  sections: [{ type: "custom", customRender: () => <ColorPreview /> }],
};
