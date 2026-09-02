import type { Result } from "./Result";
import type { AppError } from "./AppError";

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 30000;
const DEFAULT_BACKOFF_FACTOR = 2;

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Inject a connectivity wait that resolves early when `navigator` comes back online. */
  waitUntilReconnect?: boolean;
}

type Waiter = () => void;
const onlineWaiters = new Set<Waiter>();

/** Called by the connectivity monitor when the browser comes back online. */
export function wakeRetryQueue(): void {
  onlineWaiters.forEach((resolve) => resolve());
  onlineWaiters.clear();
}

/**
 * Wraps a Result-returning call with silent exponential backoff.
 * Only retries when the returned error says `retryable: true`; anything else, or attempts exhausted, returns the `Err` as-is for the caller to hand to `reportError`.
 * Intermediate attempts are silent — only the final outcome is the caller's.
 */
export async function withRetry<T>(
  fn: () => Promise<Result<T>>,
  opts: RetryOptions = {},
): Promise<Result<T>> {
  const {
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
  } = opts;

  let attempt = 0;
  for (;;) {
    const result = await fn();
    if (result.ok) {
      return result;
    }
    const err = result.error as AppError;
    if (!err.retryable || attempt >= maxAttempts - 1) {
      return result;
    }
    await delayOrReconnect(Math.min(baseDelayMs * DEFAULT_BACKOFF_FACTOR ** attempt, maxDelayMs));
    attempt++;
  }
}

/** True when the device is offline — used by classifiers to short-circuit. */
export function isOffline(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.onLine === "boolean" &&
    navigator.onLine === false
  );
}

function delayOrReconnect(ms: number): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) {
        return;
      }
      done = true;
      clearTimeout(timer);
      onlineWaiters.delete(waiter);
      resolve();
    };
    const waiter: Waiter = finish;
    onlineWaiters.add(waiter);
    const timer = setTimeout(finish, ms);
  });
}
