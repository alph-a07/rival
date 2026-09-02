import { Logger } from "@/core/logging/logger";

/** The surface of the browser `navigator` the runtime layer relies on for connectivity. */
export interface ConnectivityEnv {
  onLine?: boolean;
  addEventListener?(type: "online" | "offline", listener: () => void): void;
  removeEventListener?(type: "online" | "offline", listener: () => void): void;
}

export interface ConnectivityEvent {
  online: boolean;
}

export type ConnectivityListener = (event: ConnectivityEvent) => void;

export interface ConnectivityMonitor {
  start(): void;
  stop(): void;
  /** Register a listener; receives current state immediately on start, then transitions. */
  subscribe(listener: ConnectivityListener): () => void;
  get isOnline(): boolean;
}

/** Creates a new connectivity monitor. */
export function createConnectivityMonitor(
  env: ConnectivityEnv = NAVIGATOR_ENV,
): ConnectivityMonitor {
  let online = env.onLine ?? true;
  let alive = false;
  const listeners = new Set<ConnectivityListener>();

  const onOnline = () => {
    online = true;
    emit(true);
  };

  const onOffline = () => {
    online = false;
    emit(false);
  };

  function emit(value: boolean): void {
    if (!alive) {
      return;
    }
    for (const listener of listeners) {
      try {
        listener({ online: value });
      } catch {
        Logger.analytics.warn("connectivity listener threw an error, ignoring");
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
      alive = true;
      emit(online);
      env.addEventListener?.("online", onOnline);
      env.addEventListener?.("offline", onOffline);
    },

    stop() {
      alive = false;
      env.removeEventListener?.("online", onOnline);
      env.removeEventListener?.("offline", onOffline);
    },

    get isOnline() {
      return online;
    },
  };
}

const NAVIGATOR_ENV = typeof navigator !== "undefined" ? (navigator as ConnectivityEnv) : {};
