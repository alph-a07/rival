import { Logger } from "@/core/logging/logger";

/** A signed-in Google user plus the Drive access token (if any). */
export interface GoogleUser {
  /** Google account id (from the id_token `sub`). */
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  /** Drive-scoped OAuth access token. May be null. */
  accessToken: string | null;
}

/** Decoded (unverified) id_token claims; only non-sensitive fields are surfaced. */
export interface DecodedIdToken {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

/** The server-authoritative profile shape. */
export interface StoredIdentity {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

/** Why a presented id_token failed validation. */
export type IdTokenRejection = "malformed" | "wrong-audience" | "wrong-issuer" | "expired";

/** Result of validating an id_token's claims at the sign-in boundary. */
export type IdTokenValidation = { ok: true } | { ok: false; reason: IdTokenRejection };

// Identity for the Worker is the long-lived server-issued `sessionToken`.
// The GSI `idToken` is kept only to decode display profile; it may expire on
// Google's side but the client never needs a fresh one once signed in.

const SESSION_TOKEN_KEY = "rival.drive.sessionToken";
const ID_TOKEN_KEY = "rival.drive.idToken";
/** The server-authoritative profile snapshot (name/email/picture) */
const IDENTITY_KEY = "rival.drive.identity";
const sessionTokenSlot = makeStorageSlot(SESSION_TOKEN_KEY);
const idTokenSlot = makeStorageSlot(ID_TOKEN_KEY);
const identitySlot = makeStorageSlot(IDENTITY_KEY);

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

const authListeners = new Set<() => void>();

/**
 * Registers a same-tab listener;
 * @returns an unregister function.
 */
export function subscribeAuthChange(listener: () => void): () => void {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

export function notifyAuthListeners(): void {
  for (const cb of authListeners) {
    try {
      cb();
    } catch {
      /* a listener must not break the others */
      Logger.auth.warn("auth listener threw, ignoring", { listener: cb });
    }
  }
}

export function getStoredSessionToken(): string | null {
  return sessionTokenSlot.get();
}
export function setStoredSessionToken(token: string | null): void {
  sessionTokenSlot.set(token);
}
export function getStoredIdToken(): string | null {
  return idTokenSlot.get();
}
export function setStoredIdToken(token: string | null): void {
  idTokenSlot.set(token);
}

/**
 * Decodes the unverified JWT payload (only non-sensitive claims are used).
 * Returns `{ sub: "" }` when the token is malformed.
 */
export function decodeIdToken(token: string): DecodedIdToken {
  const payload = decodeJwtPayload(token);
  return {
    sub: typeof payload?.sub === "string" ? payload.sub : "",
    email: typeof payload?.email === "string" ? payload.email : undefined,
    name: typeof payload?.name === "string" ? payload.name : undefined,
    picture: typeof payload?.picture === "string" ? payload.picture : undefined,
  };
}

/**
 * Validates the claims of a Google id_token at the sign-in boundary.
 * `aud` is checked only when a client id is configured.
 * `iss` is checked against a list of known Google issuers.
 * `exp` is seconds-since-epoch.
 */
export function validateIdTokenClaims(
  token: string,
  expected: { clientId?: string | null; nowMs?: number },
): IdTokenValidation {
  const payload = decodeJwtPayload(token);

  if (!payload) {
    return { ok: false, reason: "malformed" };
  }

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    return { ok: false, reason: "malformed" };
  }

  if (!GOOGLE_ISSUERS.includes(payload.iss as string)) {
    return { ok: false, reason: "wrong-issuer" };
  }

  const aud = payload.aud;
  const audMatches =
    Array.isArray(aud) && typeof expected.clientId === "string"
      ? aud.includes(expected.clientId)
      : aud === expected.clientId;

  if (expected.clientId && !audMatches) {
    return { ok: false, reason: "wrong-audience" };
  }

  const exp = payload.exp;
  const nowMs = expected.nowMs ?? Date.now();

  if (typeof exp !== "number" || exp * 1000 <= nowMs) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true };
}

/** Maps an id_token + optional drive access token to a `GoogleUser`. */
export function toGoogleUser(id_token: string, accessToken: string | null = null): GoogleUser {
  const claims = decodeIdToken(id_token);
  return {
    uid: claims.sub,
    email: claims.email ?? null,
    displayName: claims.name ?? null,
    photoUrl: claims.picture ?? null,
    accessToken,
  };
}

/**
 * Reads the cached server profile. Purely a cache — `getStoredSessionToken()`
 * is the real signed-in signal; losing this only means a re-fetch is needed.
 */
export function getStoredIdentity(): StoredIdentity | null {
  const raw = identitySlot.get();
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredIdentity>;
    if (typeof parsed.uid !== "string" || parsed.uid.length === 0) {
      return null;
    }
    return {
      uid: parsed.uid,
      email: parsed.email ?? null,
      name: parsed.name ?? null,
      picture: parsed.picture ?? null,
    };
  } catch {
    return null;
  }
}

/** Persists the server profile snapshot. Passing null clears it. */
export function setStoredIdentity(identity: StoredIdentity | null): void {
  identitySlot.set(identity ? JSON.stringify(identity) : null);
}

/** Maps a stored server profile + optional access token to a `GoogleUser`. */
export function toGoogleUserFromProfile(
  identity: StoredIdentity,
  accessToken: string | null = null,
): GoogleUser {
  return {
    uid: identity.uid,
    email: identity.email,
    displayName: identity.name,
    photoUrl: identity.picture,
    accessToken,
  };
}

/**
 * Decodes a JWT payload to a claim record, or null when the token is malformed.
 * Uses a manual base64url decode rather than pulling `jose` into the client bundle.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const encoded = token.split(".")[1];
    if (!encoded) {
      return null;
    }
    const parsed = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/"))) as unknown;
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * A storage slot: opaque get/set around one localStorage key
 * Swallows QuotaExceeded / private-mode errors uniformly.
 * Notifies listeners on set (even if storage fails) so that in-memory state can update.
 */
function makeStorageSlot(key: string): {
  get(): string | null;
  set(value: string | null): void;
} {
  return {
    get(): string | null {
      try {
        return localStorage.getItem(key);
      } catch {
        // localStorage unavailable (private/security-sensitive) — treat as empty.
        Logger.auth.warn("localStorage unavailable, treating as empty", { key });
        return null;
      }
    },
    set(value: string | null): void {
      try {
        if (value) {
          localStorage.setItem(key, value);
        } else {
          localStorage.removeItem(key);
        }
      } catch {
        // storage unavailable — persistence won't survive reload, but in-memory
        // behaviour (auth listeners) is unaffected.
        Logger.auth.warn("storage unavailable, ignoring", { key });
      }
      notifyAuthListeners();
    },
  };
}
