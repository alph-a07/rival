import type { Blockable, BlockingKind } from "./types";

/**
 * Compare two blocking interests for arbitration based on their priority.
 * - strictly higher priority → +1
 * - lower → -1
 * - equal priority → 0 (tie kept stable by insertion order downstream).
 */
export function compareBlocking(a: BlockingKind, b: BlockingKind): number {
  const pa = a.blocking ? a.priority : -1;
  const pb = b.blocking ? b.priority : -1;
  return pa > pb ? 1 : pa < pb ? -1 : 0;
}

/** Given the active + queued blocking candidates, return the message that should be active — or null when nothing is blocking. */
export function arbitrate<T extends Blockable>(current: readonly T[]): T | null {
  const blocking = current.filter((m) => m.blocking.blocking).slice();
  if (blocking.length === 0) {
    return null;
  }
  // max by priority, then min by order.
  let winner = blocking[0];
  for (const candidate of blocking.slice(1)) {
    const cmp = compareBlocking(candidate.blocking, winner.blocking);
    if (cmp > 0 || (cmp === 0 && candidate.order < winner.order)) {
      winner = candidate;
    }
  }
  return winner;
}
