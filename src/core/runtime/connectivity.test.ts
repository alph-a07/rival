import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createConnectivityMonitor } from "./connectivity";
import { createCrossTabBus } from "./crossTab";

/** A controllable BroadcastChannel polyfill so the cross-tab bus can be tested. */
class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];
  name: string;
  // The real bus assigns `.onmessage`; deliver to it so the bus's own handler runs.
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  constructor(name: string) {
    this.name = name;
    FakeBroadcastChannel.instances.push(this);
  }
  postMessage(data: unknown) {
    // Deliver to every OTHER instance sharing this name.
    for (const other of FakeBroadcastChannel.instances) {
      if (other !== this) {
        other.onmessage?.({ data });
      }
    }
  }
  close() {
    FakeBroadcastChannel.instances = FakeBroadcastChannel.instances.filter((i) => i !== this);
  }
}

describe("cross-tab bus", () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).BroadcastChannel = FakeBroadcastChannel;
  });
  afterEach(() => {
    FakeBroadcastChannel.instances = [];
    delete (globalThis as Record<string, unknown>).BroadcastChannel;
  });

  it("delivers a broadcast from one tab to another, but never back to the sender", () => {
    // Distinct instance ids = distinct "tabs" even inside one JS context, so
    // the self-delivery guard doesn't suppress cross-handle delivery.
    const tabA = createCrossTabBus("tab-a");
    const tabB = createCrossTabBus("tab-b");
    tabA.start();
    tabB.start();

    const seenA: string[] = [];
    const seenB: string[] = [];
    tabA.subscribe("app:update", (p) => seenA.push(p.installedVersion));
    tabB.subscribe("app:update", (p) => seenB.push(p.installedVersion));

    // Tab A announces a new build.
    tabA.post("app:update", { installedVersion: "v2" });

    // B hears it; A does not self-hear.
    expect(seenA).toEqual([]);
    expect(seenB).toEqual(["v2"]);

    tabA.stop();
    tabB.stop();
  });

  it("does not deliver after the subscriber unsubscribes", () => {
    const tabA = createCrossTabBus();
    const tabB = createCrossTabBus();
    tabA.start();
    const seen: string[] = [];
    // tabB starts with a subscriber, then drops it.
    const handle = createCrossTabBus();
    handle.start();
    let unsub: () => void;
    unsub = handle.subscribe("app:update", (p) => seen.push(p.installedVersion));
    unsub();
    tabA.post("app:update", { installedVersion: "v2" });
    expect(seen).toEqual([]);
    tabA.stop();
    tabB.stop();
    handle.stop();
  });
});

function fakeEnv(initialOnline: boolean) {
  const listeners: Record<string, (() => void)[]> = { online: [], offline: [] };
  return {
    onLine: initialOnline,
    addEventListener: (type: string, fn: () => void) => {
      listeners[type]?.push(fn);
    },
    removeEventListener: (type: string, fn: () => void) => {
      const arr = listeners[type];
      if (arr) {
        arr.splice(arr.indexOf(fn), 1);
      }
    },
    fire(type: "online" | "offline") {
      listeners[type].forEach((fn) => fn());
    },
  };
}

describe("connectivity monitor", () => {
  it("emits the CURRENT state at boot, so an already-offline app warns immediately", () => {
    const env = fakeEnv(false); // boots offline
    const mon = createConnectivityMonitor(env);
    const events: boolean[] = [];
    mon.subscribe((ev) => events.push(ev.online));
    mon.start();
    expect(events).toEqual([false]); // immediate, no transition needed
  });

  it("emits online at boot when the app starts online", () => {
    const env = fakeEnv(true);
    const mon = createConnectivityMonitor(env);
    const events: boolean[] = [];
    mon.subscribe((ev) => events.push(ev.online));
    mon.start();
    expect(events).toEqual([true]);
  });

  it("reacts to a subsequent transition to offline+online", () => {
    const env = fakeEnv(true);
    const mon = createConnectivityMonitor(env);
    const events: boolean[] = [];
    mon.subscribe((ev) => events.push(ev.online));
    mon.start();
    env.fire("offline");
    env.fire("online");
    expect(events).toEqual([true, false, true]);
  });
});
