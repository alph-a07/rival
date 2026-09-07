/** How urgent a runtime message is — drives the color the renderer picks. */
export type MessageTone = "error" | "warning" | "info";

export type BlockingPriority = 0 | 1 | 2;

/** A blocking modal's arbitration rank — higher wins the single modal slot. */
export const BLOCKING_PRIORITY: Record<"CORRUPTION" | "AUTH" | "OTHER", BlockingPriority> = {
  CORRUPTION: 2,
  AUTH: 1,
  OTHER: 0,
};

/** The set of all possible message surfaces. */
export type MessageSurface =
  | { surface: "toast" }
  | { surface: "banner" }
  | { surface: "blocking"; priority: BlockingPriority };

export interface Blockable {
  id: string;
  surface: MessageSurface;
  /** Insertion/raise order, to break priority ties deterministically. */
  order: number;
}

/** The closed set of action kinds a runtime message can carry. */
export type ActionKind =
  | "reconcile" // sync conflict: reconcile changed data
  | "retry" // retryable failure: re-run the failed operation
  | "reload" // new build staged: reload for the update
  | "reconnect-drive" // drive grant denied: reconnect Drive
  | "defer-auth" // drive grant denied: pause sync, defer reconnect
  | "enable-sync"; // storage pressure: turn on Drive sync

/** A message's single, optional action: `kind` is the closed `ActionKind` identity, `presentationKind` its UI tone. */
export interface RuntimeAction<Kind extends ActionKind = ActionKind> {
  kind: Kind;
  label: string;
  presentationKind: "primary" | "secondary" | "danger";
  /** What the action does when fired. Idempotent by design. */
  run: () => void;
}

/** An immutable, UI-facing notice emitted by the runtime layer. */
export interface RuntimeMessage {
  id: string;
  tone: MessageTone;
  surface: MessageSurface;
  title: string;
  body?: string;
  /** "once" → show a blocking message and drop it on dismiss (never re-raise). */
  once?: boolean;
  /** Optional action wired to this message (e.g. Retry, Reconcile, Reload). */
  action?: RuntimeAction;
  /** True while the message is in its "processing" state (e.g. syncing). */
  busy?: boolean;
}

/**
 * A raw interest raised by a source before it becomes a rendered `RuntimeMessage`.
 *
 * The input/output twin of `RuntimeMessage`:
 * - `RuntimeInterest` (input, no `id`) carries a dedup `key` instead.
 * - `RuntimeMessage` (output) carries an assigned `id`.
 */
export interface RuntimeInterest {
  key: string;
  errorKind?: string;
  tone: MessageTone;
  surface: MessageSurface;
  title: string;
  body?: string;
  once?: boolean;
  action?: RuntimeAction;
  /** True while the underlying operation is processing (e.g. reconciling). */
  busy?: boolean;
}

/** True when the message contends for the single modal slot. */
export function isBlockingSurface(
  s: MessageSurface,
): s is Extract<MessageSurface, { surface: "blocking" }> {
  return s.surface === "blocking";
}

/** Arbitration priority for a surface, monotonic with modal urgency. */
export function blockingRank(s: MessageSurface): number {
  return s.surface === "blocking" ? s.priority : -1;
}
