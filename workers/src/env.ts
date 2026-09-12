import type { Env } from "./types";

const DEVELOPMENT_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

/**
 * The CORS origin allowlist for the given environment.
 *
 * `ALLOWED_ORIGINS` (comma-separated) is the source of truth in both modes
 * when set. In non-production, an unset `ALLOWED_ORIGINS` falls back to the
 * local development origins so `wrangler dev` works with zero config; in
 * production it is required and never falls back.
 */
export function allowedOrigins(env: Env): string[] {
  const configured = env.ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!configured || configured.length === 0) {
    return env.ENVIRONMENT === "production" ? [] : [...DEVELOPMENT_ORIGINS];
  }
  return [...new Set(configured)];
}

export function isAllowedOrigin(origin: string | undefined, env: Env): origin is string {
  return typeof origin === "string" && allowedOrigins(env).includes(origin);
}
