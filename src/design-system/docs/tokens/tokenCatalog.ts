import primitivesCss from "@/design-system/tokens/primitives.css?raw";
import semanticCss from "@/design-system/tokens/semantic.css?raw";
import domainPaletteCss from "@/design-system/tokens/domain-palette.css?raw";
import consistencyPaletteCss from "@/design-system/tokens/consistency-palette.css?raw";
import motionCss from "@/design-system/tokens/motion.css?raw";

export type TokenCategory =
  | "brandRoles"
  | "domainRoles"
  | "consistencyRoles"
  | "surfaces"
  | "text"
  | "borders"
  | "scrims"
  | "icons"
  | "iconSizes"
  | "iconStrokes"
  | "fonts"
  | "fontSizes"
  | "lineHeights"
  | "weights"
  | "radii"
  | "spacing"
  | "zIndex"
  | "durations"
  | "easings"
  | "shadowsGlows";

export type TokenCatalog = Record<TokenCategory, string[]>;

const DECLARATION_PATTERN = /--([a-zA-Z0-9-]+)\s*:/g;

/** Extracts declared custom-property names from a stylesheet, ignoring `var()` references. */
const readDeclaredTokens = (css: string): string[] => {
  const names = new Set<string>();
  let match: RegExpExecArray | null;
  DECLARATION_PATTERN.lastIndex = 0;
  while ((match = DECLARATION_PATTERN.exec(css)) !== null) {
    names.add(`--${match[1]}`);
  }
  return [...names];
};

const domainNames = ["building", "learning", "exploring", "practicing", "habit", "maintaining"];

const isConsistencyRole = (token: string) => token.startsWith("--color-consistency-");

const isDomainRole = (token: string) =>
  token.startsWith("--color-") && domainNames.some((name) => token.includes(name));

const PREFIX_CATEGORIES: Array<[string, TokenCategory]> = [
  ["--bg-", "surfaces"],
  ["--surface-", "surfaces"],
  ["--text-", "text"],
  ["--border-", "borders"],
  ["--ring-", "borders"],
  ["--scrim-", "scrims"],
  ["--icon-stroke-width", "iconStrokes"],
  ["--icon-size-", "iconSizes"],
  ["--icon-", "icons"],
  ["--font-size-", "fontSizes"],
  ["--font-", "fonts"],
  ["--line-height-", "lineHeights"],
  ["--weight-", "weights"],
  ["--radius-", "radii"],
  ["--space-", "spacing"],
  ["--z-", "zIndex"],
  ["--duration-", "durations"],
  ["--ease-", "easings"],
  ["--shadow-", "shadowsGlows"],
  ["--glow-", "shadowsGlows"],
];

const classify = (token: string): TokenCategory | null => {
  if (isConsistencyRole(token)) {
    return "consistencyRoles";
  }
  if (isDomainRole(token)) {
    return "domainRoles";
  }
  if (token.startsWith("--color-")) {
    return "brandRoles";
  }
  return PREFIX_CATEGORIES.find(([prefix]) => token.startsWith(prefix))?.[1] ?? null;
};

/**
 * Token names are read from the token stylesheets at bundle time, so the docs
 * render whatever the CSS declares without a second list to keep in sync.
 */
export const createTokenCatalog = (): TokenCatalog => {
  const sources = [primitivesCss, semanticCss, domainPaletteCss, consistencyPaletteCss, motionCss];
  const catalog: TokenCatalog = {
    brandRoles: [],
    domainRoles: [],
    consistencyRoles: [],
    surfaces: [],
    text: [],
    borders: [],
    scrims: [],
    icons: [],
    iconSizes: [],
    iconStrokes: [],
    fonts: [],
    fontSizes: [],
    lineHeights: [],
    weights: [],
    radii: [],
    spacing: [],
    zIndex: [],
    durations: [],
    easings: [],
    shadowsGlows: [],
  };

  for (const css of sources) {
    for (const token of readDeclaredTokens(css)) {
      const category = classify(token);
      if (category && !catalog[category].includes(token)) {
        catalog[category].push(token);
      }
    }
  }

  return catalog;
};
