import { Hono } from "hono";
import { cors } from "hono/cors";
import { verifyGoogleClaims } from "./lib/googleVerify";
import { exchangeCodeForRefreshToken, refreshAccessToken, revokeToken } from "./lib/googleToken";
import {
  HttpError,
  newSessionToken,
  profileFromStored,
  resolveSession,
  resolveIdentitySub,
  SESSION_LIFETIME_MS,
} from "./authService";
import { upsertSession, updateAccessToken, deleteSessions } from "./sessionStore";
import { readDriveOptIn, upsertDriveOptIn, deleteDriveOptIn } from "./driveOptInStore";
import type { Env } from "./types";
import { isAllowedOrigin } from "./env";

// ⚠️ KEEP IN SYNC with `DRIVE_FILE_SCOPE` in src/data/auth/gsiClient.ts.
const SCOPE = "https://www.googleapis.com/auth/drive.file";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: (origin, c) => (isAllowedOrigin(origin, c.env) ? origin : undefined),
    allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  }),
);

app.post("/store-token", async (c) => {
  try {
    const body = await c.req.json<{ code: string; redirect_uri?: string }>();

    if (!body.code) {
      return cjson("Missing OAuth code.", 400);
    }

    // The signed-in identity is the only account that can grant Drive access.
    const { sub: identitySub } = await resolveIdentitySub(c.req.raw, c.env);

    const redirectUri = body.redirect_uri || "postmessage";
    const { refreshToken, accessToken, expiresIn, idToken } = await exchangeCodeForRefreshToken(
      body.code,
      redirectUri,
      googleOpts(c.env),
    );

    const claims = await verifyGoogleClaims(idToken, c.env.GOOGLE_CLIENT_ID);

    // Drive consent account MUST equal the signed-in identity account.
    if (identitySub !== claims.sub) {
      return cjson("Drive access must be granted with the signed-in Google account.", 403);
    }

    const sessionToken = newSessionToken();
    const now = new Date();

    await upsertSession(c.env, {
      sessionToken,
      sub: claims.sub,
      refreshToken,
      scope: SCOPE,
      storedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS).toISOString(),
      accessToken,
      accessTokenExpiresAt: new Date(
        now.getTime() + Math.max(0, expiresIn - 60) * 1000,
      ).toISOString(),
      name: claims.name,
      email: claims.email,
      picture: claims.picture,
    });

    return c.json({ ok: true, accessToken, expiresIn, idToken, sessionToken });
  } catch (err) {
    return httpError(err, "Store token failed.");
  }
});

app.post("/refresh", async (c) => {
  try {
    const { stored } = await resolveSession(c.req.raw, c.env);

    // If the cached access token is still valid (not expired and not within 60s of expiry), return it.
    const cachedValid =
      stored.access_token &&
      stored.access_token_expires_at &&
      Date.now() < new Date(stored.access_token_expires_at).getTime() - 60_000;

    if (cachedValid) {
      const remainingMs = new Date(stored.access_token_expires_at!).getTime() - Date.now();

      return c.json({
        accessToken: stored.access_token!,
        expiresIn: Math.max(60, Math.floor((remainingMs - 60_000) / 1000)),
        ...profileFromStored(stored),
      });
    }

    const fresh = await refreshAccessToken(stored.refresh_token, googleOpts(c.env), SCOPE);

    await updateAccessToken(
      c.env,
      stored.session_token,
      fresh.accessToken,
      new Date(Date.now() + (fresh.expiresIn - 60) * 1000).toISOString(),
    );

    return c.json({
      accessToken: fresh.accessToken,
      expiresIn: Math.max(60, fresh.expiresIn - 60),
      ...profileFromStored(stored),
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return cjson(err.message, err.status);
    }

    const message = err instanceof Error ? err.message : "Refresh failed.";
    const invalid = /invalid_grant|revoked|deleted|expired/i.test(message);

    return cjson(invalid ? "no_refresh_token" : "refresh_failed", invalid ? 401 : 502);
  }
});

app.post("/revoke", async (c) => {
  try {
    const { stored } = await resolveSession(c.req.raw, c.env);

    try {
      await revokeToken(stored.refresh_token);
    } catch {
      // best-effort; still delete below
    }

    await deleteSessions(c.env, stored.session_token);
    await deleteDriveOptIn(c.env, stored.sub);

    return c.json({ ok: true });
  } catch (err) {
    return httpError(err, "Revoke failed.");
  }
});

app.get("/drive-opt-in", async (c) => {
  try {
    const { stored } = await resolveSession(c.req.raw, c.env);
    const driveSyncOptIn = await readDriveOptIn(c.env, stored.sub);

    return c.json({ ok: true, driveSyncOptIn });
  } catch (err) {
    return httpError(err, "Read drive opt-in failed.");
  }
});

app.put("/drive-opt-in", async (c) => {
  try {
    const { stored } = await resolveSession(c.req.raw, c.env);
    const body = await c.req.json<{ driveSyncOptIn?: boolean }>();

    if (typeof body.driveSyncOptIn !== "boolean") {
      return cjson("Missing driveSyncOptIn boolean.", 400);
    }

    const now = new Date().toISOString();
    await upsertDriveOptIn(c.env, stored.sub, body.driveSyncOptIn, now);
    
    return c.json({ ok: true });
  } catch (err) {
    return httpError(err, "Store drive opt-in failed.");
  }
});

app.get("/", (c) => c.json({ ok: true, service: "rival-drive-token-refresh" }));

function googleOpts(env: Env): { clientId: string; clientSecret: string } {
  return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
}

function httpError(err: unknown, fallback: string): Response {
  if (err instanceof HttpError) {
    return cjson(err.message, err.status);
  }
  return cjson(err instanceof Error ? err.message : fallback, 400);
}

function cjson(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default app;
