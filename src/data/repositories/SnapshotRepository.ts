import { db as defaultDb } from "@/data/db";
import type { AppDatabase } from "@/data/db";
import { snapshotToRow, rowToSnapshot } from "@/data/schema/SnapshotRow";
import type { Snapshot } from "@/domain/models/Snapshot";
import { Ok, Err, type Result } from "@/domain/errors/Result";
import { ErrorClassifier } from "@/domain/errors/ErrorClassifier";

/**
 * Data-access surface for snapshot rows. Public API speaks domain `Snapshot`;
 * this boundary maps to/from the persisted `SnapshotRow` DTO so storage and the
 * pure domain model stay decoupled. A handle, not a class.
 */
export interface SnapshotRepository {
  create(snapshot: Snapshot): Promise<Result<string>>;
  get(id: string): Promise<Result<Snapshot | undefined>>;
  getAll(): Promise<Result<Snapshot[]>>;
  getByEndeavour(endeavourId: string): Promise<Result<Snapshot[]>>;
  getLatestForEndeavour(endeavourId: string): Promise<Result<Snapshot | null>>;
  getBySegment(endeavourId: string, segmentStartDate: string): Promise<Result<Snapshot[]>>;
  getLatestForSegment(
    endeavourId: string,
    segmentStartDate: string,
  ): Promise<Result<Snapshot | null>>;
  getLatestPerEndeavour(): Promise<Result<Map<string, Snapshot>>>;
  delete(id: string): Promise<Result<void>>;
}

const byTime = <T extends { timestamp: string }>(a: T, b: T): number =>
  a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0;

/** Creates a snapshot repository against a Dexie database. */
export function createSnapshotRepository(db: AppDatabase = defaultDb): SnapshotRepository {
  return {
    async create(snapshot) {
      try {
        return Ok(await db.snapshots.add(snapshotToRow(snapshot)));
      } catch (e) {
        return Err(ErrorClassifier.fromDexieError(e, { entity: "Snapshot" }));
      }
    },

    async get(id) {
      try {
        const row = await db.snapshots.get(id);
        return Ok(row ? rowToSnapshot(row) : undefined);
      } catch (e) {
        return Err(ErrorClassifier.fromDexieError(e, { entity: "Snapshot", id }));
      }
    },

    async getAll() {
      try {
        const rows = await db.snapshots.toArray();
        return Ok(rows.sort(byTime).map(rowToSnapshot));
      } catch (e) {
        return Err(ErrorClassifier.fromDexieError(e, { entity: "Snapshot", op: "getAll" }));
      }
    },

    async getByEndeavour(endeavourId) {
      try {
        const rows = await db.snapshots.where({ endeavourId }).toArray();
        return Ok(rows.sort(byTime).map(rowToSnapshot));
      } catch (e) {
        return Err(
          ErrorClassifier.fromDexieError(e, {
            entity: "Snapshot",
            endeavourId,
            op: "getByEndeavour",
          }),
        );
      }
    },

    async getLatestForEndeavour(endeavourId) {
      try {
        const rows = await db.snapshots.where({ endeavourId }).toArray();
        const latest = rows.sort(byTime).at(-1);
        return Ok(latest ? rowToSnapshot(latest) : null);
      } catch (e) {
        return Err(
          ErrorClassifier.fromDexieError(e, {
            entity: "Snapshot",
            endeavourId,
            op: "getLatestForEndeavour",
          }),
        );
      }
    },

    async getBySegment(endeavourId, segmentStartDate) {
      try {
        const rows = await db.snapshots.where({ endeavourId }).toArray();
        const matches = rows.filter((s) => s.segmentStartDate === segmentStartDate).sort(byTime);
        return Ok(matches.map(rowToSnapshot));
      } catch (e) {
        return Err(
          ErrorClassifier.fromDexieError(e, {
            entity: "Snapshot",
            endeavourId,
            op: "getBySegment",
          }),
        );
      }
    },

    async getLatestForSegment(endeavourId, segmentStartDate) {
      try {
        const rows = await db.snapshots.where({ endeavourId }).toArray();
        const matches = rows.filter((s) => s.segmentStartDate === segmentStartDate).sort(byTime);
        const latest = matches.at(-1);
        return Ok(latest ? rowToSnapshot(latest) : null);
      } catch (e) {
        return Err(
          ErrorClassifier.fromDexieError(e, {
            entity: "Snapshot",
            endeavourId,
            op: "getLatestForSegment",
          }),
        );
      }
    },

    async getLatestPerEndeavour() {
      try {
        const rows = await db.snapshots.toArray();
        const map = rows.reduce((acc: Map<string, Snapshot>, row) => {
          const current = acc.get(row.endeavourId);
          if (!current || row.timestamp > current.timestamp) {
            acc.set(row.endeavourId, rowToSnapshot(row));
          }
          return acc;
        }, new Map<string, Snapshot>());
        return Ok(map);
      } catch (e) {
        return Err(
          ErrorClassifier.fromDexieError(e, { entity: "Snapshot", op: "getLatestPerEndeavour" }),
        );
      }
    },

    async delete(id) {
      try {
        await db.snapshots.delete(id);
        return Ok(undefined);
      } catch (e) {
        return Err(ErrorClassifier.fromDexieError(e, { entity: "Snapshot", id }));
      }
    },
  };
}

/** App-wide singleton instance backing the hooks/UI path. */
export const snapshotRepository: SnapshotRepository = createSnapshotRepository();
