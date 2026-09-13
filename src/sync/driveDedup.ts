/** A candidate backup file. */
export interface BackupCandidate {
  id: string;
  createdAt: string;
}

/** The single authoritative backup file among a set of candidates.
 * @param id The file every tab must read from and write to.
 * @param trashed The files that must be deleted to converge the set to a single file.
 */
export interface BackupSurvivor {
  id: string;
  trashed: string[];
}

/**
 * Picks the single authoritative backup among the candidates.
 *
 * The winner is the one with the earliest `createdAt` timestamp, and in case of a tie, the one with the lexicographically smallest `id`.
 */
export function pickAuthoritative(candidates: readonly BackupCandidate[]): BackupSurvivor | null {
  if (candidates.length === 0) {
    return null;
  }

  let winner = candidates[0];
  for (const candidate of candidates.slice(1)) {
    const byTime = compareTime(candidate.createdAt, winner.createdAt);
    if (byTime < 0 || (byTime === 0 && candidate.id < winner.id)) {
      winner = candidate;
    }
  }

  return {
    id: winner.id,
    trashed: candidates.filter((c) => c.id !== winner.id).map((c) => c.id),
  };
}

/** Whether the set already reflects cleaned state (zero-or-one files). */
export function isCleanSet(candidates: readonly BackupCandidate[]): boolean {
  return candidates.length <= 1;
}

const compareTime = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
