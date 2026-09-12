/** The provisioning environment driving log verbosity. */
export type AppEnv = "development" | "production";

/**
 * Reads a raw string env var.
 * Vite leaves unset vars as `undefined` and empty strings are treated as unset to keep the rest of the app simple.
 */
export function getEnvString(name: string): string | null {
  const raw = import.meta.env[name] as string | undefined;
  return raw && raw.trim() ? raw.trim() : null;
}

/**
 * Reads an env var that must be a URL (e.g. a Cloud Function endpoint).
 * Returns null when unset or blank.
 */
export function getEnvUrl(name: string): string | null {
  return getEnvString(name);
}

/** True when the given env var has a non-blank value. */
export function hasEnv(name: string): boolean {
  return getEnvString(name) !== null;
}

/** The provisioning mode (`development` | `production`), defaulting to dev. */
export function getEnvMode(): AppEnv {
  return getEnvString("VITE_ENV") === "production" ? "production" : "development";
}

/** The Google OAuth client id (from GSI). */
export function googleClientId(): string | null {
  return getEnvString("VITE_GOOGLE_CLIENT_ID");
}

/**
 * Origins the app accepts Google sign-in from.
 * Comma-separated `VITE_AUTHORIZED_ORIGINS`; defaults to the pinned dev origin.
 * Must stay in sync with the OAuth client's Authorized JavaScript origins.
 */
export function authorizedGoogleOrigins(): string[] {
  const raw = getEnvString("VITE_AUTHORIZED_ORIGINS");

  if (!raw) {
    return ["http://localhost:5173"];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Whether Google auth may run on the given origin (exact scheme + host + port match). */
export function isAuthorizedGoogleOrigin(
  origin: string,
  allowed: readonly string[] = authorizedGoogleOrigins(),
): boolean {
  return allowed.includes(origin);
}

/** Base URL of the Cloudflare Worker (token refresh), or null when unset. */
export function driveTokenFunctionUrl(): string | null {
  return getEnvUrl("VITE_DRIVE_TOKEN_FUNCTION");
}
