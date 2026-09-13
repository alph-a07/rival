import { beforeEach, describe, expect, test } from "vitest";
import { AppDatabase } from "@/data/db";
import { unwrap } from "@/domain/errors/Result";
import { PENDING_SYNC_KEY, createPendingSyncStore, type SyncDiagnostics } from "./pendingSync";

describe("pendingSync", () => {
  let db: AppDatabase;
  let store: ReturnType<typeof createPendingSyncStore>;

  beforeEach(async () => {
    db = new AppDatabase();
    await Promise.all(db.tables.map((t) => t.clear()));
    store = createPendingSyncStore(db);
  });

  const snap = async (): Promise<SyncDiagnostics> => unwrap(await store.snapshot());

  test("starts idle with no prior state", async () => {
    expect(await snap()).toMatchObject({
      pending: false,
      revision: 0,
      attempts: 0,
      syncedAt: null,
      lastErrorKind: null,
      lastErrorAt: null,
    });
  });

  test("markDirty raises a coalescing pending latch and bumps revision monotonically", async () => {
    await store.markDirty("2024-01-01T00:00:00.000Z");
    let s = await snap();
    expect(s.pending).toBe(true);
    expect(s.pendingSince).toBe("2024-01-01T00:00:00.000Z");
    expect(s.revision).toBe(1);

    await store.markDirty("2024-01-01T00:10:00.000Z");
    s = await snap();
    expect(s.pending).toBe(true);
    // Coalescing: pendingSince stays at the first raise, revision keeps rising.
    expect(s.pendingSince).toBe("2024-01-01T00:00:00.000Z");
    expect(s.revision).toBe(2);
  });

  test("records attempts and last-attempt time", async () => {
    await store.markDirty();
    await store.recordSyncStarted("2024-01-02T00:00:00.000Z");
    const s = await snap();
    expect(s.attempts).toBe(1);
    expect(s.lastAttemptAt).toBe("2024-01-02T00:00:00.000Z");
    expect(s.pending).toBe(true);
  });

  test("recordSyncSucceeded clears the latch and records syncedAt", async () => {
    await store.markDirty("2024-01-01T00:00:00.000Z");
    await store.recordSyncStarted();
    await store.recordSyncSucceeded("2024-01-01T01:00:00.000Z");
    const s = await snap();
    expect(s.pending).toBe(false);
    expect(s.syncedAt).toBe("2024-01-01T01:00:00.000Z");
    expect(s.pendingSince).toBeNull();
    expect(s.attempts).toBe(0);
    expect(s.lastErrorKind).toBeNull();
  });

  test("recordSyncFailed keeps pending and records error kind + time, preserving attempts", async () => {
    await store.markDirty();
    await store.recordSyncStarted();
    await store.recordSyncFailed("auth-denied", "2024-01-01T02:00:00.000Z");
    const s = await snap();
    expect(s.pending).toBe(true);
    expect(s.lastErrorKind).toBe("auth-denied");
    expect(s.lastErrorAt).toBe("2024-01-01T02:00:00.000Z");
    expect(s.attempts).toBe(1);
  });

  test("recordSyncSucceeded after a failure clears lastErrorKind", async () => {
    await store.markDirty();
    await store.recordSyncFailed("sync-conflict");
    await store.recordSyncStarted();
    await store.recordSyncSucceeded();
    const s = await snap();
    expect(s.pending).toBe(false);
    expect(s.lastErrorKind).toBeNull();
    expect(s.syncedAt).not.toBeNull();
  });

  test("clear drops the latch but keeps the revision monotonic", async () => {
    await store.markDirty();
    await store.clear();
    const s = await snap();
    expect(s.pending).toBe(false);
    expect(s.revision).toBe(1);
  });

  test("survives across store instances (durable): a fresh store sees prior state", async () => {
    await store.markDirty();
    const fresh = createPendingSyncStore(db);
    expect((await fresh.snapshot()).ok).toBe(true);
    expect(unwrap(await fresh.snapshot()).pending).toBe(true);
  });

  test("tolerates a corrupt stored row, falling back to idle", async () => {
    await db.settings.put({ key: PENDING_SYNC_KEY, value: "not-an-object" });
    expect(await snap()).toEqual({
      pending: false,
      revision: 0,
      pendingSince: null,
      attempts: 0,
      lastAttemptAt: null,
      syncedAt: null,
      lastErrorKind: null,
      lastErrorAt: null,
    } satisfies SyncDiagnostics);
  });

  test("empty results on a read are Ok not Err", async () => {
    expect((await store.snapshot()).ok).toBe(true);
  });
});
