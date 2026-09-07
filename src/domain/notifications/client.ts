import { type RuntimeStore } from "./store";
import { arbitrate } from "./arbitration";
import type { Blockable, RuntimeInterest, RuntimeMessage } from "./types";
import { isBlockingSurface } from "./types";
import { Logger } from "@/core/logging/logger";

export interface Bridge {
  raise(input: RuntimeInterest): void;
  dismiss(id: string): void;
  setBusy(id: string, busy: boolean): void;
  clear(key: string): void;
  reArm(key: string): void;
}

export function createBridge(store: RuntimeStore): Bridge {
  const byKey = new Map<string, RuntimeMessage>();

  /** Once-keys that were shown and dismissed; suppressed until re-armed. */
  const completedNotifications = new Set<string>();

  /** Stable FIFO order per message id, for priority ties in arbitration. */
  const orders = new Map<string, number>();
  let orderCounter = 0;

  /** The id of whichever blocking message is currently surfaced. */
  let activeId: string | null = null;

  function materialize(input: RuntimeInterest, id: string): RuntimeMessage {
    return {
      id,
      tone: input.tone,
      surface: input.surface,
      title: input.title,
      body: input.body,
      once: input.once,
      action: input.action,
      secondary: input.secondary,
      busy: input.busy,
    };
  }

  /** Build `Blockable` candidates carrying each message's surface + FIFO order. */
  function blockingCandidates(messages: RuntimeMessage[]): Blockable[] {
    return messages.map((m) => ({
      id: m.id,
      surface: m.surface,
      order: orders.get(m.id) ?? 0,
    }));
  }

  /** Rebuild the store from the live map, arbitrating blocking. */
  function flush(): void {
    const messages = Array.from(byKey.values()).map((m) => ({ ...m }));

    const active = arbitrate(blockingCandidates(messages));
    activeId = active?.id ?? null;

    const blocking = active ? (messages.find((m) => m.id === active.id) ?? null) : null;
    const notices = messages.filter((m) =>
      isBlockingSurface(m.surface) ? m.id === activeId : true,
    );
    store.replace({ blocking, notices });
  }

  const bridge: Bridge = {
    raise(input: RuntimeInterest) {
      Logger.analytics.debug(`raise interest: ${input.key} (${input.surface.surface})`);
      // Suppress spent once-keys (dismissed, not re-armed).
      if (input.once && completedNotifications.has(input.key)) {
        return;
      }

      const existing = byKey.get(input.key);
      if (existing) {
        // Refresh the existing message in place (dedup) — keep its original order.
        byKey.set(input.key, materialize(input, existing.id));
      } else {
        const id = store.nextId();
        orders.set(id, orderCounter++);
        byKey.set(input.key, materialize(input, id));
      }
      flush();
    },

    dismiss(id: string) {
      Logger.analytics.debug(`dismiss interest: ${id}`);

      let key: string | undefined;
      for (const [k, m] of byKey) {
        if (m.id === id) {
          key = k;
          break;
        }
      }
      if (key == null) {
        Logger.analytics.debug(`dismiss interest not found: ${id}`);
        return;
      }
      const message = byKey.get(key)!;
      if (message.once) {
        completedNotifications.add(key);
        byKey.delete(key);
      } else {
        byKey.delete(key);
      }
      flush();
    },

    setBusy(id: string, busy: boolean) {
      Logger.analytics.debug(`set busy: ${id} => ${busy}`);
      for (const m of byKey.values()) {
        if (m.id === id) {
          m.busy = busy;
        }
      }
      flush();
    },

    clear(key: string) {
      Logger.analytics.debug(`clear interest: ${key}`);
      if (byKey.delete(key)) {
        flush();
      }
    },

    reArm(key: string) {
      Logger.analytics.debug(`re-arm interest: ${key}`);
      completedNotifications.delete(key);
    },
  };

  return bridge;
}
