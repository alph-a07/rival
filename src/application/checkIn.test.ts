import { beforeEach, describe, expect, test } from "vitest";
import { AppDatabase } from "@/data/db";
import {
  createCheckInRepository,
  type CheckInRepository,
} from "@/data/repositories/CheckInRepository";
import { createSnapshotRepository } from "@/data/repositories/SnapshotRepository";
import { createPendingSyncStore } from "@/sync/pendingSync";
import { createCheckInCommands, type NewCheckInInput } from "./checkIn";
import { unwrap } from "@/domain/errors/Result";
import { ErrorClassifier } from "@/domain/errors/ErrorClassifier";
import type { DomainSegment } from "@/domain/models/Endeavour";
import type { Snapshot } from "@/domain/models/Snapshot";

function segmentFixture(): DomainSegment {
  return {
    domainId: "language",
    startDate: "2024-01-01T00:00:00.000Z",
    endDate: null,
    attachedGis: {},
  } as DomainSegment;
}

describe("createCheckInCommands.recordCompletedCheckIn", () => {
  let db: AppDatabase;
  let repo: CheckInRepository;
  let latch: ReturnType<typeof createPendingSyncStore>;
  let env: {
    repository: CheckInRepository;
    markLocalDataChanged: () => Promise<unknown>;
    makeId?: () => string;
    makeTimestamp?: () => string;
  };
  let latchCalls: number;
  let idCounter: number;

  const command = () => createCheckInCommands(env);
  const input = (over: Partial<NewCheckInInput> = {}): NewCheckInInput => ({
    endeavourId: "endeavour-1",
    segment: segmentFixture(),
    activeGis: new Map(),
    priorSnapshot: null,
    recentResiduals: [],
    responses: [],
    occurredAt: "2024-01-02T00:00:00.000Z",
    ...over,
  });

  beforeEach(async () => {
    db = new AppDatabase();
    await Promise.all(db.tables.map((t) => t.clear()));
    repo = createCheckInRepository(db, createSnapshotRepository(db));
    latch = createPendingSyncStore(db);
    latchCalls = 0;
    idCounter = 0;
    env = {
      repository: repo,
      markLocalDataChanged: () => {
        latchCalls += 1;
        return latch.markDirty();
      },
      makeId: () => `checkin-${++idCounter}`,
    };
  });

  test("records the check-in + snapshot and marks the sync latch on success", async () => {
    const result = await command().recordCompletedCheckIn(input());
    expect(result.ok).toBe(true);
    const written = result.ok ? result.value : null;
    expect(written?.endeavourId).toBe("endeavour-1");
    expect(latchCalls).toBe(1);
    // snapshot + check-in rows exist
    expect(await db.checkIns.count()).toBe(1);
    expect(await db.snapshots.count()).toBe(1);
    // the durable latch is pending
    expect(unwrap(await latch.snapshot()).pending).toBe(true);
  });

  test("propagates a repo failure as Err (no latch mark, no rows)", async () => {
    // Force the repo write to fail by closing the underlying DB path is hard;
    // instead inject a checkIns whose record rejects classification path.
    // Simulate by using a fresh repo bound to a cleared-then-invalid id? Easiest:
    // make record throw by giving an invalid snapshot reference (id collision is
    // rejected on the second write). Use a fake repo override instead:
    env.repository = {
      record: async () => ({
        ok: false as const,
        error: ErrorClassifier.validation("simulated failure"),
      }),
    } as unknown as CheckInRepository;
    const result = await command().recordCompletedCheckIn(input());
    expect(result.ok).toBe(false);
    expect(latchCalls).toBe(0);
  });

  test("a failing latch write does not fail the check-in", async () => {
    env.markLocalDataChanged = async () => {
      throw new Error("latch storage down");
    };
    const result = await command().recordCompletedCheckIn(input());
    expect(result.ok).toBe(true);
    expect(await db.checkIns.count()).toBe(1);
  });

  test("derives the expected snapshot values for a first check-in", async () => {
    const result = await command().recordCompletedCheckIn(input());
    expect(result.ok).toBe(true);
    const s = (result as { ok: true; value: Snapshot }).value;
    expect(s.n).toBe(1);
    expect(s.segmentStartDate).toBe("2024-01-01T00:00:00.000Z");
    // deterministic id from the injected factory
    expect(s.id).toBe("checkin-1");
  });

  test("uses an injectable id", async () => {
    const result = await command().recordCompletedCheckIn(input({ id: "fixed-checkin" }));
    expect(result.ok).toBe(true);
    expect((result as { ok: true; value: Snapshot }).value.id).toBe("fixed-checkin");
  });
});
