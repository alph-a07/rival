import type { AppError } from "./AppError";

export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const Err = <E = AppError>(error: E): Result<never, E> => ({ ok: false, error });

/**
 * Unwraps or throws.
 * Use only at the very top of the stack (scripts, tests) — never in a component/hook.
 */
export function unwrap<T>(r: Result<T>): T {
  if (r.ok) {
    return r.value;
  }
  throw r.error;
}

/** Transform a successful value without unwrapping; passes errors through untouched. */
export function mapResult<T, U>(r: Result<T>, fn: (v: T) => U): Result<U> {
  return r.ok ? Ok(fn(r.value)) : r;
}
