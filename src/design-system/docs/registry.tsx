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
import { inputDoc } from "./content/components/input.doc";
import { cardDoc } from "./content/components/card.doc";
import { badgeDoc } from "./content/components/badge.doc";
import { alertToastDoc } from "./content/components/alert-toast.doc";
import { dialogDoc } from "./content/components/dialog.doc";
import { dividerDoc } from "./content/components/divider.doc";
import { progressDotsDoc } from "./content/components/progress-dots.doc";
import { sheetDoc } from "./content/components/sheet.doc";
import { typographyComponentsDoc } from "./content/components/typography-components.doc";
import { iconLibraryDoc } from "./content/foundations/icons/IconLibrary";
import { stepperDoc } from "./content/components/stepper.doc";
import { loaderDoc } from "./content/components/loader.doc";
import { logoDoc } from "./content/components/logo.doc";

export const designSystemRegistry: RegistryEntry[] = [
  // Foundations
  colorDoc,
  typographyDoc,
  shapeDoc,
  motionDoc,
  shadowGlowDoc,
  iconLibraryDoc,

  // Components
  typographyComponentsDoc,
  logoDoc,
  loaderDoc,
  buttonDoc,
  iconDoc,
  iconButtonDoc,
  inputDoc,
  stepperDoc,
  cardDoc,
  badgeDoc,
  dividerDoc,
  progressDotsDoc,

  // Overlays, Layouts & System Messages
  dialogDoc,
  sheetDoc,
  alertToastDoc,
];
