# `src/core/runtime` — Monitors, Transport, Coordinator

The **framework-free, browser-coupled infrastructure** of the runtime feedback framework: the monitors that observe the real world (connectivity, storage), the cross-tab transport that keeps every open tab in sync, the PWA updater, and the **coordinator** that is the single glue wiring all of it onto the message bridge.

> **One-sentence purpose:** _Observe the ambient state of the app (online? storage pressure? a new build? another tab?) and funnel it onto one message bridge the rest of the framework renders._

**This package is framework-free** (no React, no design system) but it _is_ browser-coupled — the monitors read the real `navigator`. It sits in the middle of the framework, consuming the pure packages below it and feeding the React layer above it.

```
   dependency direction (low → high)
   ┌───────────────────────────┐
   │ domain/notifications      │  (message lifecycle — the bridge we raise on)
   └───────────▲───────────────┘
               │
   ┌───────────┴───────────────┐
   │ domain/errors             │  (withRetry — we wake its queue on reconnect)
   └───────────▲───────────────┘
               │
   ┌───────────┴───────────────┐
   │ core/runtime              │  ◄── this package
   └───────────▲───────────────┘
               │
   ┌───────────┴───────────────┐
   │ shells/runtime (React)    │  ← mounts us; services call getRuntime()
   └───────────────────────────┘
```

---

## File-by-file map

| File              | Responsibility                                                                                                       | Public surface                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `connectivity.ts` | Boot-offline connectivity monitor — emits **current** state, then transitions                                        | `createConnectivityMonitor()`, `ConnectivityEvent`, `ConnectivityListener`       |
| `storage.ts`      | Proactive storage-pressure monitor — samples `estimate()` at boot + on a timer                                       | `createStorageMonitor()`, `StoragePressureSignal`, `StorageMonitorOpts`          |
| `crossTab.ts`     | Typed `BroadcastChannel` transport with a `storage`-event fallback                                                   | `createCrossTabBus()`, `CrossTabEventBus`, `RuntimeChannelEventMap`              |
| `pwa.ts`          | New-build updater — broadcasts across tabs, each tab offers Reload                                                   | `createPwaUpdater()`, `PwaUpdateHook`, `PwaUpdaterOpts`, `crossTabBus`           |
| `coordinator.ts`  | The **single glue** — `createRuntime` wires monitors onto the bridge + exposes `getRuntime()` for non-React services | `createRuntime()`, `getRuntime()`, `registerRuntime()`, `Runtime`, `RuntimeOpts` |

## The monitors

### `createConnectivityMonitor`

The fix for "if the app boots offline, the banner never shows until the next state change." `start()` reads the **current** `navigator.onLine` and emits it immediately, then reacts to `online`/`offline` transitions. The coordinator clears the `conn` banner on `online` and raises it on `offline` — and **wakes `withRetry`'s queue** on reconnect so silent backoffs fire instantly.

```mermaid
flowchart LR
    Boot --> C{onLine?}
    C -->|false| Raise[raise offline banner NOW]
    C -->|true| OK[no banner]
    online/offline --> T[emit transition]
    T --> Raise2[raise / clear banner]
    online --> Wake[wakeRetryQueue]
```

### `createStorageMonitor`

The fix for "you only find out about storage after a `QuotaExceededError`." It samples `provider.estimate()` at startup + every `intervalMs`, keeps a latched `over` flag, and fires a `{ type: "pressure" }` event the first time `usage/quota ≥ warnRatio` (default 0.9), `{ type: "relief" }` when it drops back under. Sampling never throws — an unavailable or erroring provider simply keeps the monitor dormant.

```ts
const monitor = createStorageMonitor({ provider: navigator.storage, warnRatio: 0.9 });
monitor.subscribe((event) => {
  if (event.type === "relief") {
    bridge.clear("storage-pressure");
    return;
  }
  bridge.raise({ key: "storage-pressure", ...event });
});
monitor.start();
```

### `createCrossTabBus`

A typed, structured-clone-safe `BroadcastChannel` with a `storage`-event fallback when the channel is unavailable. Events are `RuntimeChannelEventMap`-typed (`app:update`, `app:data-changed`, `app:sync`). Crucially, **functions never cross the bus** — so each tab builds its own actions locally rather than leaking losures across the seam. Each bus is a distinct "tab" (`instanceId`), and delivery is guarded by `sourceInstance` so a tab never hears its own broadcast.

### `createPwaUpdater`

Wraps vite-plugin-pwa's `onNeedRefresh` lifecycle: when a new build is staged, it broadcasts `app:update` on the bus so every tab learns of it. The actual `registerSW` call lives in the React layer (shells), keeping this package free of Vite's `virtual:*` modules — the updater only needs a `PwaUpdateHook`. Call `start()` to wire it, `stop()` to tear it down.

---

## The coordinator — the single glue

`createRuntime(opts)` is the one place that knows how monitors, the bridge, and the store fit together. It returns a `Runtime` exposing the app-facing raise methods (so services never touch the bridge directly):

```mermaid
flowchart LR
    subgraph Runtime
        B[bridge] --- S[store]
        CM[createConnectivityMonitor] --> B
        SM[createStorageMonitor] --> B
        RA[raiseAuthExpired] --> B
        RC[raiseSyncConflict] --> B
        RS[raiseStorageCorrupt] --> B
    end
```

| Method                | Kind         | Blocking                                    | Wired by   |
| --------------------- | ------------ | ------------------------------------------- | ---------- |
| `raiseAuthExpired`    | `auth`       | blocking, priority `AUTH` (1), `once`       | auth layer |
| `raiseStorageCorrupt` | `corruption` | blocking, priority `CORRUPTION` (2), `once` | data layer |
| `raiseSyncConflict`   | `sync`       | passive banner                              | sync layer |
| `clearSyncConflict`   | —            | clears the conflict after resolution        | sync layer |
| `setReconcileHandler` | —            | wires the Reconcile action's callback       | shells     |

### `getRuntime()` — the bridge to non-React code

`auth.ts`, `syncService.ts`, and viewmodels run outside React and can't use the provider hook. `getRuntime()` is a module-level accessor: the React `RuntimeProvider` registers the live runtime via `registerRuntime()` on mount; until it mounts, `getRuntime()` returns a lazily-created standalone runtime so a service firing before first paint still works.

```ts
// in auth.ts — outside React:
import { getRuntime } from "@/core/runtime/coordinator";
getRuntime().raiseAuthExpired({ title: "Your Google connection expired", ... });
```

---

## Cross-package connections (one level deeper)

### Inbound — what `core/runtime` imports

| Package                     | Symbol(s)                                                                                             | Why                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `@/domain/notifications/*`  | `createBridge`, `createRuntimeStore`, `RuntimeInterest`, `BLOCKING_PRIORITY`, `createReconcileAction` | builds + raises onto the message bridge; wires the Reconcile CTA |
| `@/domain/errors/withRetry` | `wakeRetryQueue`                                                                                      | fires silent backoffs on reconnect                               |

`ConnectivityEnv` and `StorageProvider` are **defined in `core/runtime` itself** (`connectivity.ts`, `storage.ts`) — browser-environment shapes belonging to the runtime layer, not the pure `domain` vocabulary.

### Outbound — who consumes `core/runtime`

| Consumer                       | What it uses                                                                    | When                                              |
| ------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------- |
| `src/auth/auth.ts`             | `getRuntime().raiseAuthExpired`                                                 | an expired Drive token → blocking re-auth modal   |
| `src/sync/syncService.ts`      | `getRuntime().raiseSyncConflict`                                                | a Drive 409 → the Reconcile banner                |
| `src/shells/runtime/react.tsx` | `createRuntime`, `registerRuntime`, `createPwaUpdater`, `crossTabBus`, monitors | the React provider mounts the runtime + wires PWA |

---

## Testing

`src/core/runtime/connectivity.test.ts` covers:

- **Boot-offline** — `createConnectivityMonitor` emits the current state at `start()`, so an already-offline app warns immediately.
- **Transitions** — subsequent `offline`/`online` events emit in order.
- **Cross-tab** — a fake `BroadcastChannel` delivers a broadcast from one tab to another but never back to the sender.

```bash
npx vitest run --config vite.config.ts src/core/runtime
```
