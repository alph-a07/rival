import type { Blockable, MessageSurface } from "./types";
import { blockingRank, isBlockingSurface } from "./types";

/**
 * Compare two surfaces for arbitration by their blocking rank.
 * - strictly higher rank → +1
 * - lower rank → -1
 * - equal rank → 0 (tie kept stable by insertion order downstream).
 */
export function compareBlocking(a: MessageSurface, b: MessageSurface): number {
  const pa = blockingRank(a);
  const pb = blockingRank(b);
  return pa > pb ? 1 : pa < pb ? -1 : 0;
}

/** Given the active + queued blocking candidates, return the message that should be active — or null when nothing is blocking. */
export function arbitrate<T extends Blockable>(current: readonly T[]): T | null {
  const blocking = current.filter((m) => isBlockingSurface(m.surface)).slice();
  if (blocking.length === 0) {
    return null;
  }
  // max by priority, then min by order.
  let winner = blocking[0];
  for (const candidate of blocking.slice(1)) {
    const cmp = compareBlocking(candidate.surface, winner.surface);
    if (cmp > 0 || (cmp === 0 && candidate.order < winner.order)) {
      winner = candidate;
    }
  }
  return winner;
}
