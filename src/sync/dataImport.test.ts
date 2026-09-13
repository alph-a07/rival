import { beforeEach, describe, expect, test } from "vitest";
import { AppDatabase } from "@/data/db";
import { importAllData, isDataExport } from "./dataImport";
import { unwrap } from "@/domain/errors/Result";
import type { DataExport } from "./dataExport";

describe("isDataExport", () => {
  test("accepts a well-formed rival export", () => {
    expect(isDataExport(validExport())).toBe(true);
  });

  test("rejects a check-in whose endeavour is missing", () => {
    const p = validExport();
    p.checkIns = [
      {
        id: "cX",
        endeavourId: "missing",
        timestamp: "2026-01-02T00:00:00.000Z",
        responses: [],
        rawScore: 50,
      },
    ];
    expect(isDataExport(p)).toBe(false);
  });

  test("rejects a snapshot hung off a check-in from a different endeavour", () => {
    const p = validExport();
    // snapshot.endeavourId is e1 but its check-in c1 now belongs to a second
    // (unknown-to-the-snapshot) endeavour — mis-parented reference.
    p.checkIns = [
      {
        id: "c1",
        endeavourId: "other",
        timestamp: "2026-01-02T00:00:00.000Z",
        responses: [],
        rawScore: 50,
      },
    ];
    expect(isDataExport(p)).toBe(false);
  });

  test("rejects an endeavour history segment in an unknown domain", () => {
    const p = validExport();
    p.endeavours = [
      {
        id: "e1",
        name: "x",
        domainHistory: [
          {
            domainId: "not-a-domain",
            startDate: "2026-01-01T00:00:00.000Z",
            endDate: null,
            attachedGis: {},
          },
        ],
      },
    ];
    p.checkIns = [];
    p.snapshots = [];
    p.microCheckIns = [];
    expect(isDataExport(p)).toBe(false);
  });

  test("accepts version-one backups without a day key", () => {
    const payload = validExport();
    payload.version = 1;
    delete (payload.microCheckIns[0] as Partial<(typeof payload.microCheckIns)[number]>).day;
    expect(isDataExport(payload)).toBe(true);
  });

  test("rejects non-objects and foreign payloads", () => {
    expect(isDataExport(null)).toBe(false);
    expect(isDataExport("rival")).toBe(false);
    expect(isDataExport({ ...validExport(), app: "other" })).toBe(false);
  });

  test("rejects payloads missing tables", () => {
    const { app, version, exportedAt, ...rest } = validExport();
    void app;
    void version;
    void exportedAt;
    expect(isDataExport(rest)).toBe(false);
  });
});

describe("importAllData — replace", () => {
  let db: AppDatabase;

  beforeEach(async () => {
    db = new AppDatabase();
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  test("writes every table from the backup", async () => {
    const payload = validExport();
    const summary = unwrap(await importAllData(payload, "replace", db));
    expect(summary.strategy).toBe("replace");
    expect(summary.rows.endeavours).toBe(1);
    expect(await db.endeavours.count()).toBe(1);
    expect(await db.microCheckIns.count()).toBe(1);
  });

  test("replaces existing local rows", async () => {
    await db.endeavours.put({
      id: "e1",
      name: "local-only",
      domainHistory: [],
    });
    await importAllData(validExport(), "replace", db);
    const rows = await db.endeavours.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("from backup");
  });

  test("returns an error on an invalid payload", async () => {
    const result = await importAllData({ nope: true }, "replace", db);
    expect(result.ok).toBe(false);
  });
});

describe("importAllData — merge", () => {
  let db: AppDatabase;

  beforeEach(async () => {
    db = new AppDatabase();
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  test("keeps local-only rows and adds backup rows", async () => {
    await db.endeavours.put({
      id: "local-id",
      name: "local",
      domainHistory: [],
    });
    const payload = validExport({ endeavourId: "backup-id" });
    await importAllData(payload, "merge", db);
    const rows = await db.endeavours.toArray();
    expect(rows).toHaveLength(2);
  });

  test("overwrites rows that collide on primary key", async () => {
    await db.endeavours.put({
      id: "e1",
      name: "old",
      domainHistory: [],
    });
    const payload = validExport({ endeavourId: "e1" }); // same id as local
    await importAllData(payload, "merge", db);
    const rows = await db.endeavours.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("from backup");
  });
});

function validExport(overrides: { endeavourId?: string } = {}): DataExport {
  const id = overrides.endeavourId ?? "e1";
  return {
    exportedAt: "2026-01-02T00:00:00.000Z",
    app: "rival",
    version: 1,
    endeavours: [
      {
        id,
        name: "from backup",
        domainHistory: [],
      },
    ],
    checkIns: [
      {
        id: "c1",
        endeavourId: id,
        timestamp: "2026-01-02T00:00:00.000Z",
        responses: [],
        rawScore: 50,
      },
    ],
    snapshots: [
      {
        id: "s1",
        endeavourId: id,
        checkInId: "c1",
        timestamp: "2026-01-02T00:00:00.000Z",
        domainId: "building",
        segmentStartDate: "2026-01-01T00:00:00.000Z",
        n: 1,
        raw: 50,
        forecast: null,
        residual: null,
        level: 50,
        trend: 0,
        consistencyStatus: "on_track",
      },
    ],
    microCheckIns: [
      {
        id: "m1",
        day: "2026-01-02",
        timestamp: "2026-01-02T00:00:00.000Z",
        mood: "good",
      },
    ],
    settings: [],
  };
}
