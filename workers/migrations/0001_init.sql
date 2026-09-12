-- `drive_sessions` is the durable session row keyed by `session_token`, refresh token server-only, cached access token + expiry, unique `sub`, hard session expiry, profile snapshot.
CREATE TABLE IF NOT EXISTS drive_sessions (
  session_token           TEXT PRIMARY KEY,
  sub                     TEXT NOT NULL UNIQUE,
  refresh_token           TEXT NOT NULL,
  scope                   TEXT NOT NULL,
  stored_at               TEXT NOT NULL,
  access_token            TEXT,
  access_token_expires_at TEXT,
  expires_at              TEXT,
  name                    TEXT,
  email                   TEXT,
  picture                 TEXT
);

-- Index on `sub` for fast lookup by Google identity.
CREATE INDEX IF NOT EXISTS idx_drive_sessions_sub ON drive_sessions(sub);

-- `user_settings` is the per-user Drive opt-in flag.
CREATE TABLE IF NOT EXISTS user_settings (
  sub          TEXT PRIMARY KEY,
  drive_opt_in INTEGER NOT NULL DEFAULT 0,
  updated_at   TEXT NOT NULL
);
