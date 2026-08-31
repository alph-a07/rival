import { describe, it, expect } from "vitest";
import { arbitrate, compareBlocking } from "./arbitration";
import { BLOCKING_PRIORITY, type BlockingKind } from "./types";
import { createBridge } from "./client";
import { createRuntimeStore } from "./store";

describe("arbitration — gap #2", () => {
  const block = (
    id: string,
    priority: number,
    order: number,
  ): { id: string; blocking: BlockingKind; order: number } =>
    priority === -1
      ? { id, blocking: { blocking: false }, order }
      : { id, blocking: { blocking: true, priority: priority as 0 | 1 | 2 }, order };
  const nonBlocking = block("notice", -1, 0); // reuse for the null case

  it("compareBlocking orders corruption > auth > other", () => {
    expect(
      compareBlocking(
        { blocking: true, priority: BLOCKING_PRIORITY.CORRUPTION },
        { blocking: true, priority: BLOCKING_PRIORITY.AUTH },
      ),
    ).toBeGreaterThan(0);
    expect(
      compareBlocking(
        { blocking: true, priority: BLOCKING_PRIORITY.AUTH },
        { blocking: true, priority: BLOCKING_PRIORITY.OTHER },
      ),
    ).toBeGreaterThan(0);
    expect(
      compareBlocking(
        { blocking: true, priority: BLOCKING_PRIORITY.CORRUPTION },
        { blocking: true, priority: BLOCKING_PRIORITY.OTHER },
      ),
    ).toBeGreaterThan(0);
  });

  it("a higher-priority blocker preempts a currently-lower one", () => {
    const current = [
      block("auth", BLOCKING_PRIORITY.AUTH, 0),
      block("corruption", BLOCKING_PRIORITY.CORRUPTION, 1),
    ];
    // Corruption wins even though auth was raised first.
    expect(arbitrate(current)?.id).toBe("corruption");
  });

  it("picks the highest-priority blocker when none active", () => {
    const current = [
      block("auth", BLOCKING_PRIORITY.AUTH, 0),
      block("corruption", BLOCKING_PRIORITY.CORRUPTION, 1),
    ];
    expect(arbitrate(current)?.id).toBe("corruption");
  });

  it("breaks priority ties by insertion order", () => {
    const current = [block("a", BLOCKING_PRIORITY.AUTH, 0), block("b", BLOCKING_PRIORITY.AUTH, 1)];
    expect(arbitrate(current)?.id).toBe("a");
  });

  it("returns null when nothing is blocking", () => {
    const current = [nonBlocking];
    expect(arbitrate(current)).toBeNull();
  });
});

describe("bridge — dedup + once semantics", () => {
  function make() {
    const store = createRuntimeStore();
    const bridge = createBridge(store);
    return { store, bridge };
  }

  it("dedups by key so a repeat firing updates, not stacks", () => {
    const { store, bridge } = make();
    const base = {
      key: "conn",
      kind: "network" as const,
      blocking: { blocking: false } as const,
      title: "offline",
      body: "b1",
    };
    bridge.raise(base);
    bridge.raise({ ...base, body: "b2" });
    const { notices } = store.getSnapshot();
    expect(notices.length).toBe(1);
    expect(notices[0].body).toBe("b2");
  });

  it("holds at most one blocking message, highest priority wins", () => {
    const { store, bridge } = make();
    bridge.raise({
      key: "auth",
      kind: "auth",
      blocking: { blocking: true, priority: BLOCKING_PRIORITY.AUTH } as const,
      title: "auth",
    });
    bridge.raise({
      key: "corruption",
      kind: "corruption",
      blocking: { blocking: true, priority: BLOCKING_PRIORITY.CORRUPTION } as const,
      title: "corrupt",
    });
    const { blocking } = store.getSnapshot();
    expect(blocking?.title).toBe("corrupt");
  });

  it("once messages do not re-raise after dismiss until re-armed", () => {
    const { store, bridge } = make();
    const base = {
      key: "auth-expired",
      kind: "auth" as const,
      blocking: { blocking: true, priority: BLOCKING_PRIORITY.AUTH } as const,
      title: "auth expired",
      once: true,
    };
    bridge.raise(base);
    expect(store.getSnapshot().blocking?.title).toBe("auth expired");
    bridge.dismiss(store.getSnapshot().blocking!.id);
    expect(store.getSnapshot().blocking).toBeNull();
    // Re-firing the same once key must be suppressed.
    bridge.raise(base);
    expect(store.getSnapshot().blocking).toBeNull();
    // After re-arm, it can surface again.
    bridge.reArm("auth-expired");
    bridge.raise(base);
    expect(store.getSnapshot().blocking?.title).toBe("auth expired");
  });
});
