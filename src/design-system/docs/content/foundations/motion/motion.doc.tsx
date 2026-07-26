import type { RegistryEntry } from "@/design-system/docs/types/registry.types";
import { MotionPreview } from "./MotionPreview";

export const motionDoc: RegistryEntry = {
  id: "motion",
  title: "Motion",
  category: "Foundations",
  description: "Two easing curves and five durations, scoped by what's moving.",
  sections: [{ type: "custom", customRender: () => <MotionPreview /> }],
};
