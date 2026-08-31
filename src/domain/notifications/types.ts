/** Why a message exists — drives default presentation and priority. */
export type MessageKind =
  | "network" // offline / back-online notice (non-blocking)
  | "storage" // proactive storage-pressure warning (non-blocking, actionable)
  | "sync" // sync conflict: some changes need reconciliation (actionable)
  | "pwa" // a new service-worker build is waiting (actionable: reload)
  | "toast" // transient one-off notice (auto-dismisses)
  | "auth" // blocking: credentials expired, must re-auth now
  | "corruption"; // blocking: local store corrupt, must fix before continuing

export type BlockingKind = { blocking: false } | { blocking: true; priority: BlockingPriority };

export type BlockingPriority = 0 | 1 | 2;

export const BLOCKING_PRIORITY: Record<"CORRUPTION" | "AUTH" | "OTHER", BlockingPriority> = {
  CORRUPTION: 2,
  AUTH: 1,
  OTHER: 0,
};

export interface Blockable {
  id: string;
  blocking: BlockingKind;
  /** Insertion/raise order, to break priority ties deterministically. */
  order: number;
}

/** The closed set of action kinds a runtime message can carry. */
export type ActionKind =
  | "reconcile" // sync conflict: reconcile changed data
  | "retry" // retryable failure: re-run the failed operation
  | "reload" // new build staged: reload for the update
  | "re-auth" // expired session: sign in again
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
  kind: MessageKind;
  blocking: BlockingKind;
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
  kind: MessageKind;
  blocking: BlockingKind;
  title: string;
  body?: string;
  once?: boolean;
  action?: RuntimeAction;
  /** True while the underlying operation is processing (e.g. reconciling). */
  busy?: boolean;
}
