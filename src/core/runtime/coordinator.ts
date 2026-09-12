import { createConnectivityMonitor, type ConnectivityMonitor } from "./connectivity";
import type { ConnectivityEnv } from "./connectivity";
import { createBridge, type Bridge } from "@/domain/notifications/client";
import { createReconcileAction } from "@/domain/notifications/actions/reconcileAction";
import { createDriveAuthActions } from "@/domain/notifications/actions/driveAuthActions";
import { createStorageMonitor } from "./storage";
import type { StorageProvider } from "./storage";
import type { ErrorKind } from "@/domain/errors/AppError";
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
  /** Non-blocking sync-conflict banner with a wired Reconcile action. */
  raiseSyncConflict(opts?: { body?: string; label?: string }): void;
  /** Clear an active sync-conflict after resolution. */
  clearSyncConflict(): void;
  /** Wire/refresh the reconciled action (in case the callback changes). */
  setReconcileHandler(onReconcile: () => void | Promise<void>): void;
  /** Drive reconnect used by the "Drive denied" blocker. */
  setAuthRecovery(onRecover: (() => void | Promise<void>) | null): void;
  /** Drive defer (pause) used by the "Drive denied" blocker's cancel CTA. */
  setAuthDeferred(onDefer: (() => void | Promise<void>) | null): void;
  /** App-session expiry → shell signs out and routes to /auth. */
  setSessionExpiredHandler(onExpired: (() => void | Promise<void>) | null): void;
  /** Whether Drive backup is opted in; gates ambient offline/conn surfaces / auto-sync. */
  setDriveSyncEnabled(enabled: boolean): void;
  /** Live flip of the Drive opt-in flag set via `setDriveSyncEnabled`. */
  isDriveSyncEnabled(): boolean;
}

let singleton: Runtime | null = null;

/** The single app runtime. */
export function getRuntime(): Runtime {
  if (!singleton) {
    singleton = createRuntime({ store: createRuntimeStore() });
  }
  return singleton;
}

function createRuntime(opts: RuntimeOpts): Runtime {
  const { store, storage = fallbackStorageProvider(), onReconcileConflict } = opts;
  const baseBridge = createBridge(store);
  let authRecovery: (() => void | Promise<void>) | null = null;
  let authDeferred: (() => void | Promise<void>) | null = null;
  let sessionExpiredHandler: (() => void | Promise<void>) | null = null;
  let driveSyncEnabled = false;

  const bridge: Bridge = {
    ...baseBridge,
    raise(input) {
      let next: RuntimeInterest = input;

      if (!input.action && input.surface.surface === "blocking") {
        const kind = input.errorKind as ErrorKind | undefined;
        if (kind === "auth-expired") {
          // App session is gone: route to /auth instead of surfacing a modal.
          if (sessionExpiredHandler) {
            void sessionExpiredHandler();
            return;
          }
        } else if (kind === "auth-denied" && authRecovery) {
          // Drive grant refused while the app session is intact: keep the
          // user on a blocking modal they can reconnect from or defer.
          const pair = createDriveAuthActions({
            onReconnect: authRecovery,
            onDefer: authDeferred ?? undefined,
          });
          next = pair.secondary
            ? { ...input, action: pair.primary, secondary: pair.secondary }
            : { ...input, action: pair.primary };
        }
      }

      baseBridge.raise(next);
    },
  };

  let reconcileHandler = onReconcileConflict;
  let reconciling = false;

  const connectivity = createConnectivityMonitor(opts.connectivity);

  // Monitor wiring owned by `start`, torn down by `stop` and re-armed each start
  // so StrictMode mount/unmount never stacks duplicate subscriptions.
  let stopMonitors: (() => void) | null = null;

  const runtime: Runtime = {
    store,
    bridge,
    connectivity,

    setReconcileHandler(handler) {
      reconcileHandler = handler;
    },

    setAuthRecovery(handler) {
      authRecovery = handler;
    },

    setAuthDeferred(handler) {
      authDeferred = handler;
    },

    setSessionExpiredHandler(handler) {
      sessionExpiredHandler = handler;
    },

    setDriveSyncEnabled(enabled) {
      driveSyncEnabled = enabled;
      if (!enabled) {
        bridge.clear("conn");
      }
    },

    isDriveSyncEnabled() {
      return driveSyncEnabled;
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

    start() {
      if (stopMonitors) {
        return;
      }
      const disposers: (() => void)[] = [];

      disposers.push(
        connectivity.subscribe((ev) => {
          if (ev.online) {
            bridge.clear("conn");
            wakeRetryQueue();
          } else if (driveSyncEnabled) {
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
        }),
        () => connectivity.stop(),
      );
      connectivity.start();

      const storageMonitor = createStorageMonitor({ provider: storage, warnRatio: 0.9 });
      disposers.push(
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
        }),
        () => storageMonitor.stop(),
      );
      storageMonitor.start();

      stopMonitors = () => {
        for (const dispose of disposers) {
          dispose();
        }
      };
    },

    stop() {
      stopMonitors?.();
      stopMonitors = null;
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
