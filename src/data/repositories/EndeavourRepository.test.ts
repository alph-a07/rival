import { beforeEach, expect, test, describe } from "vitest";
import { AppDatabase } from "@/data/db";
import { EndeavourRepository } from "./EndeavourRepository";
import { SnapshotRepository } from "./SnapshotRepository";
import { activeSegment, type Endeavour } from "@/data/schema/Endeavour";
import type { Snapshot } from "@/data/schema/Snapshot";

describe("EndeavourRepository", () => {
  let db: AppDatabase;
  let repo: EndeavourRepository;
  let seq: number;

  beforeEach(async () => {
    db = new AppDatabase();
    await Promise.all(db.tables.map((t) => t.clear()));
    repo = new EndeavourRepository(db, new SnapshotRepository(db));
    seq = 0;
  });

  function endeavour(domainId = "building"): Endeavour {
    return {
      id: `endeavour-${seq++}`,
      name: `Endeavour ${seq}`,
      domainHistory: [
        {
          domainId,
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: null,
          attachedGis: {},
        },
      ],
    };
  }

  function snapshot(endeavourId: string, timestamp: string, domainId = "building"): Snapshot {
    return {
      id: `snap-${seq++}`,
      endeavourId,
      checkInId: `checkin-${seq}`,
      timestamp,
      domainId,
      segmentStartDate: "2026-01-01T00:00:00.000Z",
      n: 1,
      raw: 50,
      forecast: null,
      residual: null,
      level: 50,
      trend: 0,
      consistencyStatus: "on_track",
    };
  }

  describe("getAllWithLatestSnapshot", () => {
    test("returns endeavours with no snapshot when none exist", async () => {
      await db.endeavours.bulkAdd([endeavour(), endeavour()]);

      const result = await repo.getAllWithLatestSnapshot();
      expect(result).toHaveLength(2);
      for (const row of result) {
        expect(row.latestSnapshot).toBeNull();
      }
    });

    test("attaches the most recent snapshot per endeavour", async () => {
      const e1 = endeavour();
      const e2 = endeavour();
      await db.endeavours.bulkAdd([e1, e2]);
      // e1 has two snapshots; only the latest should be attached.
      await db.snapshots.bulkAdd([
        snapshot(e1.id, "2026-01-02T00:00:00.000Z"),
        snapshot(e1.id, "2026-01-05T00:00:00.000Z"),
        snapshot(e2.id, "2026-01-03T00:00:00.000Z"),
      ]);

      const result = await repo.getAllWithLatestSnapshot();
      const row1 = result.find((r) => r.id === e1.id)!;
      const row2 = result.find((r) => r.id === e2.id)!;

      expect(row1.latestSnapshot?.timestamp).toBe("2026-01-05T00:00:00.000Z");
      expect(row2.latestSnapshot?.timestamp).toBe("2026-01-03T00:00:00.000Z");
    });
  });

  describe("getByDomain", () => {
    test("returns only endeavours whose active segment is in the domain", async () => {
      const building = endeavour("building");
      const learning = endeavour("structured_learning");
      await db.endeavours.bulkAdd([building, learning]);

      const result = await repo.getByDomain("building");
      expect(result.map((e) => e.id)).toEqual([building.id]);
    });
  });

  describe("switchDomain", () => {
    test("closes the current segment and opens a new one", async () => {
      const e = endeavour("building");
      await db.endeavours.add(e);

      await repo.switchDomain(e.id, "habit");

      const updated = await db.endeavours.get(e.id);
      expect(updated).toBeDefined();
      expect(updated!.domainHistory).toHaveLength(2);
      const closed = updated!.domainHistory[0];
      const opened = updated!.domainHistory[1];
      expect(closed.domainId).toBe("building");
      expect(closed.endDate).not.toBeNull();
      expect(opened.domainId).toBe("habit");
      expect(opened.endDate).toBeNull();
    });

    test("does not touch past snapshots", async () => {
      const e = endeavour("building");
      await db.endeavours.add(e);
      await db.snapshots.bulkAdd([snapshot(e.id, "2026-01-02T00:00:00.000Z")]);

      await repo.switchDomain(e.id, "habit");

      const snapshots = await db.snapshots.where({ endeavourId: e.id }).toArray();
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].domainId).toBe("building"); // archived, not rewritten
    });

    test("throws when the endeavour does not exist", async () => {
      await expect(repo.switchDomain("nope", "habit")).rejects.toThrow();
    });
  });

  describe("close", () => {
    test("ends the active segment without opening a new one", async () => {
      const e = endeavour("building");
      await db.endeavours.add(e);

      await repo.close(e.id);

      const updated = await db.endeavours.get(e.id);
      expect(updated!.domainHistory).toHaveLength(1);
      expect(updated!.domainHistory[0].endDate).not.toBeNull();
      expect(activeSegment(updated!)).toBeUndefined();
    });

    test("throws when already closed", async () => {
      const e = endeavour("building");
      await db.endeavours.add(e);
      await repo.close(e.id);
      await expect(repo.close(e.id)).rejects.toThrow(/no active segment/);
    });

    test("throws when the endeavour does not exist", async () => {
      await expect(repo.close("nope")).rejects.toThrow();
    });
  });

  describe("reopen", () => {
    test("starts a new active segment in the last-lived domain", async () => {
      const e = endeavour("habit");
      await db.endeavours.add(e);
      await repo.close(e.id);

      await repo.reopen(e.id);

      const updated = await db.endeavours.get(e.id);
      expect(updated!.domainHistory).toHaveLength(2);
      const reopened = updated!.domainHistory.at(-1)!;
      expect(reopened.domainId).toBe("habit");
      expect(reopened.endDate).toBeNull();
      expect(activeSegment(updated!)).toBe(reopened);
    });

    test("throws when already active", async () => {
      const e = endeavour("building");
      await db.endeavours.add(e);
      await expect(repo.reopen(e.id)).rejects.toThrow(/already active/);
    });
  });
});
