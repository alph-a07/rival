import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorClassifier } from "./ErrorClassifier";
import { Ok, Err, unwrap, mapResult, type Result } from "./Result";
import { withRetry, wakeRetryQueue } from "./withRetry";
import type { ErrorKind, AppError } from "./AppError";

describe("ErrorClassifier", () => {
  it("classifies Dexie QuotaExceededError as storage-quota", () => {
    const e = new Error("quota") as Error & { name: string };
    e.name = "QuotaExceededError";
    const app = ErrorClassifier.fromDexieError(e);
    expect(app.kind).toBe("storage-quota");
    expect(app.retryable).toBe(false);
  });

  it("classifies Dexie DataError as storage-corrupt", () => {
    const e = new Error("bad") as Error & { name: string };
    e.name = "DataError";
    expect(ErrorClassifier.fromDexieError(e).kind).toBe("storage-corrupt");
  });

  it("maps Drive 401 to auth-expired", () => {
    const err = { status: 401 } as unknown;
    expect(ErrorClassifier.fromDriveApiError(err).kind).toBe("auth-expired");
  });

  it("maps Drive 403 to auth-denied (distinct from expired)", () => {
    const err = { status: 403 } as unknown;
    expect(ErrorClassifier.fromDriveApiError(err).kind).toBe("auth-denied");
    expect(ErrorClassifier.fromDriveApiError(err).message).toContain("access");
  });

  it("maps Drive 409 to sync-conflict", () => {
    const err = { status: 409 } as unknown;
    expect(ErrorClassifier.fromDriveApiError(err).kind).toBe("sync-conflict");
  });

  it("maps Drive 429 to retryable network", () => {
    const err = { status: 429 } as unknown;
    const app = ErrorClassifier.fromDriveApiError(err);
    expect(app.kind).toBe("network");
    expect(app.retryable).toBe(true);
  });

  it("classifies offline FIRST regardless of vendor error", () => {
    vi.stubGlobal("navigator", { onLine: false });
    try {
      // Even a 429 (transient) is reported as offline when the device is offline.
      expect(ErrorClassifier.fromDriveApiError({ status: 429 }).kind).toBe("offline");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("authDenied builds an auth-denied AppError with the given message", () => {
    const app = ErrorClassifier.authDenied("Not available at this address.", {
      surface: { surface: "toast" },
    });
    expect(app.kind).toBe("auth-denied");
    expect(app.message).toBe("Not available at this address.");
    expect(app.surface).toEqual({ surface: "toast" });
    expect(app.retryable).toBe(false);
  });
});

describe("Result", () => {
  it("Ok/Err/unwrap/mapResult behave", () => {
    expect(unwrap(Ok(1))).toBe(1);
    const appError = {
      kind: "unknown",
      surface: { surface: "toast" },
      message: "x",
      tone: "error",
      retryable: false,
    } as const;
    expect(() => unwrap(Err(appError))).toThrow(/x/);
    expect(mapResult(Ok(2), (n) => n * 3)).toEqual({ ok: true, value: 6 });
    expect(mapResult(Err(appError), (n: number) => n).ok).toBe(false);
  });
});

describe("withRetry", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function retryErr(kind: ErrorKind, retryable: boolean): AppError {
    return {
      kind,
      surface: { surface: "toast" },
      message: "m",
      tone: "error",
      retryable,
    } as const as AppError;
  }

  it("retries a retryable failure up to maxAttempts then returns the Err", async () => {
    let calls = 0;
    const fn: () => Promise<Result<never>> = async () => {
      calls++;
      return Err(retryErr("network", true));
    };
    const p = withRetry(fn, { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 20 });
    await vi.advanceTimersByTimeAsync(100);
    const result = await p;
    expect(calls).toBe(3);
    expect(result.ok).toBe(false);
  });

  it("does not retry a non-retryable error", async () => {
    let calls = 0;
    const fn: () => Promise<Result<never>> = async () => {
      calls++;
      return Err(retryErr("unknown", false));
    };
    const result = await withRetry(fn, { maxAttempts: 5, baseDelayMs: 10 });
    expect(calls).toBe(1);
    expect(result.ok).toBe(false);
  });

  it("wakeRetryQueue resolves a pending backoff early (reconnect race)", async () => {
    let calls = 0;
    const fn: () => Promise<Result<unknown>> = async () => {
      calls++;
      return calls >= 2 ? Ok("done") : Err(retryErr("network", true));
    };
    const p = withRetry(fn, { maxAttempts: 3, baseDelayMs: 60_000, maxDelayMs: 60_000 });
    await vi.advanceTimersByTimeAsync(0);
    wakeRetryQueue(); // woken before the 60s timer elapses
    await vi.advanceTimersByTimeAsync(1);
    const result = await p;
    expect(result.ok).toBe(true);
    expect(calls).toBe(2);
  });
});
