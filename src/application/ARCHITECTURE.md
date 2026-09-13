# `src/application` — application commands (own user-visible operations)

> **One-sentence purpose:** _Own every user-visible write so hooks never re-wire
> an ad-hoc `if (!result.ok) reportError(...)` and a successful local write can
> atomically raise the durable Drive sync latch (the in-tab release seam)._

Sits between `data`/`sync` (below) and `viewmodels` (above). React-free and DOM-free: it imports `domain`, `data/repositories`, `sync`, `core/logging` and `domain/errors` only — never `viewmodels`, `shells`, or `theme`.

Layering position:

```
domain (pure contracts + shaping)
   → data/repositories (Result) + sync (latch)
        → application (commands orchestrate them)
             → viewmodels (thin hooks call commands for writes;
                          read queries + pure VM derivation stay here)
```

## Command contract

- A **command** is one user-visible operation (Complete check-in, Close
  endeavour, Switch domain). It returns `Result<T, AppError>` — it reconciles the   split where repositories return `Result` but `auth`/Worker throw a classified   `AppError`. Expected storage/integration failures never reach a hook as a   bare `Error`.
- Stateless commands are plain functions; `createX()` factories only when a
  handle owns state. No classes.
- Each command owns **atomicity + the single sync-latch mark**. It maps the
  produced rows onto one Result for the action.
- IDs and clocks are injected at the boundary (no `crypto.randomUUID()` /
  `new Date()` scattered in screen hooks).
- Reads stay repository queries called from hooks — reads are queries, not
  commands (the "queries stay below viewmodels" rule is untouched here).

## File map

| File              | Responsibility                                                                                                                                                                                                | Public surface                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `checkIn.ts`      | Records a completed check-in: shapes the Snapshot via `domain/checkin`, `checkInRepository.record` (one Dexie tx), then marks the sync latch on success                                             | `createCheckInCommands()`, `checkInCommands`, `CheckInCommands`, `NewCheckInInput`        |
| `endeavour.ts`    | User-visible endeavour mutations — create / saveEdits / close / reopen / switchDomain — each marshalling ids/timestamps, calling the repository, then marking the sync latch on success                       | `createEndeavourCommands()`, `endeavourCommands`, `EndeavourCommands`, `NewEndeavourData` |
| `microCheckIn.ts` | Logs today's micro mood through the repository (once-per-day cap stays data-owned) then marks the sync latch                                                                                                        | `createMicroCheckInCommands()`, `microCheckInCommands`, `MicroCheckInCommands`, `MicroCheckInCommandEnv`            |
| `command.ts`      | Shared command environment, ID/timestamp defaults, and best-effort sync-latch marking                                                                                                                         | `BaseCommandEnv`, `defaultMakeId()`, `defaultMakeTimestamp()`, `markLocalDataChanged()`        |
| `bootstrap.ts`    | The authoritative composition root: builds every persistence + sync handle (db, repositories, `pendingSyncStore`, commands, `syncService`) from ONE `AppDatabase` and returns a typed `AppServices` container | `createAppServices(db?)`, `AppServices`                                                   |

## Composition root

Long-lived persistence/sync state is assembled here, not scattered module-by-module. `createAppServices(db = createAppDatabase())` composes one database and derives the repositories, pending-sync store, commands, and an injected `syncService` from it. Callers (a test rig or the boot entry) can pass any handle an override, so features are built against a real graph while tests inject `fake-indexeddb` with no global state. Consumers may import a module singleton (e.g. `endeavourCommands`) or build their handles from this root — both resolve the same underlying `AppDatabase` instance, and the container is the one place the full graph is assembled.

## Consumers

| Consumer                                                                                                | Uses                                                   |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `src/viewmodels/useCheckInViewModel`                                                                    | `checkInCommands.recordCompletedCheckIn`               |
| `src/viewmodels/useEndeavourDetail/useGraveyard/useSwitchDomain/useEditEndeavour/useNewEndeavour` hooks | `endeavourCommands.*`                                  |
| `src/viewmodels/useMicroCheckInViewModel`                                                               | `microCheckInCommands.logToday`                        |
| `bootstrap.test.ts`                                                                                     | `createAppServices` (composition of commands + stores) |

## Testing

- `checkIn.test.ts` — `createCheckInCommands` over `fake-indexeddb` repos: atomic write, derived snapshot, latch mark, failure propagation, broken latch never fails the commit.
- `endeavour.test.ts` — the endeavour command set (create/save/close/reopen/switch) incl. latch + best-effort failure policy.
- `bootstrap.test.ts` — one shared database across every composed handle; a command write raises the durable latch on the same store.

```bash
npx vitest run --config vite.config.ts src/application
```

