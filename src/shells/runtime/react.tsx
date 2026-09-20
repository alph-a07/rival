import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createReloadAction } from "@/domain/notifications/actions/reloadAction";
import type { RuntimeStoreSnapshot } from "@/domain/notifications/store";
import { getRuntime, type Runtime } from "@/core/runtime/coordinator";
import { createPwaUpdater } from "@/core/runtime/pwa";
import { crossTabBus } from "@/core/runtime/crossTab";
import { setReporter } from "@/domain/errors/reporter";
import { syncService } from "@/sync/syncService";
import { pendingSyncStore, type PendingSyncStore } from "@/sync/pendingSync";
import { installBackgroundSync } from "@/sync/backgroundSync";
import { registerSW } from "virtual:pwa-register";

const runtime: Runtime = getRuntime();

export interface RuntimeProviderProps {
  children: ReactNode;
  /** App-wide conflict-resolution entry point (pick-a-version / merge / defer). */
  onReconcileConflict?: () => void | Promise<void>;
}

export function RuntimeProvider({ children, onReconcileConflict }: RuntimeProviderProps) {
  useEffect(() => {
    runtime.setReconcileHandler(onReconcileConflict ?? (() => undefined));
  }, [onReconcileConflict]);

  // Start the runtime's monitors on mount and tear them down on unmount.
  useEffect(() => {
    setReporter(runtime.bridge);
    runtime.setAuthRecovery(() => void syncService.reconnectDrive());
    runtime.setAuthDeferred(() => void syncService.pauseDrive());

    const backgroundSyncEnv = {
      isOnline: () => runtime.connectivity.isOnline,
      isDriveEnabled: () => runtime.isDriveSyncEnabled(),
      pushBackup: () => syncService.syncDrive(),
    };

    const stopReconnectDrain = runtime.connectivity.subscribe(async (ev) => {
      if (!ev.online || !backgroundSyncEnv.isDriveEnabled()) {
        return;
      }

      const state = await pendingSyncStore.snapshot();
      if (state.ok && state.value.pending) {
        await syncService.syncDrive();
      }
    });

    const stopBackgroundSync = installBackgroundSync(
      (listener) => crossTabBus.subscribe("app:data-changed", listener),
      pendingSyncStore as PendingSyncStore,
      backgroundSyncEnv,
    );

    const pwaUpdater = createPwaUpdater(
      {
        onNeedRefresh: (cb) => {
          registerSW({ immediate: true, onNeedRefresh: () => cb(), onOfflineReady() {} });
        },
      },
      {
        bus: crossTabBus,
        onUpdateAvailable: () => raisePwaUpdate(runtime),
      },
    );
    pwaUpdater.start();
    runtime.start();

    // Cleanup on unmount: stop monitors, stop PWA updater, clear runtime handlers, and stop the runtime.
    return () => {
      stopBackgroundSync();
      stopReconnectDrain();
      pwaUpdater.stop();
      runtime.setAuthRecovery(null);
      runtime.setAuthDeferred(null);
      setReporter(null);
      runtime.stop();
    };
  }, []);

  return <>{children}</>;
}

/** Read the current snapshot; re-render on any store change. */
export function useRuntimeSnapshot(): RuntimeStoreSnapshot {
  const store = runtime.store;
  
  return useSyncExternalStore(
    (onStoreChange) => store.subscribe(onStoreChange),
    () => store.getSnapshot(),
  );
}

/** Convenience: dismiss a message by id. */
export function useDismissMessage() {
  const bridge = runtime.bridge;
  return (id: string) => bridge.dismiss(id);
}

/** Raise the non-blocking "new version available" banner with a Reload action. */
function raisePwaUpdate(runtime: Runtime): void {
  runtime.bridge.raise({
    key: "pwa",
    tone: "info",
    surface: { surface: "banner" },
    title: "A new version is available",
    body: "Reload to get the latest updates.",
    action: createReloadAction(),
  });
}
