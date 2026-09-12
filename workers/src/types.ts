/** Worker environment bindings. */
export interface Env {
  DRIVE_TOKENS: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  ALLOWED_ORIGINS?: string;
  ENVIRONMENT?: "development" | "production";
}

/**
 * A row in the `drive_sessions` table.
 * The session_token is the primary key and is the only credential the client persists; the refresh token never leaves the server.
 */
export interface StoredDriveToken {
  session_token: string;
  sub: string;
  refresh_token: string;
  scope: string;
  stored_at: string;
  expires_at: string; // Session token expiration time
  access_token: string | null;
  access_token_expires_at: string | null;
  name: string | null;
  email: string | null;
  picture: string | null;
}
