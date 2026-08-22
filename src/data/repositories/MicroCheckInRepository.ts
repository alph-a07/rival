import { db as defaultDb } from "@/data/db";
import type { AppDatabase } from "@/data/db";
import type { MicroCheckIn, MicroMood } from "@/data/schema/MicroCheckIn";
import { Logger } from "@/core/logging/logger";

export class MicroCheckInRepository {
  private readonly db: AppDatabase;

  constructor(db: AppDatabase = defaultDb) {
    this.db = db;
  }

  /** Logs a mood for today. Once per calendar day. */
  async create(mood: MicroMood, now: string = new Date().toISOString()): Promise<string> {
    const today = new Date(now).toISOString().slice(0, 10);
    const existing = await this.getForDay(today);
    if (existing) {
      Logger.storage.warn("MicroCheckIn.create — already logged today, rejected", {
        today,
        existingId: existing.id,
      });
      throw new Error(`Micro check-in already logged today (${today})`);
    }
    const record: MicroCheckIn = { id: nextMicroId(), timestamp: now, mood };
    const id = await this.db.microCheckIns.add(record);
    Logger.storage.info("MicroCheckIn.create — saved mood", { id, day: today, mood });
    return id;
  }

  /** The micro check-in for the given calendar day (yyyy-mm-dd), if any. */
  async getForDay(day: string): Promise<MicroCheckIn | undefined> {
    const rows = await this.db.microCheckIns.toArray();
    return rows.find((r) => r.timestamp.slice(0, 10) === day);
  }

  /** The most recent mood log entries, newest-first, capped at `limit`. */
  async getRecent(limit = 30): Promise<MicroCheckIn[]> {
    const rows = await this.db.microCheckIns.toArray();
    return rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, limit);
  }

  /** Whether a mood was already logged for the current calendar day. */
  async loggedToday(now: string = new Date().toISOString()): Promise<boolean> {
    return (await this.getForDay(new Date(now).toISOString().slice(0, 10))) !== undefined;
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
