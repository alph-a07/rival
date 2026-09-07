import { describe, it, expect, beforeEach } from "vitest";
import { createAppDatabase, DATABASE_LATEST_VERSION } from "./db";
import type { MicroCheckIn } from "@/data/schema/MicroCheckIn";

describe("AppDatabase schema/version policy", () => {
  let db: ReturnType<typeof createAppDatabase>;
  beforeEach(() => {
    db = createAppDatabase();
  });

  it("reports the latest documented schema version", async () => {
    await db.open();
    expect((db as unknown as { verno: number }).verno).toBe(DATABASE_LATEST_VERSION);
    db.close();
  });

  it("enforces the one-micro-check-in-per-calendar-day invariant", async () => {
    // The unique day index is declared on the microCheckIns table.
    const day = "2024-01-01";
    const mk = (id: string): MicroCheckIn => ({
      id,
      timestamp: `${day}T09:00:00.000Z`,
      day,
      mood: "okay",
    });
    await db.open();
    await db.microCheckIns.add(mk("a"));
    // A second entry for the same day must be rejected by the unique index.
    await expect(db.microCheckIns.add(mk("b"))).rejects.toThrow();
    db.close();
  });
});
