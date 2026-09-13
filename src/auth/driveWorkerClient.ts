import { driveTokenFunctionUrl } from "@/core/env";
import { Logger } from "@/core/logging/logger";
import { getStoredIdToken, getStoredSessionToken } from "./authSession";

/** The result of a successful `/store-token` call. */
export interface StoreTokenResult {
  accessToken: string;
  expiresIn: number;
  idToken: string;
  sessionToken: string;
}

/** The result of a successful `/refresh` call. */
export interface RefreshTokenResult {
  accessToken: string;
  expiresIn: number;
  /** Server-authoritative identity (restores PII(Personal Identifiable Information) after a local cache wipe). */
  profile: SessionProfile;
}

/** The display profile the Worker returns on `/refresh` (server truth). */
export interface SessionProfile {
  sub: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

/**
 * `POST /store-token`
 *
 * Exchanges the OAuth code for a refresh token + access token + id_token.
 * Returns fresh tokens + a long-lived session token.
 */
export async function storeToken(code: string): Promise<StoreTokenResult> {
  const identityIdToken = getStoredIdToken();

  const result = await fetch(`${workerBase()}/store-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(identityIdToken ? { Authorization: `Bearer ${identityIdToken}` } : {}),
    },
    body: JSON.stringify({ code, redirect_uri: "postmessage" }),
  });

  const data = (await result.json().catch(() => ({}))) as {
    accessToken?: string;
    expiresIn?: number;
    idToken?: string;
    sessionToken?: string;
    error?: string;
  };

  if (!result.ok || !data.idToken || !data.sessionToken) {
    throw new Error(data.error ?? `Store token failed (${result.status}).`);
  }

  return {
    accessToken: data.accessToken ?? "",
    expiresIn: data.expiresIn ?? 3600,
    idToken: data.idToken,
    sessionToken: data.sessionToken,
  };
}

/** `POST /refresh` authenticated by the long-lived session token. */
export async function refreshToken(sessionToken: string): Promise<RefreshTokenResult> {
  const result = await fetch(`${workerBase()}/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`,
    },
  });

  const data = (await result.json().catch(() => ({}))) as {
    accessToken?: string;
    expiresIn?: number;
    error?: string;
    status?: string;
    sub?: string;
    email?: string | null;
    name?: string | null;
    picture?: string | null;
  };

  if (!result.ok || !data.accessToken) {
    const err = new Error(data.error ?? `Drive refresh failed (${result.status}).`);
    (err as { code?: string }).code =
      data.status ?? (result.status === 401 ? "no_refresh_token" : "");

    throw err;
  }

  return {
    accessToken: data.accessToken,
    expiresIn: data.expiresIn ?? 3600,
    profile: {
      sub: data.sub ?? "",
      email: data.email ?? null,
      name: data.name ?? null,
      picture: data.picture ?? null,
    },
  };
}

/**
 * `POST /revoke` with the session token.
 * Best-effort; never throws to the UI.
 */
export async function revokeServerToken(sessionToken: string): Promise<void> {
  try {
    await fetch(`${workerBase()}/revoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
    });
  } catch (err) {
    Logger.auth.warn("revokeServerToken — best-effort revoke failed", {
      message: err instanceof Error ? err.message : err,
    });
  }
}

function workerBase(): string {
  const url = driveTokenFunctionUrl();

  if (!url) {
    throw new Error(
      "No Cloudflare Worker configured (VITE_DRIVE_TOKEN_FUNCTION). Update .env.local and restart the dev server.",
    );
  }

  return url.replace(/\/+$/, "");
}

/**
 * `PUT /drive-opt-in` with the session token.
 * Best-effort persistence of the durable Drive opt-in flag; never throws so an
 * offline/unreachable worker can't break the sync flow.
 */
export async function pushDriveSyncOptIn(optIn: boolean): Promise<void> {
  const sessionToken = getStoredSessionToken();
  if (!sessionToken) {
    return;
  }
  try {
    const res = await fetch(`${workerBase()}/drive-opt-in`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ driveSyncOptIn: optIn }),
    });
    if (!res.ok) {
      Logger.sync.debug("pushDriveSyncOptIn — remote rejected the write", {
        status: res.status,
      });
    }
  } catch (err) {
    Logger.sync.debug("pushDriveSyncOptIn — network failure, skipping", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
