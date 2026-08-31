import { db as defaultDb } from "@/data/db";
import type { AppDatabase } from "@/data/db";
import type { Snapshot } from "@/domain/models/Snapshot";
import { Ok, Err, type Result } from "@/domain/errors/Result";
import { ErrorClassifier } from "@/domain/errors/ErrorClassifier";

export class SnapshotRepository {
  private readonly db: AppDatabase;

  constructor(db: AppDatabase = defaultDb) {
    this.db = db;
  }

  async create(snapshot: Snapshot): Promise<Result<string>> {
    try {
      return Ok(await this.db.snapshots.add(snapshot));
    } catch (e) {
      return Err(ErrorClassifier.fromDexieError(e, { entity: "Snapshot" }));
    }
  }

  async get(id: string): Promise<Result<Snapshot | undefined>> {
    try {
      return Ok(await this.db.snapshots.get(id));
    } catch (e) {
      return Err(ErrorClassifier.fromDexieError(e, { entity: "Snapshot", id }));
    }
  }

  /** All Snapshots, oldest-first. */
  async getAll(): Promise<Result<Snapshot[]>> {
    try {
      const snapshots = await this.db.snapshots.toArray();
      return Ok(
        snapshots.sort((a, b) =>
          a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0,
        ),
      );
    } catch (e) {
      return Err(ErrorClassifier.fromDexieError(e, { entity: "Snapshot", op: "getAll" }));
    }
  }

  /** All Snapshots for an endeavour, oldest-first. */
  async getByEndeavour(endeavourId: string): Promise<Result<Snapshot[]>> {
    try {
      const snapshots = await this.db.snapshots.where({ endeavourId }).toArray();
      return Ok(
        snapshots.sort((a, b) =>
          a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0,
        ),
      );
    } catch (e) {
      return Err(
        ErrorClassifier.fromDexieError(e, { entity: "Snapshot", endeavourId, op: "getByEndeavour" }),
      );
    }
  }

  /** The most recent Snapshot for an endeavour, or null. */
  async getLatestForEndeavour(endeavourId: string): Promise<Result<Snapshot | null>> {
    const result = await this.getByEndeavour(endeavourId);
    return result.ok ? Ok(result.value.at(-1) ?? null) : result;
  }

  /** Snapshots for an endeavour's given segment, oldest-first. */
  async getBySegment(endeavourId: string, segmentStartDate: string): Promise<Result<Snapshot[]>> {
    try {
      const snapshots = await this.db.snapshots.where({ endeavourId }).toArray();
      return Ok(
        snapshots
          .filter((s) => s.segmentStartDate === segmentStartDate)
          .sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0)),
      );
    } catch (e) {
      return Err(
        ErrorClassifier.fromDexieError(e, { entity: "Snapshot", endeavourId, op: "getBySegment" }),
      );
    }
  }

  /** The most recent Snapshot for an endeavour's given segment, or null. */
  async getLatestForSegment(
    endeavourId: string,
    segmentStartDate: string,
  ): Promise<Result<Snapshot | null>> {
    const result = await this.getBySegment(endeavourId, segmentStartDate);
    return result.ok ? Ok(result.value.at(-1) ?? null) : result;
  }

  /** The latest Snapshot for each endeavour across all of them, keyed by endeavourId. */
  async getLatestPerEndeavour(): Promise<Result<Map<string, Snapshot>>> {
    try {
      const snapshots = await this.db.snapshots.toArray();
      const map = snapshots.reduce((acc, snapshot) => {
        const current = acc.get(snapshot.endeavourId);
        if (!current || snapshot.timestamp > current.timestamp) {
          acc.set(snapshot.endeavourId, snapshot);
        }
        return acc;
      }, new Map<string, Snapshot>());
      return Ok(map);
    } catch (e) {
      return Err(
        ErrorClassifier.fromDexieError(e, { entity: "Snapshot", op: "getLatestPerEndeavour" }),
      );
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      await this.db.snapshots.delete(id);
      return Ok(undefined);
    } catch (e) {
      return Err(ErrorClassifier.fromDexieError(e, { entity: "Snapshot", id }));
    }
  }
}

/** App-wide singleton instance backing the hooks/UI path. */
export const snapshotRepository = new SnapshotRepository();
