import type { RuntimeMessage } from "./types";

export interface RuntimeStoreState {
  /** The arbitrated, active blocking message (at most one). */
  blocking: RuntimeMessage | null;
  /** Non-blocking passive messages, in emit order. */
  notices: readonly RuntimeMessage[];
}

export type RuntimeStoreSnapshot = Readonly<RuntimeStoreState>;

type Listener = () => void;

/**
 * A lifecycle-managed message store.
 *
 * `createRuntimeStore()` returns the store; there is no `class` in the public
 * surface. The store holds the arbitrated snapshot and notifies subscribers on
 * change — it is the state container the bridge writes into and the React layer
 * subscribes to.
 */
export interface RuntimeStore {
  getSnapshot(): RuntimeStoreSnapshot;
  subscribe(listener: Listener): () => void;
  replace(state: RuntimeStoreState): void;
  nextId(): string;
}

export function createRuntimeStore(): RuntimeStore {
  let messageCounter = 0;
  let state: RuntimeStoreState = { blocking: null, notices: [] };
  const listeners = new Set<Listener>();

  /** Immutable state replace + notify. Only emits when something changed. */
  function set(next: RuntimeStoreState): void {
    if (currentEqual(state, next)) {
      return;
    }
    state = next;
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    getSnapshot(): RuntimeStoreSnapshot {
      return state;
    },

    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    replace(next: RuntimeStoreState): void {
      set({ blocking: next.blocking, notices: next.notices });
    },

    nextId(): string {
      const id = `rt-${(messageCounter++).toString(36)}`;
      return id;
    },
  };
}

function currentEqual(a: RuntimeStoreState, b: RuntimeStoreState): boolean {
  return a.blocking === b.blocking && a.notices === b.notices;
}
