import { db as defaultDb } from "@/data/db";
import type { AppDatabase } from "@/data/db";
import type { MicroCheckIn } from "@/data/schema/MicroCheckIn";
import type { MicroMood } from "@/domain/models/MicroMood";
import { Logger } from "@/core/logging/logger";
import { Ok, Err, type Result } from "@/domain/errors/Result";
import { ErrorClassifier } from "@/domain/errors/ErrorClassifier";
import { crossTabBus } from "@/core/runtime/crossTab";

/** Data-access surface for micro check-in rows. A handle, not a class. */
export interface MicroCheckInRepository {
  create(mood: MicroMood, now?: string): Promise<Result<string>>;
  getForDay(day: string): Promise<Result<MicroCheckIn | undefined>>;
  getRecent(limit?: number): Promise<Result<MicroCheckIn[]>>;
  loggedToday(now?: string): Promise<Result<boolean>>;
}

/** Creates a micro check-in repository against a Dexie database. */
export function createMicroCheckInRepository(db: AppDatabase = defaultDb): MicroCheckInRepository {
  const repository: MicroCheckInRepository = {
    /** Logs a mood for today. Once per calendar day. */
    async create(mood, now = new Date().toISOString()) {
      const today = new Date(now).toISOString().slice(0, 10);
      const record: MicroCheckIn = { id: nextMicroId(), day: today, timestamp: now, mood };
      try {
        const id = await db.microCheckIns.add(record);
        crossTabBus.post("app:data-changed", { changedAt: Date.now() });
        Logger.storage.info("MicroCheckIn.create — saved mood", { id, day: today, mood });
        return Ok(id);
      } catch (e) {
        if ((e as { name?: string }).name === "ConstraintError") {
          Logger.storage.warn("MicroCheckIn.create — already logged today, rejected", { today });
          return Err(
            ErrorClassifier.validation(
              "You've already logged your mood today. Come back tomorrow.",
            ),
          );
        }
        return Err(ErrorClassifier.fromDexieError(e, { entity: "MicroCheckIn" }));
      }
    },

    /** The micro check-in for the given calendar day (yyyy-mm-dd), if any. */
    async getForDay(day) {
      try {
        return Ok(await db.microCheckIns.where("day").equals(day).first());
      } catch (e) {
        return Err(ErrorClassifier.fromDexieError(e, { entity: "MicroCheckIn", day }));
      }
    },

    /** The most recent mood log entries, newest-first, capped at `limit`. */
    async getRecent(limit = 30) {
      try {
        const rows = await db.microCheckIns.toArray();
        return Ok(rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, limit));
      } catch (e) {
        return Err(ErrorClassifier.fromDexieError(e, { entity: "MicroCheckIn", op: "getRecent" }));
      }
    },

    /** Whether a mood was already logged for the current calendar day. */
    async loggedToday(now = new Date().toISOString()) {
      const result = await repository.getForDay(new Date(now).toISOString().slice(0, 10));
      return result.ok ? Ok(result.value !== undefined) : result;
    },
  };
  return repository;
}

function nextMicroId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `micro-${crypto.randomUUID()}`;
  }
  return `micro-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** App-wide singleton instance backing the hooks/UI path. */
export const microCheckInRepository: MicroCheckInRepository = createMicroCheckInRepository();
