import { db as defaultDb } from "@/data/db";
import type { AppDatabase } from "@/data/db";
import type { CheckIn } from "@/domain/models/CheckIn";
import type { Snapshot } from "@/domain/models/Snapshot";
import {
  snapshotRepository as defaultSnapshotRepository,
  SnapshotRepository,
} from "./SnapshotRepository";
import { Ok, Err, type Result } from "@/domain/errors/Result";
import { ErrorClassifier } from "@/domain/errors/ErrorClassifier";
import type { AppError } from "@/domain/errors/AppError";

/** CheckInRepository — data access for check-ins and their snapshots. */
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

  async create(checkIn: CheckIn): Promise<Result<string>> {
    try {
      return Ok(await this.db.checkIns.add(checkIn));
    } catch (e) {
      return Err(ErrorClassifier.fromDexieError(e, { entity: "CheckIn" }));
    }
  }

  async get(id: string): Promise<Result<CheckIn | undefined>> {
    try {
      return Ok(await this.db.checkIns.get(id));
    } catch (e) {
      return Err(ErrorClassifier.fromDexieError(e, { entity: "CheckIn", id }));
    }
  }

  async getByEndeavour(endeavourId: string): Promise<Result<CheckIn[]>> {
    try {
      return Ok(await this.db.checkIns.where({ endeavourId }).sortBy("timestamp"));
    } catch (e) {
      return Err(ErrorClassifier.fromDexieError(e, { entity: "CheckIn", endeavourId }));
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      await this.db.checkIns.delete(id);
      return Ok(undefined);
    } catch (e) {
      return Err(ErrorClassifier.fromDexieError(e, { entity: "CheckIn", id }));
    }
  }

  /** Persists a completed check-in and its resulting Snapshot in a single transaction. */
  async record(checkIn: CheckIn, snapshot: Snapshot): Promise<Result<void>> {
    try {
      let snapshotErr: AppError | null = null;
      await this.db.transaction("rw", this.db.checkIns, this.db.snapshots, async () => {
        await this.db.checkIns.add(checkIn);
        const created = await this.snapshots.create(snapshot);
        if (!created.ok) {
          snapshotErr = created.error;
        }
      });
      if (snapshotErr) {
        return Err(snapshotErr);
      }
      return Ok(undefined);
    } catch (e) {
      return Err(ErrorClassifier.fromDexieError(e, { entity: "CheckIn", context: "record" }));
    }
  }
}

/** App-wide singleton `CheckInRepository` instance. */
export const checkInRepository = new CheckInRepository();
