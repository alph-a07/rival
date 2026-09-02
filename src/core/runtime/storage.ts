import type { RuntimeAction } from "@/domain/notifications/types";
import { Logger } from "@/core/logging/logger";

/** The surface of the browser Storage API (`navigator.storage`) the runtime layer relies on. */
export interface StorageProvider {
  /** Returns the current storage usage and quota. */
  estimate?(): Promise<{ usage?: number; quota?: number }>;
  /** Requests persistent storage. */
  persist?(): Promise<boolean>;
  /** Checks if persistent storage is already granted. */
  persisted?(): Promise<boolean>;
}

const STORAGE_PRESSURE_DEFAULT_WARN_RATIO = 0.9;
const STORAGE_PRESSURE_DEFAULT_INTERVAL_MS = 120_000;

export interface StoragePressureSignal {
  type: "pressure" | "relief";
  /** Bytes in use when the warning first crossed the threshold. */
  usedBytes?: number;
  /** Total quota reported at that moment. */
  quotaBytes?: number;
  action?: RuntimeAction;
  /** True if this is a recurring sample (not the startup sample). */
  periodic?: boolean;
}

export interface StorageMonitorOpts {
  provider?: StorageProvider;
  warnRatio?: number;
  intervalMs?: number;
  action?: RuntimeAction;
}

export type StorageListener = (event: StoragePressureSignal) => void;

export interface StorageMonitor {
  start(): void;
  stop(): void;
  subscribe(listener: StorageListener): () => void;
}

/** Creates a new storage monitor. */
export function createStorageMonitor(opts: StorageMonitorOpts = {}): StorageMonitor {
  const provider = opts.provider ?? STORAGE_PROVIDER_DEFAULT;
  const warnRatio = opts.warnRatio ?? STORAGE_PRESSURE_DEFAULT_WARN_RATIO;
  const intervalMs = opts.intervalMs ?? STORAGE_PRESSURE_DEFAULT_INTERVAL_MS;
  const listeners = new Set<StorageListener>();

  let timer: ReturnType<typeof setInterval> | undefined;
  let over = false;

  /** Samples storage; returns null when the API is unavailable. */
  async function sample(): Promise<{ usage: number; quota: number } | null> {
    if (!provider?.estimate) {
      return null;
    }
    try {
      const { usage = 0, quota = Number.POSITIVE_INFINITY } = await provider.estimate();
      return { usage, quota };
    } catch {
      if (provider) {
        Logger.analytics.warn(`StorageProvider sample failed, ignoring`);
      } else {
        Logger.analytics.warn(`StorageProvider sample failed, provider is undefined`);
      }
      return null;
    }
  }

  /** Check storage pressure and notify listeners. */
  async function pass(periodic: boolean): Promise<void> {
    const result = await sample();
    if (!result) {
      return;
    }

    const isOver =
      result.quota !== Number.POSITIVE_INFINITY && result.usage / result.quota >= warnRatio;

    if (isOver && !over) {
      over = true;
      emit({
        type: "pressure",
        usedBytes: result.usage,
        quotaBytes: result.quota,
        action: opts.action,
        periodic,
      });
    } else if (!isOver && over) {
      over = false;
      emit({ type: "relief" });
    }
  }

  function emit(event: StoragePressureSignal): void {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {
        Logger.analytics.warn("storage listener threw an error, ignoring");
      }
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    start() {
      void pass(false);
      if (provider && typeof setInterval === "function") {
        timer = setInterval(() => void pass(true), intervalMs);
      }
    },

    stop() {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    },
  };
}

const STORAGE_PROVIDER_DEFAULT: StorageProvider | undefined =
  typeof navigator !== "undefined" ? (navigator.storage as unknown as StorageProvider) : undefined;
