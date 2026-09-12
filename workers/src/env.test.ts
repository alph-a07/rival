import { describe, expect, test } from "vitest";
import { allowedOrigins, isAllowedOrigin } from "./env";
import { testEnv } from "./test/mockD1";

describe("Worker origin policy", () => {
  test("defaults to local development origins when unset in dev", () => {
    const { env } = testEnv();
    expect(allowedOrigins(env)).toEqual(["http://localhost:5173", "http://127.0.0.1:5173"]);
    expect(isAllowedOrigin("http://localhost:5173", env)).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:5173", env)).toBe(true);
  });

  test("ALLOWED_ORIGINS is the source of truth in dev when set", () => {
    const { env } = testEnv();
    env.ALLOWED_ORIGINS = "https://rival.example, https://staging.rival.example";
    expect(allowedOrigins(env)).toEqual(["https://rival.example", "https://staging.rival.example"]);
    expect(isAllowedOrigin("https://rival.example", env)).toBe(true);
    expect(isAllowedOrigin("http://localhost:5173", env)).toBe(false);
  });

  test("treats a blank ALLOWED_ORIGINS as unset in dev", () => {
    const { env } = testEnv();
    env.ALLOWED_ORIGINS = "   ";
    expect(allowedOrigins(env)).toEqual(["http://localhost:5173", "http://127.0.0.1:5173"]);
  });

  test("production requires ALLOWED_ORIGINS and never falls back to localhost", () => {
    const { env } = testEnv();
    env.ENVIRONMENT = "production";
    expect(allowedOrigins(env)).toEqual([]);
    expect(isAllowedOrigin("http://localhost:5173", env)).toBe(false);
  });

  test("production uses only the configured origins", () => {
    const { env } = testEnv();
    env.ENVIRONMENT = "production";
    env.ALLOWED_ORIGINS = "https://rival.example";
    expect(allowedOrigins(env)).toEqual(["https://rival.example"]);
    expect(isAllowedOrigin("https://rival.example", env)).toBe(true);
    expect(isAllowedOrigin("https://evil.example", env)).toBe(false);
    expect(isAllowedOrigin("http://localhost:5173", env)).toBe(false);
  });

  test("rejects missing origins", () => {
    const { env } = testEnv();
    expect(isAllowedOrigin(undefined, env)).toBe(false);
  });
});
