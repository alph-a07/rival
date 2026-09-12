import type { Env } from "./types";

/** Reads a user's last-known Drive opt-in, or null when never stored. */
export async function readDriveOptIn(env: Env, sub: string): Promise<boolean | null> {
  const row = (await env.DRIVE_TOKENS.prepare(
    "SELECT drive_opt_in FROM user_settings WHERE sub = ?1",
  )
    .bind(sub)
    .first()) as { drive_opt_in?: number } | null;

  if (!row) {
    return null;
  }

  return row.drive_opt_in === 1;
}

/** Upserts the user's opt-in flag, stamping the current time. */
export async function upsertDriveOptIn(
  env: Env,
  sub: string,
  optIn: boolean,
  nowIso: string,
): Promise<void> {
  await env.DRIVE_TOKENS.prepare(
    `INSERT INTO user_settings (sub, drive_opt_in, updated_at)
     VALUES (?1, ?2, ?3)
     ON CONFLICT(sub) DO UPDATE SET
       drive_opt_in = excluded.drive_opt_in,
       updated_at   = excluded.updated_at`,
  )
    .bind(sub, optIn ? 1 : 0, nowIso)
    .run();
}

/** Deletes any stored settings row for the sub (e.g. on session revoke). */
export async function deleteDriveOptIn(env: Env, sub: string): Promise<void> {
  await env.DRIVE_TOKENS.prepare("DELETE FROM user_settings WHERE sub = ?1").bind(sub).run();
}
