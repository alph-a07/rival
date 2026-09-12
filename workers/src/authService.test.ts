import { beforeEach, describe, expect, test, vi } from "vitest";
import { HttpError, newSessionToken, profileFromStored, resolveSession } from "./authService";
import { testEnv } from "./test/mockD1";

vi.mock("./lib/googleVerify", () => ({
  verifyGoogleIdToken: vi.fn(async (token: string) => (token === "legacy-jwt" ? "sub-1" : "")),
}));

describe("newSessionToken", () => {
  test("is a 32-char token from 32 bytes of randomness (6 bits/char)", () => {
    const t = newSessionToken();
    expect(t).toHaveLength(32);
    expect(t).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  test("is different across calls", () => {
    expect(newSessionToken()).not.toBe(newSessionToken());
  });
});

describe("resolveSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validStored = (expiresAt: string) => ({
    session_token: "sess",
    sub: "sub-1",
    refresh_token: "rt",
    scope: "drive.file",
    stored_at: new Date(Date.now() - 1000).toISOString(),
    expires_at: expiresAt,
    access_token: "at",
    access_token_expires_at: null,
    name: "Ada Lovelace",
    email: "ada@example.com",
    picture: "http://pic/ada",
  });

  test("resolves a live session token whose expiry is in the future", async () => {
    const { env, db } = testEnv();
    db.pushFirst(validStored(new Date(Date.now() + 1000 * 60).toISOString()));
    const req = new Request("http://localhost/refresh", {
      headers: { Authorization: "Bearer sess" },
    });

    const { stored } = await resolveSession(req, env);
    expect(stored.session_token).toBe("sess");
    // No expiry DELETE issued.
    const deletes = db.prepRecords.filter((r) => r.sql.includes("DELETE"));
    expect(deletes).toHaveLength(0);
  });

  test("rejects + deletes an expired session", async () => {
    const { env, db } = testEnv();
    db.pushFirst(validStored(new Date(Date.now() - 1000).toISOString()));
    const req = new Request("http://localhost/refresh", {
      headers: { Authorization: "Bearer sess" },
    });

    await expect(resolveSession(req, env)).rejects.toMatchObject({
      status: 401,
      message: "Your Google connection expired. Please sign in again.",
    });
    // Expiry trigger issues a DELETE for expired rows.
    const deletes = db.prepRecords.filter((r) => r.sql.includes("DELETE"));
    expect(deletes.length).toBe(1);
  });

  test("JWT credential resolves by verifying then looking up sub", async () => {
    const { env, db } = testEnv();
    db.pushFirst(validStored(new Date(Date.now() + 1000 * 60).toISOString()));
    const req = new Request("http://localhost/refresh", {
      headers: { Authorization: "Bearer legacy-jwt" },
    });

    const { stored } = await resolveSession(req, env);
    expect(stored.sub).toBe("sub-1");
  });

  test("throws 401 when no session row exists", async () => {
    const { env } = testEnv(); // no pushed row -> first() null
    const req = new Request("http://localhost/refresh", {
      headers: { Authorization: "Bearer session-token-x" },
    });

    await expect(resolveSession(req, env)).rejects.toThrowError(HttpError);
    await expect(resolveSession(req, env)).rejects.toMatchObject({ status: 401 });
  });
});

describe("profileFromStored", () => {
  test("extracts the display profile the client can rebuild identity from", () => {
    const profile = profileFromStored({
      session_token: "sess",
      sub: "sub-1",
      refresh_token: "rt",
      scope: "drive.file",
      stored_at: "2026-01-01T00:00:00.000Z",
      expires_at: "2026-07-01T00:00:00.000Z",
      access_token: "at",
      access_token_expires_at: null,
      name: "Ada Lovelace",
      email: "ada@example.com",
      picture: null,
    });
    expect(profile).toEqual({
      sub: "sub-1",
      email: "ada@example.com",
      name: "Ada Lovelace",
      picture: null,
    });
  });

  test("normalizes absent profile fields to null", () => {
    const profile = profileFromStored({
      session_token: "sess",
      sub: "sub-1",
      refresh_token: "rt",
      scope: "drive.file",
      stored_at: "2026-01-01T00:00:00.000Z",
      expires_at: "2026-07-01T00:00:00.000Z",
      access_token: null,
      access_token_expires_at: null,
      name: null,
      email: null,
      picture: null,
    });
    expect(profile).toEqual({
      sub: "sub-1",
      email: null,
      name: null,
      picture: null,
    });
  });
});
