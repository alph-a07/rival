import { beforeEach, describe, expect, test } from "vitest";
import { AppDatabase } from "@/data/db";
import {
  createEndeavourRepository,
  type EndeavourRepository,
} from "@/data/repositories/EndeavourRepository";
import { createSnapshotRepository } from "@/data/repositories/SnapshotRepository";
import { createPendingSyncStore } from "@/sync/pendingSync";
import { createEndeavourCommands, type NewEndeavourData } from "./endeavour";
import { unwrap } from "@/domain/errors/Result";

describe("createEndeavourCommands", () => {
  let db: AppDatabase;
  let repo: EndeavourRepository;
  let latch: ReturnType<typeof createPendingSyncStore>;
  let latchCalls: number;
  let idSeq: number;
  let commands: ReturnType<typeof createEndeavourCommands>;

  beforeEach(async () => {
    db = new AppDatabase();
    await Promise.all(db.tables.map((t) => t.clear()));
    repo = createEndeavourRepository(db, createSnapshotRepository(db));
    latch = createPendingSyncStore(db);
    latchCalls = 0;
    idSeq = 0;
    commands = createEndeavourCommands({
      repository: repo,
      markLocalDataChanged: () => {
        latchCalls += 1;
        return latch.markDirty();
      },
      makeId: () => `endeavour-${++idSeq}`,
      makeTimestamp: () => "2024-01-01T00:00:00.000Z",
    });
  });

  const segment = (over: Partial<NewEndeavourData> = {}): NewEndeavourData => ({
    name: "Learn Carpentry",
    domainId: "building",
    attachedGis: {},
    ...over,
  });

  const seedEndeavour = async (): Promise<string> => {
    const r = await commands.create(segment());
    return r.ok ? ((r as { value: string }).value as string) : "err";
  };

  test("creates an endeavour and marks the sync latch", async () => {
    const result = await commands.create(segment());
    expect(result.ok).toBe(true);
    expect(latchCalls).toBe(1);
    expect(await db.endeavours.count()).toBe(1);
    expect(unwrap(await latch.snapshot()).pending).toBe(true);
  });

  test("rejects a blank name at the boundary", async () => {
    const result = await commands.create(segment({ name: "   " }));
    expect(result.ok).toBe(false);
    expect(await db.endeavours.count()).toBe(0);
    expect(latchCalls).toBe(0);
  });

  test("saveEdits updates and marks the latch", async () => {
    const id = await seedEndeavour();
    expect(id).not.toBe("err");
    await commands.saveEdits(id, { name: "Learn Italian" });
    expect(latchCalls).toBe(2);
    const row = await db.endeavours.get(id);
    expect(row?.name).toBe("Learn Italian");
    expect(unwrap(await latch.snapshot()).pending).toBe(true);
  });

  test("close + reopen mark the latch each time", async () => {
    const id = await seedEndeavour();
    await commands.close(id);
    expect(latchCalls).toBe(2);
    await commands.reopen(id);
    expect(latchCalls).toBe(3);
    expect(await db.endeavours.count()).toBe(1);
  });

  test("a repo failure propagates Err and does not mark the latch", async () => {
    // blank name is caught at boundary; for a repo-level failure use an id that
    // does not exist (validation branch) — category unknown-domain path.
    const result = await commands.close("does-not-exist");
    expect(result.ok).toBe(false);
    expect(latchCalls).toBe(0);
  });
});
