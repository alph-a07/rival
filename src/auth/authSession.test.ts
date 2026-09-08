import { describe, expect, test } from "vitest";
import {
  decodeIdToken,
  toGoogleUser,
  getStoredIdentity,
  setStoredIdentity,
  toGoogleUserFromProfile,
  getStoredSessionToken,
  setStoredSessionToken,
} from "./authSession";

/** Builds a base64url JWT payload with the given claims (no signature needed for display decoding). */
function fakeIdToken(claims: Record<string, unknown>): string {
  const b64 = btoa(JSON.stringify(claims))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `eyJhbGciOiJSUzI1NiJ9.${b64}.signature`;
}

describe("decodeIdToken", () => {
  test("decodes sub + profile claims from the payload", () => {
    const decoded = decodeIdToken(
      fakeIdToken({ sub: "123", email: "a@example.com", name: "Ada", picture: "http://p" }),
    );
    expect(decoded).toEqual({
      sub: "123",
      email: "a@example.com",
      name: "Ada",
      picture: "http://p",
    });
  });

  test("is empty-sub-safe and tolerant of missing profile fields", () => {
    expect(decodeIdToken(fakeIdToken({ sub: "456" }))).toEqual({
      sub: "456",
      email: undefined,
      name: undefined,
      picture: undefined,
    });
  });

  test("returns empty sub for malformed tokens", () => {
    expect(decodeIdToken("not-a-token")).toEqual({ sub: "" });
    expect(decodeIdToken("a.b.c")).toEqual({ sub: "" });
  });
});

describe("toGoogleUser", () => {
  test("maps decoded claims to a GoogleUser with nulls for absent profile", () => {
    const user = toGoogleUser(fakeIdToken({ sub: "999", email: "b@example.com" }));
    expect(user).toEqual({
      uid: "999",
      email: "b@example.com",
      displayName: null,
      photoUrl: null,
      accessToken: null,
    });
  });

  test("carries the drive access token when provided", () => {
    const user = toGoogleUser(fakeIdToken({ sub: "1" }), "drive-access-token");
    expect(user.accessToken).toBe("drive-access-token");
  });
});

// The server-authoritative identity cache: a profile snapshot persisted (and
// rebuilt from /refresh) so identity survives id_token deletion. This is a
// display cache — `getStoredSessionToken()` is the real signed-in signal.
describe("stored identity cache (localStorage-backed)", () => {
  test("round-trips a server profile through the identity slot", () => {
    setStoredIdentity({
      uid: "sub-1",
      email: "ada@example.com",
      name: "Ada Lovelace",
      picture: "http://pic/ada",
    });
    expect(getStoredIdentity()).toEqual({
      uid: "sub-1",
      email: "ada@example.com",
      name: "Ada Lovelace",
      picture: "http://pic/ada",
    });
  });

  test("normalizes absent profile fields to null", () => {
    setStoredIdentity({ uid: "sub-2", email: null, name: null, picture: null });
    expect(getStoredIdentity()).toEqual({
      uid: "sub-2",
      email: null,
      name: null,
      picture: null,
    });
  });

  test("clearing removes the cached identity", () => {
    setStoredIdentity({ uid: "sub-3", email: null, name: null, picture: null });
    setStoredIdentity(null);
    expect(getStoredIdentity()).toBeNull();
  });

  test("toGoogleUserFromProfile maps a cached profile to a GoogleUser", () => {
    const user = toGoogleUserFromProfile(
      { uid: "sub-4", email: "b@example.com", name: "Bob", picture: "http://p" },
      "access-tok",
    );
    expect(user).toEqual({
      uid: "sub-4",
      email: "b@example.com",
      displayName: "Bob",
      photoUrl: "http://p",
      accessToken: "access-tok",
    });
  });

  test("session token and identity slots are independent (PII wipe preserves session)", () => {
    // Simulate the reported half-state: identity cleared but session token intact.
    setStoredSessionToken("session-tok-1");
    setStoredIdentity(null);
    expect(getStoredIdentity()).toBeNull();
    expect(getStoredSessionToken()).toBe("session-tok-1");
    setStoredSessionToken(null);
  });
});
