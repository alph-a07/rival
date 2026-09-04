import { Logger } from "@/core/logging/logger";
import { isAppError, type AppError } from "./AppError";
import { ErrorClassifier } from "./ErrorClassifier";
import { createRetryAction } from "@/domain/notifications/actions/retryAction";
import type { RuntimeInterest } from "@/domain/notifications/types";
import type { Bridge } from "@/domain/notifications/client";

/** The live bridge the reporter pushes messages through. Set by `setReporter`. */
let bridge: Bridge | null = null;

/** Message-id counter so routed errors are dedupable by key. */
let messageSeq = 0;

const BRIDGE_KEY = "reported";

/**
 * Bind the reporter to the single live bridge the shell owns.
 * Passing null detaches it.
 */
export function setReporter(target: Bridge | null): void {
  bridge = target;
}

/** Options for reporting an error. */
export interface ReportOptions {
  source?: string;
  context?: Record<string, unknown>;
  /** A re-runnable version of the failed operation, used to wire a Retry action. */
  retry?: () => void;
}

/**
 * The single funnel for every error in the app.
 * Returns a message key when the error was surfaced, or null when it was logged-only / suppressed.
 */
export function reportError(input: unknown, opts: ReportOptions = {}): string | null {
  const source = opts.source ?? "unknown";
  const error: AppError = isAppError(input)
    ? input
    : ErrorClassifier.fromUnknown(input, opts.context);

  if (isNoise(error)) {
    Logger.ui.debug(`reportError — suppressed noise from ${source}`, source);
    return null;
  }

  log(error, source);

  if (!bridge) {
    return null; // logged only; nothing mounted to surface through yet
  }
  if (error.surface.surface === "silent") {
    return null;
  }

  const action = error.retryable && opts.retry ? createRetryAction(() => opts.retry!()) : undefined;

  const key = `${BRIDGE_KEY}:${error.kind}:${messageSeq++}`;
  const interest: RuntimeInterest = {
    key,
    errorKind: error.kind,
    tone: error.tone,
    // The silent branch already returned above, so this narrows to MessageSurface.
    surface: error.surface,
    title: error.message,
    once: false,
    action,
  };
  bridge.raise(interest);
  return key;
}

/** Non-error path: push a message directly, skipping error classification. */
export function notifyDirect(input: Omit<RuntimeInterest, "key">): string {
  const key = `${BRIDGE_KEY}:direct:${messageSeq++}`;
  bridge?.raise({ key, ...input });
  return key;
}

function log(error: AppError, source: string): void {
  const sink = error.tone === "error" ? Logger.ui.error : Logger.ui.warn;
  sink.call(Logger.ui, `[${source}]`, error.message, error.cause ?? error.context ?? "");
}

/** Known-noisy errors that reach window.onerror/unhandledrejection but never indicate anything actionable for the user — logged only, never surfaced. */
const IGNORED_PATTERNS: RegExp[] = [
  /ResizeObserver loop/i,
  /Non-Error promise rejection captured/i,
];

function isNoise(error: AppError): boolean {
  const causeMessage = (error.cause as Error)?.message ?? "";
  return IGNORED_PATTERNS.some((p) => p.test(error.message) || p.test(causeMessage));
}
