import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createStorageMonitor, type StoragePressureSignal, type StorageProvider } from "./storage";
import { createEnableSyncAction } from "@/domain/notifications/actions/enableSyncAction";

/**
 * A controllable fake `navigator.storage`-shaped provider. The test drives
 * `usage`/`quota` between calls to simulate pressure rising/falling.
 */
function fakeProvider(
  initialUsage = 0,
  quota = 100,
): { usage: number; quota: number } & StorageProvider {
  const state = { usage: initialUsage, quota };
  const estimate = vi.fn(async () => ({ usage: state.usage, quota: state.quota }));
  return Object.assign(state as { usage: number; quota: number }, { estimate });
}

interface Mono {
  signals: StoragePressureSignal[];
  /** Number of relief events fired. */
  reliefs: { count: number };
  /** A listener for storage events. */
  listen: (e: StoragePressureSignal) => void;
}

function makeRecorder(): Mono {
  const signals: StoragePressureSignal[] = [];
  const reliefs: { count: number } = { count: 0 };
  /** A listener for storage events. */
  const listen = (e: StoragePressureSignal) => {
    if (e.type === "pressure") {
      signals.push(e);
    } else {
      reliefs.count++;
    }
  };
  return { signals, reliefs, listen };
}

const action = createEnableSyncAction(() => {});

/** Build a started monitor recording pressure/relief via the recorder's listener. */
function startedMonitor(opts: Record<string, unknown>, rec: Mono) {
  const monitor = createStorageMonitor(opts as never);
  monitor.subscribe(rec.listen);
  monitor.start();
  return monitor;
}

describe("createStorageMonitor — (proactive storage pressure)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fires onPressure immediately on startup when ALREADY over the threshold", async () => {
    // Boot already at 95% — means we catch it before a write fails.
    const provider = fakeProvider(95, 100);
    const rec = makeRecorder();
    const monitor = startedMonitor({ provider, warnRatio: 0.9 }, rec);
    // The startup sample runs asynchronously; flush microtasks.
    await vi.advanceTimersByTimeAsync(0);

    expect(rec.signals.length).toBe(1);
    expect(rec.signals[0].usedBytes).toBe(95);
    expect(rec.signals[0].quotaBytes).toBe(100);
    expect(rec.signals[0].periodic).toBe(false); // the startup sample is not periodic
    monitor.stop();
  });

  it("does NOT fire on startup when under the threshold", async () => {
    const provider = fakeProvider(50, 100);
    const rec = makeRecorder();
    const monitor = startedMonitor({ provider, warnRatio: 0.9 }, rec);
    await vi.advanceTimersByTimeAsync(0);
    expect(rec.signals.length).toBe(0);
    monitor.stop();
  });

  it("fires onPressure exactly once when pressure CROSSES the threshold (latch)", async () => {
    const provider = fakeProvider(50, 100);
    const rec = makeRecorder();
    const monitor = startedMonitor({ provider, warnRatio: 0.9, intervalMs: 1000 }, rec);
    await vi.advanceTimersByTimeAsync(0);
    expect(rec.signals.length).toBe(0); // starts under

    // Pressure rises past 90%.
    provider.usage = 92;
    await vi.advanceTimersByTimeAsync(1000);
    expect(rec.signals.length).toBe(1);
    expect(rec.signals[0].periodic).toBe(true); // a timer-triggered sample

    // Still over — must NOT fire again (latch holds).
    provider.usage = 98;
    await vi.advanceTimersByTimeAsync(1000);
    expect(rec.signals.length).toBe(1);
    monitor.stop();
  });

  it("fires onRelief once usage drops back under the threshold", async () => {
    const provider = fakeProvider(95, 100);
    const rec = makeRecorder();
    const monitor = startedMonitor({ provider, warnRatio: 0.9, intervalMs: 1000 }, rec);
    await vi.advanceTimersByTimeAsync(0);
    expect(rec.signals.length).toBe(1); // over on startup

    provider.usage = 40;
    await vi.advanceTimersByTimeAsync(1000);
    expect(rec.reliefs.count).toBe(1);

    // Stays under — no further relief.
    await vi.advanceTimersByTimeAsync(1000);
    expect(rec.reliefs.count).toBe(1);
    monitor.stop();
  });

  it("passes the configured action through the pressure signal", async () => {
    const provider = fakeProvider(95, 100);
    const rec = makeRecorder();
    const monitor = startedMonitor({ provider, warnRatio: 0.9, action }, rec);
    await vi.advanceTimersByTimeAsync(0);
    expect(rec.signals[0]?.action).toBe(action);
    monitor.stop();
  });

  it("treats an infinite-quota provider as never-over (no cancellation of sampling)", async () => {
    // Some environments report unlimited quota; the monitor should not fire.
    const provider = fakeProvider(50, Number.POSITIVE_INFINITY);
    const rec = makeRecorder();
    const monitor = startedMonitor({ provider, warnRatio: 0.9, intervalMs: 1000 }, rec);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    expect(rec.signals.length).toBe(0);
    expect(rec.reliefs.count).toBe(0);
    monitor.stop();
  });

  it("does nothing when the provider exposes no estimate()", async () => {
    const rec = makeRecorder();
    const monitor = startedMonitor({ provider: {}, warnRatio: 0.9 }, rec);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    expect(rec.signals.length).toBe(0);
    expect(rec.reliefs.count).toBe(0);
    monitor.stop();
  });

  it("stops sampling after stop() runs", async () => {
    const provider = fakeProvider(95, 100);
    const rec = makeRecorder();
    const monitor = startedMonitor({ provider, warnRatio: 0.9, intervalMs: 1000 }, rec);
    await vi.advanceTimersByTimeAsync(0);
    expect(rec.signals.length).toBe(1);

    monitor.stop();
    provider.usage = 99;
    await vi.advanceTimersByTimeAsync(3000);
    expect(rec.signals.length).toBe(1); // no further samples after stop
  });
});
