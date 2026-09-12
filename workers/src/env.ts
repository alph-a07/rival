import type { Env } from "./types";

const DEVELOPMENT_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

export function allowedOrigins(env: Env): string[] {
  const configured = env.ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (env.ENVIRONMENT === "production") {
    return [...new Set(configured ?? [])];
  }
  return [...new Set([...DEVELOPMENT_ORIGINS, ...(configured ?? [])])];
}

export function isAllowedOrigin(origin: string | undefined, env: Env): origin is string {
  return typeof origin === "string" && allowedOrigins(env).includes(origin);
}
