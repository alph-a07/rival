import type { RegistryEntry } from "@/design-system/docs/types/registry.types";
import { ShapePreview } from "./ShapePreview";

export const shapeDoc: RegistryEntry = {
  id: "shape-radius",
  title: "Shape & Radius",
  category: "Foundations",
  sections: [{ type: "custom", customRender: () => <ShapePreview /> }],
};
