import { createConnectivityMonitor, type ConnectivityMonitor } from "./connectivity";
import type { ConnectivityEnv } from "./connectivity";
import { createBridge, type Bridge } from "@/domain/notifications/client";
import { createReconcileAction } from "@/domain/notifications/actions/reconcileAction";
import { createStorageMonitor } from "./storage";
import type { StorageProvider } from "./storage";
import { wakeRetryQueue } from "@/domain/errors/withRetry";
import { createRuntimeStore, type RuntimeStore } from "@/domain/notifications/store";
import type {
  MessageSurface,
  MessageTone,
  RuntimeAction,
  RuntimeInterest,
} from "@/domain/notifications/types";
import { BLOCKING_PRIORITY } from "@/domain/notifications/types";

export interface RuntimeOpts {
  store: RuntimeStore;
  connectivity?: ConnectivityEnv;
  storage?: StorageProvider;
  onReconcileConflict?: () => void | Promise<void>;
  queueReconcileOnStartup?: boolean;
}

export interface Runtime {
  store: RuntimeStore;
  bridge: Bridge;
  connectivity: ConnectivityMonitor;
  start(): void;
  stop(): void;
  /** Blocking storage-corrupt interest (highest priority). */
  raiseStorageCorrupt(opts: { title: string; body?: string; action?: RuntimeAction }): void;
  /** Blocking auth-expired interest. */
  raiseAuthExpired(opts: { title: string; body?: string; action?: RuntimeAction }): void;
  /** Non-blocking sync-conflict banner with a wired Reconcile action (gap #3). */
  raiseSyncConflict(opts?: { body?: string; label?: string }): void;
  /** Clear an active sync-conflict after resolution. */
  clearSyncConflict(): void;
  /** Wire/refresh the reconciled action (in case the callback changes). */
  setReconcileHandler(onReconcile: () => void | Promise<void>): void;
}

let mountedRuntime: Runtime | null = null;
let fallbackRuntime: Runtime | null = null;

/** Called by `RuntimeProvider` on mount to bind the live runtime. */
export function registerRuntime(runtime: Runtime | null): void {
  mountedRuntime = runtime;
}

/** Returns the active runtime, creating a standalone one if not yet mounted. */
export function getRuntime(): Runtime {
  if (mountedRuntime) {
    return mountedRuntime;
  }
  if (!fallbackRuntime) {
    fallbackRuntime = createRuntime({ store: createRuntimeStore() });
  }
  return fallbackRuntime;
}

export function createRuntime(opts: RuntimeOpts): Runtime {
  const { store, storage = fallbackStorageProvider(), onReconcileConflict } = opts;
  const bridge = createBridge(store);

  let reconcileHandler = onReconcileConflict;
  let reconciling = false;

  const connectivity = createConnectivityMonitor(opts.connectivity);

  const runtime: Runtime = {
    store,
    bridge,

    setReconcileHandler(handler) {
      reconcileHandler = handler;
    },

    raiseStorageCorrupt({ title, body, action }) {
      bridge.raise(
        interest(
          "corruption",
          "error",
          { surface: "blocking", priority: BLOCKING_PRIORITY.CORRUPTION },
          title,
          body,
          { action, once: true },
        ),
      );
    },

    raiseAuthExpired({ title, body, action }) {
      bridge.raise(
        interest(
          "auth",
          "error",
          { surface: "blocking", priority: BLOCKING_PRIORITY.AUTH },
          title,
          body,
          { action, once: true },
        ),
      );
    },

    clearSyncConflict() {
      reconciling = false;
      bridge.clear("sync-conflict");
    },

    raiseSyncConflict({ body, label } = {}) {
      const reconcileAction = createReconcileAction({
        label: label ?? "Reconcile",
        onReconcile: async () => {
          if (reconciling || !reconcileHandler) {
            return;
          }
          reconciling = true;
          try {
            await reconcileHandler();
          } finally {
            reconciling = false;
          }
        },
      });
      bridge.raise(
        interest(
          "sync-conflict",
          "warning",
          { surface: "banner" },
          "Some changes need to be reconciled",
          body ?? "A version of your data differs between this device and Drive.",
          { action: reconcileAction },
        ),
      );
    },

    connectivity,

    start() {
      connectivity.subscribe((ev) => {
        if (ev.online) {
          bridge.clear("conn");
          wakeRetryQueue();
        } else {
          bridge.raise(
            interest(
              "conn",
              "info",
              { surface: "banner" },
              "You're offline",
              "Some changes will sync once you're back online.",
            ),
          );
        }
      });
      connectivity.start();

      const storageMonitor = createStorageMonitor({ provider: storage, warnRatio: 0.9 });
      storageMonitor.subscribe((event) => {
        if (event.type === "relief") {
          bridge.clear("storage-pressure");
          return;
        }
        if (reconciling) {
          return;
        }
        bridge.raise(
          interest(
            "storage-pressure",
            "warning",
            { surface: "banner" },
            "You're running low on device storage",
            "Consider enabling persistent storage or enabling Drive sync for a backup.",
            { action: event.action },
          ),
        );
      });
      storageMonitor.start();
    },

    stop() {
      connectivity.stop();
    },
  };

  return runtime;
}

function interest(
  key: string,
  tone: MessageTone,
  surface: MessageSurface,
  title: string,
  body?: string,
  opts: Partial<Omit<RuntimeInterest, "key" | "tone" | "surface" | "title" | "body">> = {},
): RuntimeInterest {
  return { key, tone, surface, title, body, ...opts };
}

function fallbackStorageProvider(): StorageProvider | undefined {
  return typeof navigator !== "undefined" ? navigator.storage : undefined;
}
