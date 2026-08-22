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

/** The Firebase project API key. */
export function firebaseApiKey(): string | null {
  return getEnvString("VITE_FIREBASE_API_KEY");
}

/** The Firebase Auth domain (e.g. `rival-xyz.firebaseapp.com`). */
export function firebaseAuthDomain(): string | null {
  return getEnvString("VITE_FIREBASE_AUTH_DOMAIN");
}

/** The Firebase project id. */
export function firebaseProjectId(): string | null {
  return getEnvString("VITE_FIREBASE_PROJECT_ID");
}

/** The Firebase storage bucket. */
export function firebaseStorageBucket(): string | null {
  return getEnvString("VITE_FIREBASE_STORAGE_BUCKET");
}

/** The Firebase messaging sender id. */
export function firebaseMessagingSenderId(): string | null {
  return getEnvString("VITE_FIREBASE_MESSAGING_SENDER_ID");
}

/** The Firebase web app id. */
export function firebaseAppId(): string | null {
  return getEnvString("VITE_FIREBASE_APP_ID");
}

/** URL of the hosted `refreshDriveToken` Cloud Function, or null when unset. */
export function driveTokenFunctionUrl(): string | null {
  return getEnvUrl("VITE_DRIVE_TOKEN_FUNCTION");
}
