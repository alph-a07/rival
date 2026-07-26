import type { RegistryEntry } from "./types/registry.types";

// Foundations
import { colorDoc } from "./content/foundations/color/color.doc";
import { typographyDoc } from "./content/foundations/typography/typography.doc";
import { motionDoc } from "./content/foundations/motion/motion.doc";
import { shadowGlowDoc } from "./content/foundations/shadow-glow/shadow-glow.doc";

// Components
import { buttonDoc } from "./content/components/button.doc";
import { iconButtonDoc } from "./content/components/icon-button.doc";
import { iconDoc } from "./content/components/icon.doc";
import { shapeDoc } from "./content/foundations/shape-radius/shape-radius.doc";

export const designSystemRegistry: RegistryEntry[] = [
  // Foundations
  colorDoc,
  typographyDoc,
  shapeDoc,
  motionDoc,
  shadowGlowDoc,

  // Components
  buttonDoc,
  iconDoc,
  iconButtonDoc,
];
