import { describe, expect, test } from "vitest";
import {
  readStoredToken,
  upsertSession,
  updateAccessToken,
  deleteSessions,
  deleteExpiredSessions,
} from "./sessionStore";
import { testEnv } from "./test/mockD1";

describe("sessionStore", () => {
  test("readStoredToken selects by session_token OR sub with LIMIT 1", async () => {
    const { env, db } = testEnv();
    db.pushFirst({ session_token: "s", sub: "u" });

    const result = await readStoredToken(env, "any");

    expect(result).toEqual({ session_token: "s", sub: "u" });
    const [stmt] = db.prepRecords.slice(-1);
    expect(stmt.sql).toContain("session_token = ?1 OR sub = ?1");
    expect(stmt.sql).toContain("LIMIT 1");
    expect(stmt.bound).toContain("any");
  });

  test("upsertSession upserts on conflict(sub) and rotates tokens", async () => {
    const { env, db } = testEnv();
    await upsertSession(env, {
      sessionToken: "s-new",
      sub: "u",
      refreshToken: "rt-new",
      scope: "drive.file",
      storedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-07-01T00:00:00.000Z",
      accessToken: "at",
      accessTokenExpiresAt: "2026-01-01T01:00:00.000Z",
      name: "Ada Lovelace",
      email: "ada@example.com",
      picture: "http://pic/ada",
    });

    const stmt = db.prepRecords[db.prepRecords.length - 1];
    expect(stmt.sql).toContain("ON CONFLICT(sub) DO UPDATE SET");
    expect(stmt.sql).toContain("expires_at");
    expect(stmt.bound).toEqual([
      "s-new",
      "u",
      "rt-new",
      "drive.file",
      "2026-01-01T00:00:00.000Z",
      "2026-07-01T00:00:00.000Z",
      "at",
      "2026-01-01T01:00:00.000Z",
      "Ada Lovelace",
      "ada@example.com",
      "http://pic/ada",
    ]);
  });

  test("deleteExpiredSessions deletes rows with expires_at before now", async () => {
    const { env, db } = testEnv();
    await deleteExpiredSessions(env, "2026-07-01T00:00:00.000Z");
    const stmt = db.prepRecords[db.prepRecords.length - 1];
    expect(stmt.sql).toContain("DELETE FROM drive_sessions");
    expect(stmt.sql).toContain("expires_at < ?1");
    expect(stmt.bound[0]).toBe("2026-07-01T00:00:00.000Z");
  });

  test("updateAccessToken updates the cached access token for a session", async () => {
    const { env, db } = testEnv();
    await updateAccessToken(env, "s", "new-at", "2026-01-02T00:00:00.000Z");
    const stmt = db.prepRecords[db.prepRecords.length - 1];
    expect(stmt.sql).toContain("access_token = ?1");
    expect(stmt.bound).toEqual(["new-at", "2026-01-02T00:00:00.000Z", "s"]);
  });

  test("deleteSessions deletes by session_token OR sub", async () => {
    const { env, db } = testEnv();
    await deleteSessions(env, "s");
    const stmt = db.prepRecords[db.prepRecords.length - 1];
    expect(stmt.sql).toContain("session_token = ?1 OR sub = ?1");
  });
});
