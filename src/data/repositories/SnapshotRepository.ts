import { db as defaultDb } from "@/data/db";
import type { AppDatabase } from "@/data/db";
import type { Snapshot } from "@/domain/models/Snapshot";

export class SnapshotRepository {
  private readonly db: AppDatabase;

  constructor(db: AppDatabase = defaultDb) {
    this.db = db;
  }

  async create(snapshot: Snapshot): Promise<string> {
    return this.db.snapshots.add(snapshot);
  }

  async get(id: string): Promise<Snapshot | undefined> {
    return this.db.snapshots.get(id);
  }

  /** All Snapshots, oldest-first. */
  async getAll(): Promise<Snapshot[]> {
    const snapshots = await this.db.snapshots.toArray();
    return snapshots.sort((a, b) =>
      a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0,
    );
  }

  /** All Snapshots for an endeavour, oldest-first. */
  async getByEndeavour(endeavourId: string): Promise<Snapshot[]> {
    const snapshots = await this.db.snapshots.where({ endeavourId }).toArray();
    return snapshots.sort((a, b) =>
      a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0,
    );
  }

  /** The most recent Snapshot for an endeavour, or null. */
  async getLatestForEndeavour(endeavourId: string): Promise<Snapshot | null> {
    const snapshots = await this.getByEndeavour(endeavourId);
    return snapshots.at(-1) ?? null;
  }

  /** Snapshots for an endeavour's given segment, oldest-first. */
  async getBySegment(endeavourId: string, segmentStartDate: string): Promise<Snapshot[]> {
    const snapshots = await this.db.snapshots.where({ endeavourId }).toArray();
    return snapshots
      .filter((s) => s.segmentStartDate === segmentStartDate)
      .sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));
  }

  /** The most recent Snapshot for an endeavour's given segment, or null. */
  async getLatestForSegment(
    endeavourId: string,
    segmentStartDate: string,
  ): Promise<Snapshot | null> {
    const snapshots = await this.getBySegment(endeavourId, segmentStartDate);
    return snapshots.at(-1) ?? null;
  }

  /** The latest Snapshot for each endeavour across all of them, keyed by endeavourId. */
  async getLatestPerEndeavour(): Promise<Map<string, Snapshot>> {
    const snapshots = await this.db.snapshots.toArray();
    return snapshots.reduce((acc, snapshot) => {
      const current = acc.get(snapshot.endeavourId);
      if (!current || snapshot.timestamp > current.timestamp) {
        acc.set(snapshot.endeavourId, snapshot);
      }
      return acc;
    }, new Map<string, Snapshot>());
  }

  async delete(id: string): Promise<void> {
    return this.db.snapshots.delete(id);
  }
}

/** App-wide singleton instance backing the hooks/UI path. */
export const snapshotRepository = new SnapshotRepository();
