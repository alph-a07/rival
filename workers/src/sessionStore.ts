import type { Env, StoredDriveToken } from "./types";

/** Reads a stored session by session_token OR by Google sub. */
export async function readStoredToken(
  env: Env,
  sessionOrSub: string,
): Promise<StoredDriveToken | null> {
  const row = (await env.DRIVE_TOKENS.prepare(
    "SELECT * FROM drive_sessions WHERE session_token = ?1 OR sub = ?1 LIMIT 1",
  )
    .bind(sessionOrSub)
    .first()) as StoredDriveToken | null;
  return row ?? null;
}

/** Upserts a session row for `sub`, atomically rotating the refresh token + session token on re-consent. */
export async function upsertSession(env: Env, input: InsertSessionInput): Promise<void> {
  await env.DRIVE_TOKENS.prepare(
    `INSERT INTO drive_sessions
       (session_token, sub, refresh_token, scope, stored_at, expires_at, access_token, access_token_expires_at, name, email, picture)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
     ON CONFLICT(sub) DO UPDATE SET
       session_token          = excluded.session_token,
       refresh_token          = excluded.refresh_token,
       scope                  = excluded.scope,
       stored_at              = excluded.stored_at,
       expires_at             = excluded.expires_at,
       access_token           = excluded.access_token,
       access_token_expires_at = excluded.access_token_expires_at,
       name                   = excluded.name,
       email                  = excluded.email,
       picture                = excluded.picture`,
  )
    .bind(
      input.sessionToken,
      input.sub,
      input.refreshToken,
      input.scope,
      input.storedAt,
      input.expiresAt,
      input.accessToken,
      input.accessTokenExpiresAt,
      input.name,
      input.email,
      input.picture,
    )
    .run();
}

/** Deletes any session whose `expires_at` has passed (lazy purge on access). */
export async function deleteExpiredSessions(env: Env, nowIso: string): Promise<void> {
  await env.DRIVE_TOKENS.prepare("DELETE FROM drive_sessions WHERE expires_at < ?1")
    .bind(nowIso)
    .run();
}

/** Persists a fresh access token + its expiry on an existing session row. */
export async function updateAccessToken(
  env: Env,
  sessionToken: string,
  accessToken: string,
  expiresAt: string,
): Promise<void> {
  await env.DRIVE_TOKENS.prepare(
    "UPDATE drive_sessions SET access_token = ?1, access_token_expires_at = ?2 " +
      "WHERE session_token = ?3",
  )
    .bind(accessToken, expiresAt, sessionToken)
    .run();
}

/** Deletes every session row for the given session token or sub. */
export async function deleteSessions(env: Env, sessionTokenOrSub: string): Promise<void> {
  await env.DRIVE_TOKENS.prepare("DELETE FROM drive_sessions WHERE session_token = ?1 OR sub = ?1")
    .bind(sessionTokenOrSub)
    .run();
}

interface InsertSessionInput {
  sessionToken: string;
  sub: string;
  refreshToken: string;
  scope: string;
  storedAt: string;
  expiresAt: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  name: string | null;
  email: string | null;
  picture: string | null;
}
