import type { RuntimeChannelEventMap } from "@/core/runtime/crossTab";
import type { PendingSyncStore } from "./pendingSync";

interface BackgroundSyncEnv {
  isDriveEnabled(): boolean;
  isOnline(): boolean;
  /** Push a fresh whole-backup snapshot, not a per-row delete/clear of local tables. */
  pushBackup(): void | Promise<void>;
}

type DataChanged = RuntimeChannelEventMap["app:data-changed"];

/** Watches for data changes from other tabs and adopts them into the durable latch and pushes a fresh whole-backup snapshot. */
export function installBackgroundSync(
  subscribe: (listener: (payload: DataChanged) => void) => () => void,
  store: PendingSyncStore,
  env: BackgroundSyncEnv,
): () => void {
  let queue: Promise<void> = Promise.resolve();
  let teardown: (() => void) | null = null;

  function drain(): void {
    queue = queue.then(async () => {
      const s = await store.snapshot();

      if (!s.ok || !s.value.pending) {
        return;
      }

      if (!env.isDriveEnabled() || !env.isOnline()) {
        return;
      }

      try {
        await env.pushBackup();
      } catch {
        // Latch stays pending; a later drain will retry the push.
      }
    });
  }

  teardown = subscribe(() => {
    void store.markDirty().then(() => drain());
  });

  return () => {
    teardown?.();
    queue = Promise.resolve();
  };
}
