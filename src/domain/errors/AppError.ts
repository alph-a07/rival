import type { MessageSurface } from "@/domain/notifications/types";

/**
 * The set of all possible error surfaces.
 * "silent" → log-only, never surfaced to the user.
 */
export type ErrorSurface = MessageSurface | { surface: "silent" };

/** The closed set of recoverable error conditions the app knows about. */
export type ErrorKind =
  | "offline"
  | "network"
  | "auth-expired"
  | "auth-denied"
  | "sync-conflict"
  | "storage-quota"
  | "storage-corrupt"
  | "validation"
  | "not-found"
  | "unknown";

/** User-visible severity, in terms of the design-system tone. */
export type ErrorTone = "error" | "warning" | "info";

export interface AppError {
  kind: ErrorKind;
  message: string;
  tone: ErrorTone;
  surface: ErrorSurface;
  /** Whether retrying could plausibly succeed — drives wiring a Retry action. */
  retryable: boolean;
  /** Original error, for logging only. Never rendered. */
  cause?: unknown;
  /** Structured context for logging, e.g. { entity: "Endeavour", id } */
  context?: Record<string, unknown>;
}

export function isAppError(e: unknown): e is AppError {
  return typeof e === "object" && e !== null && "kind" in e && "surface" in e;
}
