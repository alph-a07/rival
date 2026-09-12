import { afterEach, describe, expect, test, vi } from "vitest";
import { authorizedGoogleOrigins, isAuthorizedGoogleOrigin } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("authorizedGoogleOrigins", () => {
  test("defaults to the pinned dev origin when VITE_AUTHORIZED_ORIGINS is unset", () => {
    vi.stubEnv("VITE_AUTHORIZED_ORIGINS", "");
    expect(authorizedGoogleOrigins()).toEqual(["http://localhost:5173"]);
  });

  test("parses a comma-separated list, trimming entries and dropping blanks", () => {
    vi.stubEnv("VITE_AUTHORIZED_ORIGINS", "https://rival.example, http://192.168.1.5:5173, ,  ");
    expect(authorizedGoogleOrigins()).toEqual(["https://rival.example", "http://192.168.1.5:5173"]);
  });
});

describe("isAuthorizedGoogleOrigin", () => {
  const allowed = ["http://localhost:5173", "https://rival.example"];

  test("matches an allowed origin exactly", () => {
    expect(isAuthorizedGoogleOrigin("http://localhost:5173", allowed)).toBe(true);
    expect(isAuthorizedGoogleOrigin("https://rival.example", allowed)).toBe(true);
  });

  test("treats scheme, host, and port differences as different origins", () => {
    expect(isAuthorizedGoogleOrigin("http://localhost:5174", allowed)).toBe(false);
    expect(isAuthorizedGoogleOrigin("https://localhost:5173", allowed)).toBe(false);
    expect(isAuthorizedGoogleOrigin("http://rival.example", allowed)).toBe(false);
    expect(isAuthorizedGoogleOrigin("https://rival.example:443", allowed)).toBe(false);
  });

  test("uses the env-configured list by default", () => {
    vi.stubEnv("VITE_AUTHORIZED_ORIGINS", "https://rival.example");
    expect(isAuthorizedGoogleOrigin("https://rival.example")).toBe(true);
    expect(isAuthorizedGoogleOrigin("http://localhost:5173")).toBe(false);
  });
});
