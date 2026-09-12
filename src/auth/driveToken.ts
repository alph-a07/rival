import { Logger } from "@/core/logging/logger";

/** Keys used for the localStorage cache. */
const TOKEN_KEY = "rival.drive.token";
const EXPIRY_KEY = "rival.drive.tokenExpiry";

/** The public access-token cache surface. */
export interface DriveTokenStore {
  /** True when the cached token is present and not yet expired. */
  hasValidToken(): boolean;
  /** Returns the current valid token, or null when absent/expired. */
  get(): string | null;
  /** Stores a fresh token + its lifetime (seconds); returns the token. */
  set(accessToken: string, expiresIn: number): string;
  /** Clears the cache. */
  clear(): void;
}

/** Creates a Drive access-token cache. See file doc for lifecycle notes. */
export function createDriveTokenStore(): DriveTokenStore {
  let cachedToken: string | null = null;
  let cachedExpiry: number | null = null;
  let readFromStorage = false;

  /** Loads the previous session's token from localStorage (once). */
  function ensureHydrated(): void {
    if (readFromStorage) {
      return;
    }
    readFromStorage = true;

    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const expiry = localStorage.getItem(EXPIRY_KEY);
      if (token) {
        cachedToken = token;
        cachedExpiry = expiry ? Number(expiry) : null;

        Logger.auth.debug("DriveTokenStore — hydrated cached token from storage");
      }
    } catch {
      Logger.auth.warn("DriveTokenStore — localStorage read failed, skipping token cache");
    }
  }

  return {
    hasValidToken() {
      ensureHydrated();
      return cachedToken !== null && cachedExpiry !== null && Date.now() < cachedExpiry;
    },

    get() {
      ensureHydrated();
      if (!this.hasValidToken()) {
        return null;
      }
      return cachedToken;
    },

    set(accessToken, expiresIn) {
      cachedToken = accessToken;
      // Apply a 60s safety margin so we refresh before the server actually rejects us.
      cachedExpiry = Date.now() + Math.max(60, expiresIn - 60) * 1000;

      try {
        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(EXPIRY_KEY, String(cachedExpiry));
      } catch {
        Logger.auth.warn("DriveTokenStore — localStorage write failed, token kept in memory only");
      }

      Logger.auth.debug("DriveTokenStore — cached token", {
        expiresIn,
        validForMs: cachedExpiry - Date.now(),
      });

      return accessToken;
    },

    clear() {
      cachedToken = null;
      cachedExpiry = null;

      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EXPIRY_KEY);
      } catch {
        Logger.auth.warn(
          "DriveTokenStore — localStorage clear failed, token cleared in memory only",
        );
      }

      Logger.auth.debug("DriveTokenStore — cleared");
    },
  };
}

/** App-wide singleton token store. */
export const driveTokenStore = createDriveTokenStore();
