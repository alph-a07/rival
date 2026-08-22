import { beforeEach, expect, test, describe } from "vitest";
import { AppDatabase } from "@/data/db";
import { CheckInRepository } from "./CheckInRepository";
import { SnapshotRepository } from "./SnapshotRepository";
import type { CheckIn } from "@/data/schema/CheckIn";
import type { Snapshot } from "@/data/schema/Snapshot";

describe("CheckInRepository", () => {
  let db: AppDatabase;
  let repo: CheckInRepository;
  let seq: number;

  beforeEach(async () => {
    db = new AppDatabase();
    await Promise.all(db.tables.map((t) => t.clear()));
    // Share the same in-memory db across both repositories so `record`'s
    // delegated snapshot write lands in the correct store.
    repo = new CheckInRepository(db, new SnapshotRepository(db));
    seq = 0;
  });

  function checkIn(endeavourId: string, timestamp: string): CheckIn {
    return {
      id: `checkin-${seq++}`,
      endeavourId,
      timestamp,
      responses: [],
      rawScore: 0,
    };
  }

  function snapshot(
    endeavourId: string,
    timestamp: string,
    segmentStartDate = "2026-01-01T00:00:00.000Z",
  ): Snapshot {
    return {
      id: `snap-${seq++}`,
      endeavourId,
      checkInId: `checkin-${seq}`,
      timestamp,
      domainId: "building",
      segmentStartDate,
      n: 1,
      raw: 50,
      forecast: null,
      residual: null,
      level: 50,
      trend: 0,
      consistencyStatus: "on_track",
    };
  }

  describe("record", () => {
    test("writes the check-in and snapshot together", async () => {
      const c = checkIn("e1", "2026-01-05T00:00:00.000Z");
      const s = snapshot("e1", "2026-01-05T00:00:00.000Z");
      s.checkInId = c.id; // tie the snapshot to this check-in

      await repo.record(c, s);

      const savedCheckIn = await db.checkIns.get(c.id);
      const savedSnapshot = await db.snapshots.get(s.id);
      expect(savedCheckIn).toBeDefined();
      expect(savedSnapshot).toBeDefined();
      expect(savedSnapshot?.checkInId).toBe(c.id);
    });

    test("persists the snapshot via the delegated SnapshotRepository", async () => {
      const c = checkIn("e1", "2026-01-05T00:00:00.000Z");
      const s = snapshot("e1", "2026-01-05T00:00:00.000Z");
      s.checkInId = c.id;

      await repo.record(c, s);
      expect(await db.snapshots.where({ endeavourId: "e1" }).count()).toBe(1);
    });
  });
});
