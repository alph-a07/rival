import { describe, expect, test } from "vitest";
import { allowedOrigins, isAllowedOrigin } from "./env";
import { testEnv } from "./test/mockD1";

describe("Worker origin policy", () => {
  test("allows local development origins", () => {
    const { env } = testEnv();
    expect(isAllowedOrigin("http://localhost:5173", env)).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:5173", env)).toBe(true);
  });

  test("allows only explicitly configured deployed origins", () => {
    const { env } = testEnv();
    env.ENVIRONMENT = "production";
    env.ALLOWED_ORIGINS = "https://rival.example, https://staging.rival.example";
    expect(allowedOrigins(env)).toContain("https://rival.example");
    expect(isAllowedOrigin("https://rival.example", env)).toBe(true);
    expect(isAllowedOrigin("https://evil.example", env)).toBe(false);
  });

  test("does not fall back to localhost in production", () => {
    const { env } = testEnv();
    env.ENVIRONMENT = "production";
    expect(isAllowedOrigin("http://localhost:5173", env)).toBe(false);
  });

  test("rejects missing origins", () => {
    const { env } = testEnv();
    expect(isAllowedOrigin(undefined, env)).toBe(false);
  });
});
