import { getEnvMode } from "@/core/env";

export type LogLevel = "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "OFF";

/** Numeric ordering used to compare levels. OFF is effectively infinite. */
export const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  OFF: Number.MAX_SAFE_INTEGER,
};

/**
 * The default minimum level for a fresh logger, keyed off `VITE_ENV` — the
 * single source of truth for the provisioning environment, set explicitly in
 * package.json scripts (`development` / `production`).
 */
export function resolveEnvironmentDefault(env: "development" | "production"): LogLevel {
  return env === "production" ? "WARN" : "TRACE";
}

export const DEFAULT_MIN_LEVEL: LogLevel = resolveEnvironmentDefault(getEnvMode());

export interface LoggerConfig {
  minLevel: LogLevel;
}

/** Mutable active config so tests/tooling can tighten or loosen logging. */
export let activeConfig: LoggerConfig = {
  minLevel: DEFAULT_MIN_LEVEL,
};

/** True when `level` is at or above the `minLevel` threshold. */
export function isLevelEnabled(minLevel: LogLevel, level: LogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[minLevel];
}
