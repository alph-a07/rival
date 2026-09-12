import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { completeIdentitySignIn } from "./auth";
import { getStoredIdToken, getStoredIdentity } from "./authSession";
import * as gsiClient from "./gsiClient";

vi.mock("./gsiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./gsiClient")>();
  return { ...actual, currentOrigin: vi.fn(() => "http://localhost:5173") };
});

/** Builds a base64url JWT payload with the given claims (no signature needed). */
function fakeIdToken(claims: Record<string, unknown>): string {
  const b64 = btoa(JSON.stringify(claims))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `eyJhbGciOiJSUzI1NiJ9.${b64}.signature`;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);
const validToken = () =>
  fakeIdToken({
    sub: "123",
    email: "a@example.com",
    name: "Ada",
    aud: "client-123",
    iss: "https://accounts.google.com",
    exp: nowSeconds() + 3600,
  });

afterEach(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  // Tests share the module-level localStorage and the mocked origin; isolate
  // each case so stored tokens and the origin stub can't leak across tests.
  localStorage.clear();
  vi.mocked(gsiClient.currentOrigin).mockReset().mockReturnValue("http://localhost:5173");
});

describe("completeIdentitySignIn", () => {
  test("signs in a valid token at an authorized origin", () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "client-123");
    const user = completeIdentitySignIn(validToken());
    expect(user.uid).toBe("123");
    expect(user.email).toBe("a@example.com");
  });

  test("refuses sign-in at an unauthorized origin and persists nothing", () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "client-123");
    vi.mocked(gsiClient.currentOrigin).mockReturnValue("http://192.168.31.179:5173");

    expect(() => completeIdentitySignIn(validToken())).toThrow(/approved address/);
    expect(getStoredIdToken()).toBeNull();
    expect(getStoredIdentity()).toBeNull();
  });

  test("rejects a token minted for another client", () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "client-123");
    const token = fakeIdToken({
      sub: "123",
      aud: "other-client",
      iss: "https://accounts.google.com",
      exp: nowSeconds() + 3600,
    });
    expect(() => completeIdentitySignIn(token)).toThrow(/invalid identity token/);
  });

  test("rejects an expired token", () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "client-123");
    const token = fakeIdToken({
      sub: "123",
      aud: "client-123",
      iss: "https://accounts.google.com",
      exp: nowSeconds() - 60,
    });
    expect(() => completeIdentitySignIn(token)).toThrow(/invalid identity token/);
  });
});
