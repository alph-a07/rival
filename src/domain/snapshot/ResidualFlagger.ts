import type { Snapshot } from "@/domain/models/Snapshot";

/** Flags the "worst" Snapshot in a segment's history by the magnitude of its residual — the index of the largest absolute `residual`. */
export class ResidualFlagger {
  static flagWorst(snapshots: Snapshot[]): number | null {
    if (snapshots.length < 2) {
      return null;
    }

    let worstIndex = -1;
    let worstMagnitude = -1;
    for (let i = 0; i < snapshots.length; i++) {
      const residual = snapshots[i].residual;
      if (residual === null) {
        continue; // first check-in of a segment; no residual to compare
      }
      const magnitude = Math.abs(residual);
      if (magnitude > worstMagnitude) {
        worstMagnitude = magnitude;
        worstIndex = i;
      }
    }

    return worstIndex === -1 ? null : worstIndex;
  }
}
