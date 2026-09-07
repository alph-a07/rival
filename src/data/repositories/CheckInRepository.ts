import { db as defaultDb } from "@/data/db";
import type { AppDatabase } from "@/data/db";
import { checkInToRow, rowToCheckIn } from "@/data/schema/CheckInRow";
import type { CheckIn } from "@/domain/models/CheckIn";
import type { Snapshot } from "@/domain/models/Snapshot";
import type { SnapshotRepository } from "./SnapshotRepository";
import { snapshotRepository as defaultSnapshotRepository } from "./SnapshotRepository";
import { Ok, Err, type Result } from "@/domain/errors/Result";
import { ErrorClassifier } from "@/domain/errors/ErrorClassifier";
import type { AppError } from "@/domain/errors/AppError";
import { crossTabBus } from "@/core/runtime/crossTab";

/**
 * Data-access surface for check-ins (+ their snapshot writes). Public API
 * speaks domain values; the boundary maps to/from their persisted row DTOs.
 */
export interface CheckInRepository {
  create(checkIn: CheckIn): Promise<Result<string>>;
  get(id: string): Promise<Result<CheckIn | undefined>>;
  getByEndeavour(endeavourId: string): Promise<Result<CheckIn[]>>;
  delete(id: string): Promise<Result<void>>;
  record(checkIn: CheckIn, snapshot: Snapshot): Promise<Result<void>>;
}

/** Creates a check-in repository against a Dexie database. */
export function createCheckInRepository(
  db: AppDatabase = defaultDb,
  snapshots: SnapshotRepository = defaultSnapshotRepository,
): CheckInRepository {
  return {
    async create(checkIn) {
      try {
        return Ok(await db.checkIns.add(checkInToRow(checkIn)));
      } catch (e) {
        return Err(ErrorClassifier.fromDexieError(e, { entity: "CheckIn" }));
      }
    },
    async get(id) {
      try {
        const row = await db.checkIns.get(id);
        return Ok(row ? rowToCheckIn(row) : undefined);
      } catch (e) {
        return Err(ErrorClassifier.fromDexieError(e, { entity: "CheckIn", id }));
      }
    },
    async getByEndeavour(endeavourId) {
      try {
        const rows = await db.checkIns.where({ endeavourId }).sortBy("timestamp");
        return Ok(rows.map(rowToCheckIn));
      } catch (e) {
        return Err(ErrorClassifier.fromDexieError(e, { entity: "CheckIn", endeavourId }));
      }
    },
    async delete(id) {
      try {
        await db.checkIns.delete(id);
        return Ok(undefined);
      } catch (e) {
        return Err(ErrorClassifier.fromDexieError(e, { entity: "CheckIn", id }));
      }
    },
    async record(checkIn, snapshot) {
      try {
        let snapshotErr: AppError | null = null;
        await db.transaction("rw", db.checkIns, db.snapshots, async () => {
          await db.checkIns.add(checkInToRow(checkIn));
          const created = await snapshots.create(snapshot);
          if (!created.ok) {
            snapshotErr = created.error;
          }
        });
        if (snapshotErr) {
          return Err(snapshotErr);
        }
        crossTabBus.post("app:data-changed", { changedAt: Date.now() });
        return Ok(undefined);
      } catch (e) {
        return Err(ErrorClassifier.fromDexieError(e, { entity: "CheckIn", context: "record" }));
      }
    },
  };
}

/** App-wide singleton instance backing the hooks/UI path. */
export const checkInRepository: CheckInRepository = createCheckInRepository();
