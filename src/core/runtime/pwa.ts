import { Logger } from "@/core/logging/logger";
import { type CrossTabEventBus } from "./crossTab";

export interface PwaUpdateHook {
  onNeedRefresh(cb: () => void): void;
  onOfflineReady?(cb: () => void): void;
}

export interface PwaUpdaterOpts {
  bus: CrossTabEventBus;
  onUpdateAvailable: (installedVersion: string) => void;
}

export interface PwaUpdater {
  start(): void;
  stop(): void;
}

/** Creates a new PWA updater. */
export function createPwaUpdater(hook: PwaUpdateHook, opts: PwaUpdaterOpts): PwaUpdater {
  const { bus, onUpdateAvailable } = opts;

  let unsubscribe: (() => void) | null = null;
  let started = false;

  function start(): void {
    if (started) {
      return;
    }
    started = true;
    bus.start();

    hook.onNeedRefresh(() => {
      Logger.analytics.debug("PWA need-refresh event fired, broadcasting to other tabs");
      bus.post("app:update", { installedVersion: "need-refresh" });
    });

    hook.onOfflineReady?.(() => {
      Logger.analytics.debug("PWA offline-ready event fired");
    });

    unsubscribe = bus.subscribe("app:update", () => {
      onUpdateAvailable("remote");
    });
  }

  function stop(): void {
    started = false;
    unsubscribe?.();
    unsubscribe = null;
  }

  return { start, stop };
}
