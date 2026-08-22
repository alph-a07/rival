import { db as defaultDb } from "@/data/db";
import type { AppDatabase } from "@/data/db";
import type { CheckIn } from "@/data/schema/CheckIn";
import type { Snapshot } from "@/data/schema/Snapshot";
import {
  snapshotRepository as defaultSnapshotRepository,
  SnapshotRepository,
} from "./SnapshotRepository";

export class CheckInRepository {
  private readonly db: AppDatabase;
  private readonly snapshots: SnapshotRepository;

  constructor(
    db: AppDatabase = defaultDb,
    snapshots: SnapshotRepository = defaultSnapshotRepository,
  ) {
    this.db = db;
    this.snapshots = snapshots;
  }

  async create(checkIn: CheckIn): Promise<string> {
    return this.db.checkIns.add(checkIn);
  }

  async get(id: string): Promise<CheckIn | undefined> {
    return this.db.checkIns.get(id);
  }

  async getByEndeavour(endeavourId: string): Promise<CheckIn[]> {
    return this.db.checkIns.where({ endeavourId }).sortBy("timestamp");
  }

  async delete(id: string): Promise<void> {
    return this.db.checkIns.delete(id);
  }

  /** Persists a completed check-in and its resulting Snapshot in a single transaction. */
  async record(checkIn: CheckIn, snapshot: Snapshot): Promise<void> {
    await this.db.transaction("rw", this.db.checkIns, this.db.snapshots, async () => {
      await this.db.checkIns.add(checkIn);
      await this.snapshots.create(snapshot);
    });
  }
}

/** App-wide singleton `CheckInRepository` instance. */
export const checkInRepository = new CheckInRepository();
