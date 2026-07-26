import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

interface TokenMap {
  brandRoles: string[];
  domainRoles: string[];
  surfaces: string[];
  text: string[];
  borders: string[];
  scrims: string[];
  fonts: string[];
  weights: string[];
  radii: string[];
  durations: string[];
  easings: string[];
  shadowsGlows: string[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cssFilePath = path.resolve(__dirname, "../src/design-system/design-tokens.css");
const outputFilePath = path.resolve(__dirname, "../src/design-system/generated-tokens.json");

const cssContent = fs.readFileSync(cssFilePath, "utf-8");

// Capture all variables EXCEPT those starting with --raw-
const tokenRegex = /--(?!raw-)([a-zA-Z0-9-]+):/g;
const tokens = new Set<string>();
let match: RegExpExecArray | null;

while ((match = tokenRegex.exec(cssContent)) !== null) {
  tokens.add(`--${match[1]}`);
}

const tokenMap: TokenMap = {
  brandRoles: [],
  domainRoles: [],
  surfaces: [],
  text: [],
  borders: [],
  scrims: [],
  fonts: [],
  weights: [],
  radii: [],
  durations: [],
  easings: [],
  shadowsGlows: [],
};

const domains: string[] = [
  "building",
  "learning",
  "exploring",
  "practicing",
  "habit",
  "maintaining",
];

tokens.forEach((token: string) => {
  if (token.startsWith("--color-")) {
    if (domains.some((d) => token.includes(d))) {
      tokenMap.domainRoles.push(token);
    } else {
      tokenMap.brandRoles.push(token);
    }
  } else if (token.startsWith("--bg-") || token.startsWith("--surface-")) {
    tokenMap.surfaces.push(token);
  } else if (token.startsWith("--text-")) {
    tokenMap.text.push(token);
  } else if (token.startsWith("--border-")) {
    tokenMap.borders.push(token);
  } else if (token.startsWith("--scrim-")) {
    tokenMap.scrims.push(token);
  } else if (token.startsWith("--font-")) {
    tokenMap.fonts.push(token);
  } else if (token.startsWith("--weight-")) {
    tokenMap.weights.push(token);
  } else if (token.startsWith("--radius-")) {
    tokenMap.radii.push(token);
  } else if (token.startsWith("--duration-")) {
    tokenMap.durations.push(token);
  } else if (token.startsWith("--ease-")) {
    tokenMap.easings.push(token);
  } else if (
    token.startsWith("--shadow-") ||
    token.startsWith("--glow-") ||
    token.startsWith("--ring-")
  ) {
    tokenMap.shadowsGlows.push(token);
  }
});

fs.writeFileSync(outputFilePath, JSON.stringify(tokenMap, null, 2));
console.log("✅ Token map successfully generated!");
