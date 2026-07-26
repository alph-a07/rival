import type { RegistryEntry } from "@/design-system/docs/types/registry.types";
import { ShadowGlowPreview } from "./ShadowGlowPreview";

export const shadowGlowDoc: RegistryEntry = {
  id: "shadow-glow",
  title: "Shadow & Glow",
  category: "Foundations",
  sections: [{ type: "custom", customRender: () => <ShadowGlowPreview /> }],
};
