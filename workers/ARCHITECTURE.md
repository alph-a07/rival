# `workers` — Drive Token Refresh Worker

A **separate deployable** (Cloudflare Worker, Hono + D1) that owns the OAuth refresh-token lifecycle for Drive sync. It is not part of the app's `src/` bundle: separate `package.json`, separate vitest config, its own wrangler deployment.

> **One-sentence purpose:** _Hold the OAuth refresh token server-side and mint short-lived access tokens on demand — the client never sees the refresh token._

```
   dependency direction (low → high)
   ┌────────────────────────────┐
   │ lib/googleToken            │  (Google OAuth token endpoint calls)
   │ lib/googleVerify           │  (id_token/JWT verification via jose)
   ├────────────────────────────┤
   │ sessionStore               │  (D1 data access — drive_sessions table)
   ├────────────────────────────┤
   │ authService                │  (business rules: mint, resolve, expiry)
   ├────────────────────────────┤
   │ index.ts                   │  (Hono routing → the layers above)
   └─────────▲──────────────────┘
             │ HTTP from the app (src/auth/driveWorkerClient.ts)
```

## File map

| Path                  | Responsibility                                                                                 | Public surface                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`            | Hono app — routes `/store-token`, `/refresh`, `/revoke`, `/drive-opt-in` (GET/PUT), `/` + CORS | `app` (default export)                                                                                                                |
| `authService.ts`      | Session-token minting, bearer resolution, identity-match enforcement                           | `HttpError`, `newSessionToken()`, `resolveSession()`, `resolveIdentitySub()`, `profileFromStored()`, `SESSION_LIFETIME_MS` |
| `sessionStore.ts`     | D1 persistence for `drive_sessions` (upsert, read, delete, expiry purge)                       | `upsertSession()`, `readStoredToken()`, `updateAccessToken()`, `deleteSessions()`, `deleteExpiredSessions()`                          |
| `driveOptInStore.ts`  | D1 persistence for the per-user `user_settings` Drive opt-in flag                              | `readDriveOptIn()`, `upsertDriveOptIn()`, `deleteDriveOptIn()`                                                                        |
| `lib/googleToken.ts`  | Google token endpoint — code→refresh-token exchange, refresh→access-token                      | `exchangeCodeForRefreshToken()`, `refreshAccessToken()`, `revokeToken()`                                                              |
| `lib/googleVerify.ts` | `jose`-based id_token verification against Google JWKS                                         | `SessionProfile`, `verifyGoogleIdToken()`, `verifyGoogleClaims()`                                                                                       |
| `env.ts`              | Environment + strict CORS origin policy                                                        | `allowedOrigins()`, `isAllowedOrigin()`                                                                                               |
| `types.ts`            | Worker bindings + row shape                                                                    | `Env`, `StoredDriveToken`                                                                                                             |
| `test/mockD1.ts`      | In-memory D1 for tests                                                                         | `testEnv()`, `MockD1`                                                                                                                 |
| `migrations/0001_init.sql` | D1 initial schema (drive_sessions + user_settings)     |                                                                    | —                                                                                                                                     |

`env.ts` centralizes the strict CORS origin policy. Local development origins are always available; deployed origins must be supplied through the `ALLOWED_ORIGINS` Worker variable and are never echoed unless explicitly listed.

## Data model

`DRIVE_TOKENS` is a D1 database. A single migration `0001_init.sql` builds the two tables: `drive_sessions` (the durable session row keyed by `session_token`, refresh token server-only, cached access token + expiry, unique `sub`, hard session expiry, profile snapshot) and `user_settings` (per-user Drive opt-in flag).

Migrations are applied with `wrangler d1 migrations apply DRIVE_TOKENS` (local dev DB) or `--remote` (cloud). The `dev` and `deploy` npm scripts run the applicable command automatically before starting: `dev` → local, `deploy` → remote. `apply` skips already-applied files (tracked in `d1_migrations`), so both are idempotent.

## Security model

- The refresh token **never leaves the Worker**.
- `/store-token` enforces identity-match: the signed-in account's id_token
  bearer must equal the Drive-consent `sub` (403 otherwise).
- `/refresh` accepts either a server session token (fast path) or a legacy
  id_token; enforces the hard 6-month session lifetime and purges expired rows.
- CORS allowlist is strict and environment-driven; local origins are available for development and deployed origins come from `ALLOWED_ORIGINS`.

## Conventions

The app-side HTTP client is `src/auth/driveWorkerClient.ts`; the Drive scope constant lives in `src/auth/gsiClient.ts` (`DRIVE_FILE_SCOPE`) and is mirrored in `workers/src/index.ts` — keep them in sync when changing scope. This package follows the same separation-of-concerns layering as the app but is not bound by app-level conventions (no `@/*` alias, no `createX()` requirement).

## Testing

`authService.test.ts` + `sessionStore.test.ts` + `env.test.ts` against the in-memory D1 mock (`test/mockD1.ts`). `lib/googleVerify` is stubbed in tests (no network).

```bash
cd workers && npm test
```

