import { beforeEach, describe, expect, test } from "vitest";
import { AppDatabase } from "@/data/db";
import { unwrap } from "@/domain/errors/Result";
import type { RuntimeChannelEventMap } from "@/core/runtime/crossTab";
import { createPendingSyncStore, type SyncDiagnostics } from "./pendingSync";
import { installBackgroundSync } from "./backgroundSync";

type Changed = RuntimeChannelEventMap["app:data-changed"];

interface FakeBus {
  fire(payload: Changed): void;
  setListener(fn: ((p: Changed) => void) | null): void;
}

function makeBus(): FakeBus {
  let listener: ((p: Changed) => void) | null = null;
  return {
    fire(payload) {
      listener?.(payload);
    },
    setListener(fn) {
      listener = fn;
    },
  };
}

describe("installBackgroundSync", () => {
  let db: AppDatabase;
  let store: ReturnType<typeof createPendingSyncStore>;
  let bus: FakeBus;
  let online: boolean;
  let enabled: boolean;
  let flushCalls: number;

  let flushGate!: { current: Promise<void>; open: () => void };
  let releaseGate!: () => void;

  const env = {
    isOnline: () => online,
    isDriveEnabled: () => enabled,
    pushBackup: () => {
      flushCalls += 1;
      return flushGate.current;
    },
  };

  const readPending = async (): Promise<SyncDiagnostics> => unwrap(await store.snapshot());

  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  async function until(cond: () => boolean | Promise<boolean>, timeoutMs = 400): Promise<void> {
    const start = Date.now();
    while (!(await cond())) {
      if (Date.now() - start > timeoutMs) {
        throw new Error("condition not met in time");
      }
      await tick();
    }
  }

  beforeEach(async () => {
    db = new AppDatabase();
    await Promise.all(db.tables.map((t) => t.clear()));
    store = createPendingSyncStore(db);
    bus = makeBus();
    online = true;
    enabled = true;
    flushCalls = 0;
    flushGate = {
      current: new Promise<void>((resolve) => (releaseGate = resolve)),
      open: () => releaseGate(),
    };
  });

  const subscribe = (fn: (p: Changed) => void) => {
    bus.setListener(fn);
    return () => bus.setListener(null);
  };

  const install = () => installBackgroundSync(subscribe, store, env);

  test("adopts a peer change offline: latch raises, no flush", async () => {
    const teardown = install();
    online = false;
    bus.fire({ changedAt: 1 });
    await until(async () => (await readPending()).pending);
    expect(flushCalls).toBe(0);
    teardown();
  });

  test("marks pending and flushes once when online + Drive enabled", async () => {
    const teardown = install();
    bus.fire({ changedAt: 1 });
    await until(() => flushCalls === 1);
    expect(await readPending()).toMatchObject({ pending: true });
    flushGate.open();
    await tick();
    teardown();
  });

  test("does not flush while Drive is off", async () => {
    const teardown = install();
    enabled = false;
    bus.fire({ changedAt: 1 });
    await tick();
    await tick();
    expect(flushCalls).toBe(0);
    expect(await readPending()).toMatchObject({ pending: true });
    teardown();
  });

  test("teardown removes the subscription", async () => {
    const teardown = install();
    teardown();
    bus.fire({ changedAt: 1 });
    await tick();
    await tick();
    expect(flushCalls).toBe(0);
  });

  test("concurrent peer events collapse to a single in-flight flush", async () => {
    const teardown = install();
    bus.fire({ changedAt: 1 });
    await until(() => flushCalls === 1);
    bus.fire({ changedAt: 2 });
    await tick();
    await tick();
    // still gated: unchanged even after a second arrival
    expect(flushCalls).toBe(1);
    flushGate.open();
    await tick();
    teardown();
  });

  test("a peer event during an in-flight flush re-drains after it settles", async () => {
    const teardown = install();
    bus.fire({ changedAt: 1 });
    await until(() => flushCalls === 1);
    // A second peer change arrives while the first flush is still held.
    bus.fire({ changedAt: 2 });
    await tick();
    flushGate.open(); // let the first settle; the queued drain re-checks and flushes again
    await until(() => flushCalls === 2);
    teardown();
  });

  test("flush rejection is swallowed; latch stays pending for a later retry", async () => {
    const teardown = installBackgroundSync(subscribe, store, {
      isOnline: () => true,
      isDriveEnabled: () => true,
      pushBackup: () => Promise.reject(new Error("boom")),
    });
    bus.fire({ changedAt: 1 });
    await tick();
    expect(await readPending()).toMatchObject({ pending: true });
    teardown();
  });
});
