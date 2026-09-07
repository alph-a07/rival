import type { AppError, ErrorKind, ErrorSurface, ErrorTone } from "./AppError";
import { isOffline } from "./withRetry";

interface ClassifyDefaults {
  tone: ErrorTone;
  surface: ErrorSurface;
  retryable: boolean;
  message: string;
}

const DEFAULTS: Record<ErrorKind, ClassifyDefaults> = {
  offline: {
    tone: "info",
    surface: { surface: "banner" },
    retryable: true,
    message: "You're offline — changes will sync once you're back online.",
  },
  network: {
    tone: "error",
    surface: { surface: "toast" },
    retryable: true,
    message: "Couldn't reach the network. We'll keep trying.",
  },
  "auth-expired": {
    tone: "error",
    surface: { surface: "blocking", priority: 1 },
    retryable: false,
    message: "Your session expired. Please sign in again.",
  },
  "auth-denied": {
    tone: "error",
    surface: { surface: "blocking", priority: 1 },
    retryable: false,
    message: "You don't have access to do that.",
  },
  "sync-conflict": {
    tone: "warning",
    surface: { surface: "banner" },
    retryable: true,
    message: "Some changes need to be reconciled with your other device.",
  },
  "storage-quota": {
    tone: "warning",
    surface: { surface: "banner" },
    retryable: false,
    message: "You're running low on device storage.",
  },
  "storage-corrupt": {
    tone: "error",
    surface: { surface: "blocking", priority: 2 },
    retryable: false,
    message: "Local data looks corrupted. A repair may be needed.",
  },
  validation: {
    tone: "warning",
    surface: { surface: "toast" },
    retryable: false,
    message: "That doesn't look right — check the highlighted field.",
  },
  "not-found": {
    tone: "error",
    surface: { surface: "toast" },
    retryable: false,
    message: "Couldn't find that.",
  },
  unknown: {
    tone: "error",
    surface: { surface: "toast" },
    retryable: false,
    message: "Something went wrong.",
  },
};

/**
 * Build an `AppError` from a kind and a cause.
 * Callers can override the default tone, surface, retryable, and message.
 */
function build(kind: ErrorKind, cause: unknown, overrides?: Partial<AppError>): AppError {
  const d = DEFAULTS[kind];
  return {
    kind,
    message: d.message,
    tone: d.tone,
    surface: d.surface,
    retryable: d.retryable,
    cause,
    ...overrides,
  };
}

/** A class for classifying errors from various sources into a canonical `AppError`. */
export class ErrorClassifier {
  /** Classify a Dexie error into a canonical `AppError`. */
  static fromDexieError(e: unknown, context?: Record<string, unknown>): AppError {
    const name = (e as { name?: string })?.name ?? "";
    if (name === "QuotaExceededError") {
      return build("storage-quota", e, { context });
    }
    if (name === "DataError" || name === "InvalidStateError") {
      return build("storage-corrupt", e, { context });
    }
    return build("unknown", e, { context });
  }

  /** Classify a Drive API error into a canonical `AppError`. */
  static fromDriveApiError(e: unknown, context?: Record<string, unknown>): AppError {
    if (isOffline()) {
      return build("offline", e, { context });
    }
    const status = (e as { status?: number })?.status;
    if (status === 401) {
      return build("auth-expired", e, { context });
    }
    if (status === 403) {
      return build("auth-denied", e, { context });
    }
    if (status === 409 || status === 412) {
      return build("sync-conflict", e, { context });
    }
    if (status === 429 || (typeof status === "number" && status >= 500)) {
      return build("network", e, { context, retryable: true });
    }
    return build("unknown", e, { context });
  }

  /** Classify an auth Worker /refresh failure into a canonical `AppError`. */
  static fromAuthWorkerError(e: unknown, context?: Record<string, unknown>): AppError {
    if (isOffline()) {
      return build("offline", e, { context });
    }
    // The Worker reports a dead durable session via the `no_refresh_token` code
    if ((e as { code?: string })?.code === "no_refresh_token") {
      return build("auth-expired", e, {
        context,
        message: "Your Google connection expired. Please sign in again.",
      });
    }
    return build("unknown", e, { context });
  }

  /** Build a canonical `AppError` for any validation errors. */
  static validation(message: string, field?: string): AppError {
    return build("validation", undefined, { message, context: field ? { field } : undefined });
  }

  /** Build a canonical `AppError` for any "not found" errors. */
  static notFound(entity: string, id: string): AppError {
    return build("not-found", undefined, {
      message: `Couldn't find that ${entity.toLowerCase()}.`,
      context: { entity, id },
    });
  }

  /** Build a canonical `AppError` for any unknown errors. */
  static fromUnknown(e: unknown, context?: Record<string, unknown>): AppError {
    if (isOffline()) {
      return build("offline", e, { context });
    }
    return build("unknown", e, { context });
  }
}
