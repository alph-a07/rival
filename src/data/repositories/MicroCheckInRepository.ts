import { db as defaultDb } from "@/data/db";
import type { AppDatabase } from "@/data/db";
import type { MicroCheckIn, MicroMood } from "@/data/schema/MicroCheckIn";
import { Logger } from "@/core/logging/logger";
import { Ok, Err, type Result } from "@/domain/errors/Result";
import { ErrorClassifier } from "@/domain/errors/ErrorClassifier";

export class MicroCheckInRepository {
  private readonly db: AppDatabase;

  constructor(db: AppDatabase = defaultDb) {
    this.db = db;
  }

  /** Logs a mood for today. Once per calendar day. */
  async create(mood: MicroMood, now: string = new Date().toISOString()): Promise<Result<string>> {
    const today = new Date(now).toISOString().slice(0, 10);
    const existing = await this.getForDay(today);
    if (existing.ok && existing.value) {
      Logger.storage.warn("MicroCheckIn.create — already logged today, rejected", {
        today,
        existingId: existing.value.id,
      });
      return Err(
        ErrorClassifier.validation("You've already logged your mood today. Come back tomorrow."),
      );
    }
    if (!existing.ok) {
      return existing;
    }
    const record: MicroCheckIn = { id: nextMicroId(), timestamp: now, mood };
    try {
      const id = await this.db.microCheckIns.add(record);
      Logger.storage.info("MicroCheckIn.create — saved mood", { id, day: today, mood });
      return Ok(id);
    } catch (e) {
      return Err(ErrorClassifier.fromDexieError(e, { entity: "MicroCheckIn" }));
    }
  }

  /** The micro check-in for the given calendar day (yyyy-mm-dd), if any. */
  async getForDay(day: string): Promise<Result<MicroCheckIn | undefined>> {
    try {
      const rows = await this.db.microCheckIns.toArray();
      return Ok(rows.find((r) => r.timestamp.slice(0, 10) === day));
    } catch (e) {
      return Err(ErrorClassifier.fromDexieError(e, { entity: "MicroCheckIn", day }));
    }
  }

  /** The most recent mood log entries, newest-first, capped at `limit`. */
  async getRecent(limit = 30): Promise<Result<MicroCheckIn[]>> {
    try {
      const rows = await this.db.microCheckIns.toArray();
      return Ok(rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, limit));
    } catch (e) {
      return Err(ErrorClassifier.fromDexieError(e, { entity: "MicroCheckIn", op: "getRecent" }));
    }
  }

  /** Whether a mood was already logged for the current calendar day. */
  async loggedToday(now: string = new Date().toISOString()): Promise<Result<boolean>> {
    const result = await this.getForDay(new Date(now).toISOString().slice(0, 10));
    return result.ok ? Ok(result.value !== undefined) : result;
  }
}

/** Produces a collision-free id even for rapid back-to-back creates. */
function nextMicroId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `micro-${crypto.randomUUID()}`;
  }
  return `micro-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** App-wide singleton instance backing the hooks/UI path. */
export const microCheckInRepository = new MicroCheckInRepository();
