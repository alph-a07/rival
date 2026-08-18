import { beforeEach, expect, test, describe } from "vitest";
import { AppDatabase } from "@/data/db";
import { SnapshotRepository } from "./SnapshotRepository";
import type { Snapshot } from "@/domain/models/Snapshot";

describe("SnapshotRepository", () => {
  let db: AppDatabase;
  let repo: SnapshotRepository;
  let seq: number;

  beforeEach(async () => {
    db = new AppDatabase();
    await Promise.all(db.tables.map((t) => t.clear()));
    repo = new SnapshotRepository(db);
    seq = 0;
  });

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

  describe("getByEndeavour", () => {
    test("returns snapshots oldest-first", async () => {
      await db.snapshots.bulkAdd([
        snapshot("e1", "2026-01-05T00:00:00.000Z"),
        snapshot("e1", "2026-01-03T00:00:00.000Z"),
        snapshot("e2", "2026-01-04T00:00:00.000Z"),
      ]);

      const result = await repo.getByEndeavour("e1");
      expect(result.map((s) => s.timestamp)).toEqual([
        "2026-01-03T00:00:00.000Z",
        "2026-01-05T00:00:00.000Z",
      ]);
    });

    test("returns empty array for an endeavour with no snapshots", async () => {
      expect(await repo.getByEndeavour("nope")).toEqual([]);
    });
  });

  describe("getLatestForEndeavour", () => {
    test("returns the most recent snapshot", async () => {
      await db.snapshots.bulkAdd([
        snapshot("e1", "2026-01-03T00:00:00.000Z"),
        snapshot("e1", "2026-01-07T00:00:00.000Z"),
      ]);

      const latest = await repo.getLatestForEndeavour("e1");
      expect(latest?.timestamp).toBe("2026-01-07T00:00:00.000Z");
    });

    test("returns null when no snapshots exist", async () => {
      expect(await repo.getLatestForEndeavour("e1")).toBeNull();
    });
  });

  describe("getBySegment", () => {
    test("filters snapshots by segment and returns oldest-first", async () => {
      const segA = "2026-01-01T00:00:00.000Z";
      const segB = "2026-02-01T00:00:00.000Z";
      await db.snapshots.bulkAdd([
        snapshot("e1", "2026-01-05T00:00:00.000Z", segA),
        snapshot("e1", "2026-01-03T00:00:00.000Z", segA),
        snapshot("e1", "2026-02-05T00:00:00.000Z", segB),
        snapshot("e2", "2026-01-04T00:00:00.000Z", segA),
      ]);

      const result = await repo.getBySegment("e1", segA);
      expect(result.map((s) => s.timestamp)).toEqual([
        "2026-01-03T00:00:00.000Z",
        "2026-01-05T00:00:00.000Z",
      ]);
    });
  });

  describe("getLatestForSegment", () => {
    test("returns the most recent snapshot in the segment", async () => {
      const segA = "2026-01-01T00:00:00.000Z";
      await db.snapshots.bulkAdd([
        snapshot("e1", "2026-01-03T00:00:00.000Z", segA),
        snapshot("e1", "2026-01-05T00:00:00.000Z", segA),
      ]);

      const latest = await repo.getLatestForSegment("e1", segA);
      expect(latest?.timestamp).toBe("2026-01-05T00:00:00.000Z");
    });

    test("returns null when no snapshots exist in the segment", async () => {
      const latest = await repo.getLatestForSegment("e1", "segA");
      expect(latest).toBeNull();
    });
  });

  describe("getLatestPerEndeavour", () => {
    test("returns the latest snapshot for each endeavour", async () => {
      await db.snapshots.bulkAdd([
        snapshot("e1", "2026-01-03T00:00:00.000Z"),
        snapshot("e1", "2026-01-07T00:00:00.000Z"), // latest for e1
        snapshot("e2", "2026-01-05T00:00:00.000Z"),
      ]);

      const map = await repo.getLatestPerEndeavour();
      expect(map.get("e1")?.timestamp).toBe("2026-01-07T00:00:00.000Z");
      expect(map.get("e2")?.timestamp).toBe("2026-01-05T00:00:00.000Z");
      expect(map.has("e3")).toBe(false);
    });

    test("returns an empty map when no snapshots exist", async () => {
      const map = await repo.getLatestPerEndeavour();
      expect(map.size).toBe(0);
    });
  });
});
