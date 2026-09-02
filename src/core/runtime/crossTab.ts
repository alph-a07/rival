import { Logger } from "@/core/logging/logger";

export type RuntimeChannelEventMap = {
  "app:update": { installedVersion: string };
  "app:data-changed": { changedAt: number };
  "app:sync": { at: number };
};

type RuntimeChannelEvent = keyof RuntimeChannelEventMap;

export interface CrossTabEventBus {
  post<K extends RuntimeChannelEvent>(event: K, payload: RuntimeChannelEventMap[K]): void;
  subscribe<K extends RuntimeChannelEvent>(
    event: K,
    listener: (payload: RuntimeChannelEventMap[K]) => void,
  ): () => void;
  start(): void;
  stop(): void;
}

const CHANNEL_NAME = "rival";

/** Shared cross-tab bus instance used across the runtime + shells. */
export const crossTabBus: CrossTabEventBus = createCrossTabBus();

/** Internal payload envelope shared across all transports. */
interface Envelope<K extends RuntimeChannelEvent = RuntimeChannelEvent> {
  kind: "rival-bus";
  event: K;
  created: number;
  sourceInstance: string;
  payload: RuntimeChannelEventMap[K];
}

/** Creates a new cross-tab event bus. */
export function createCrossTabBus(instanceId: string = randomInstanceId()): CrossTabEventBus {
  const listeners = new Map<RuntimeChannelEvent, Set<(p: unknown) => void>>();

  const GlobalBroadcastChannel = (globalThis as Record<"BroadcastChannel", unknown>)
    .BroadcastChannel;

  const broadcastChannel =
    typeof GlobalBroadcastChannel === "function"
      ? new (GlobalBroadcastChannel as new (name: string) => {
          onmessage: (ev: MessageEvent) => void;
          postMessage(msg: unknown): void;
          close(): void;
        })(CHANNEL_NAME)
      : undefined;

  const deliver = (env: Envelope) => {
    if (env.sourceInstance === instanceId) {
      Logger.analytics.debug(`cross-tab bus ignoring self-originated event ${env.event}`);
      return;
    }
    const runtimeEventHandler = listeners.get(env.event as RuntimeChannelEvent);
    if (!runtimeEventHandler) {
      Logger.analytics.debug(`cross-tab bus ignoring unhandled event ${env.event}`);
      return;
    }
    for (const listenerCallback of runtimeEventHandler) {
      try {
        listenerCallback(env.payload);
      } catch {
        Logger.analytics.warn(`cross-tab bus listener threw an error, ignoring`);
      }
    }
  };

  // storage-event fallback (cross-tab only).
  const onStorage = (e: StorageEvent) => {
    if (e.key !== CHANNEL_NAME || e.newValue == null) {
      Logger.analytics.debug(`cross-tab bus ignoring non-bus storage event: ${e.key}`);
      return;
    }
    try {
      const env = JSON.parse(e.newValue) as unknown;
      if (isEnvelope(env)) {
        deliver(env);
      }
    } catch {
      Logger.analytics.warn(`cross-tab bus storage-event parse failed, ignoring`);
    }
  };

  let started = false;

  function start(): void {
    if (started) {
      return;
    }
    started = true;
    if (broadcastChannel) {
      broadcastChannel.onmessage = (ev: MessageEvent) => {
        if (isEnvelope(ev.data)) {
          deliver(ev.data);
        }
      };
    } else {
      global?.addEventListener("storage", onStorage);
    }
  }

  function post<K extends RuntimeChannelEvent>(event: K, payload: RuntimeChannelEventMap[K]): void {
    const env: Envelope<K> = {
      kind: "rival-bus",
      event,
      created: Date.now(),
      sourceInstance: instanceId,
      payload,
    };
    if (broadcastChannel) {
      broadcastChannel.postMessage(env);
    } else {
      Logger.analytics.debug(`cross-tab bus storage-event fallback posting ${event}`);
      global?.localStorage?.setItem(CHANNEL_NAME, JSON.stringify(env));
    }
  }

  function subscribe<K extends RuntimeChannelEvent>(
    event: K,
    listener: (payload: RuntimeChannelEventMap[K]) => void,
  ): () => void {
    let handlers = listeners.get(event);
    if (!handlers) {
      handlers = new Set();
      listeners.set(event, handlers);
    }
    const wrapped = listener as (p: unknown) => void;
    handlers.add(wrapped);
    return () => {
      handlers!.delete(wrapped);
    };
  }

  function stop(): void {
    started = false;
    broadcastChannel?.close();
    global?.removeEventListener("storage", onStorage);
    listeners.clear();
  }

  return { post, subscribe, start, stop };
}

function randomInstanceId(): string {
  return Math.random().toString(36).slice(2);
}

function isEnvelope(value: unknown): value is Envelope {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Envelope).kind === "rival-bus" &&
    "event" in value &&
    "sourceInstance" in value &&
    "created" in value
  );
}

const global =
  typeof window !== "undefined"
    ? (window as Window & {
        BroadcastChannel?: new (name: string) => {
          onmessage: (ev: MessageEvent) => void;
          postMessage(msg: unknown): void;
          close(): void;
        };
      })
    : null;
