import { SessionProfile, verifyGoogleIdToken } from "./lib/googleVerify";
import { readStoredToken, deleteExpiredSessions } from "./sessionStore";
import type { Env, StoredDriveToken } from "./types";

/** Hard session lifetime; a re-auth (re-consent) resets it. */
export const SESSION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 180; // 6 months
const SESSION_EXPIRED_MESSAGE = "Your Google connection expired. Please sign in again.";

/**
 * Resolves the bearer credential to the stored session row.
 *
 * Accepts either a server-issued session token (fast path, matched as session_token) or
 * a valid Google id_token (matched as sub).
 *
 * Throws an HttpError on failure.
 */
export async function resolveSession(
  request: Request,
  env: Env,
): Promise<{ stored: StoredDriveToken }> {
  const header = request.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);

  if (!match) {
    throw http401("Missing bearer token.");
  }

  const credential = match[1];

  // Fast path: an opaque session token (not JWT-shaped) is used directly.
  const looksLikeJwt = credential.split(".").length === 3;
  let lookup = credential;

  // If the credential looks like a JWT, verify it as a Google id_token and extract the `sub`
  if (looksLikeJwt) {
    try {
      lookup = await verifyGoogleIdToken(credential, env.GOOGLE_CLIENT_ID);
    } catch (err) {
      throw http401(
        err instanceof Error ? `Invalid ID token: ${err.message}` : "Invalid ID token.",
      );
    }
  }

  const stored = await readStoredToken(env, lookup);
  if (stored) {
    const expired = new Date(stored.expires_at).getTime() < Date.now();

    if (expired) {
      await deleteExpiredSessions(env, new Date().toISOString());
      throw http401(SESSION_EXPIRED_MESSAGE);
    }

    return { stored };
  }

  throw http401(
    looksLikeJwt
      ? "No stored Drive token. Re-connect your Google account."
      : "Unknown or revoked session. Re-connect your Google account.",
  );
}

/** Verifies the Authorization bearer is a valid Google id_token and returns the identity `sub`. */
export async function resolveIdentitySub(request: Request, env: Env): Promise<{ sub: string }> {
  const authHeader = request.headers.get("Authorization") ?? "";
  const bearer = /^Bearer\s+(.+)$/i.exec(authHeader)?.[1];

  if (!bearer) {
    throw http401("Missing identity. Sign in with Google first.");
  }

  try {
    const sub = await verifyGoogleIdToken(bearer, env.GOOGLE_CLIENT_ID);
    return { sub };
  } catch (err) {
    throw http401(err instanceof Error ? `Invalid identity: ${err.message}` : "Invalid identity.");
  }
}

/** Extracts the profile payload from a stored session row. */
export function profileFromStored(stored: StoredDriveToken): SessionProfile {
  return {
    sub: stored.sub,
    email: stored.email ?? null,
    name: stored.name ?? null,
    picture: stored.picture ?? null,
  };
}

/** Cryptographically random opaque session token (32 bytes → 32 chars, 6 bits/char). */
export function newSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) {
    s += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[b & 63];
  }
  return s;
}

/** A typed error the service layer throws; routes translate it to a response. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/** Convenience builders so call sites read as `throw http401("...")`. */
const http401 = (message: string) => new HttpError(401, message);
