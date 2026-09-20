import type { RegistryEntry } from "./types/registry.types";

// Foundations
import { colorDoc } from "./content/foundations/color/color.doc";
import { typographyDoc } from "./content/foundations/typography/typography.doc";
import { motionDoc } from "./content/foundations/motion/motion.doc";
import { shadowGlowDoc } from "./content/foundations/shadow-glow/shadow-glow.doc";
import { iconTokensDoc } from "./content/foundations/icon-tokens/icon-tokens.doc";

// Components
import { buttonDoc } from "./content/components/button/button.doc";
import { iconButtonDoc } from "./content/components/button/icon-button.doc";
import { iconDoc } from "./content/components/icon.doc";
import { shapeDoc } from "./content/foundations/shape-radius/shape-radius.doc";
import { inputDoc } from "./content/components/input/input.doc";
import { cardDoc } from "./content/components/card.doc";
import { badgeDoc } from "./content/components/badge/badge.doc";
import { dialogDoc } from "./content/components/dialog/dialog.doc";
import { dividerDoc } from "./content/components/divider.doc";
import { progressDotsDoc } from "./content/components/progress-dots.doc";
import { sheetDoc } from "./content/components/sheet.doc";
import {
  headingDoc,
  labelDoc,
  monoDoc,
  textDoc,
} from "./content/components/typography-components.doc";
import { iconLibraryDoc } from "./content/foundations/icons/IconLibrary";
import { stepperDoc } from "./content/components/input/stepper.doc";
import { loaderDoc } from "./content/components/loader.doc";
import { logoDoc } from "./content/components/logo.doc";
import { consistencyBadgeDoc } from "./content/components/badge/consistency-badge.doc";
import { trendChartDoc } from "./content/components/trend-chart/trend-chart.doc";
import { flowShellDoc } from "./content/components/flow-shell.doc";
import { trendChart3dDoc } from "./content/components/trend-chart/trendChart3d.doc";
import { blockingDialogDoc } from "./content/components/dialog/blocking-dialog.doc";
import { alertDoc } from "./content/components/alert.doc";
import { toastDoc } from "./content/components/toast.doc";

export const designSystemRegistry: RegistryEntry[] = [
  // Foundations
  colorDoc,
  typographyDoc,
  shapeDoc,
  motionDoc,
  shadowGlowDoc,
  iconTokensDoc,
  iconLibraryDoc,

  // Components
  headingDoc,
  textDoc,
  monoDoc,
  labelDoc,
  logoDoc,
  loaderDoc,
  buttonDoc,
  iconDoc,
  iconButtonDoc,
  inputDoc,
  stepperDoc,
  cardDoc,
  badgeDoc,
  consistencyBadgeDoc,
  dividerDoc,
  progressDotsDoc,

  // Overlays, Layouts & System Messages
  dialogDoc,
  blockingDialogDoc,
  sheetDoc,
  alertDoc,
  toastDoc,

  trendChartDoc,
  flowShellDoc,
  trendChart3dDoc,
];
