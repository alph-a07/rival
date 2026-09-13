# Rival — Engineering Conventions

Context for AI agents working in this repository. Read fully before touching code.

## Stack

- **App**: React 19 + TypeScript (strict, `verbatimModuleSyntax`), Vite, Dexie (IndexedDB), react-router.
- **Workers**: separate Cloudflare Worker package (`workers/`, Hono + D1) — its own deployable, its own `package.json`/tests.
- **Commands**: `npm run check` (typecheck + lint + stylelint + format) is the gate. `npm run test`, `npm run build`.

## Architecture — one-way dependency layering

```
domain (pure, no React/DOM/browser)
  → data · auth · sync (persistence / integrations)
  → core (env, logging, runtime infra)
  → shells (React shells + runtime bindings) · components (UI primitives) · design-system (tokens/icons)
  → viewmodels (pure contracts + use* hooks)
  → screens / routes
```

- `domain` = pure product knowledge (math, reasoning, error/notification vocabulary). No React, no browser APIs, no `data` imports. Imports only itself + `@/core/logging`.
- `data` = persistence (Dexie). `auth` = Google identity + Drive session. `sync` = Drive backup. `core` = framework-free infra. `components` = UI primitives. `design-system` = tokens + icons + docs site. `shells` = React shells + runtime React bindings. `viewmodels` = screen contracts + `use*` hooks.
- **Never import upward**: `domain` never imports `data`/`auth`/`sync`/`shells`; `data` never imports `auth`/`sync`/`shells`; `core/runtime` never imports `shells`. Circular imports across packages are a bug.
- **Browser-env contracts** (`ConnectivityEnv`, `StorageProvider`) live in `core/runtime`, not `domain`.

## Code conventions (mandatory)

- **No barrel `index.ts`.** Every import is a deep path (`@/domain/errors/reporter`, not `@/domain/errors`). A directory may not re-export its members.
- **No `class` in public surfaces.** Long-lived stateful modules are `createX(...)` factories returning a handle. Stateless pure logic = plain exported functions. `class` is allowed only for private internal state (e.g. React error boundaries).
- **One-way imports via `@/*` alias only.** Relative imports crossing a directory boundary are lint-forbidden.
- **Single source of responsibility.** Each package/file owns exactly one concern. Don't duplicate a type, a mapping, or a helper that already exists — import it from its owner.
- **Deep-import entry points, never barrels; every package documents itself in `ARCHITECTURE.md`.**
- **Structural coherence over mechanical uniformity.** Different layers may use different shapes, but equivalent responsibilities must have the same ownership boundary. Persistent features should follow `domain rules -> data query/repository -> application command -> pure viewmodel derivation -> React hook -> screen`.
- **Queries stay below viewmodels.** Hooks may subscribe with `useLiveQuery`, but the callback must call a data-owned query/repository handle. Do not import Dexie tables directly into feature hooks.
- **Commands own atomicity.** A user-visible operation that changes multiple records or settings belongs in an application/service command with one transaction or explicit workflow boundary. Hooks should not sequence repository writes that claim to be one action.
- **One owner per state value.** Persistent state belongs to data repositories, cross-feature state to services/runtime, screen state to hooks, and render-only state to screens. Do not mirror the same lifecycle in multiple layers.
- **Error contract by boundary.** Expected storage/integration failures become `Result<AppError>` before reaching a hook. Use inline state for field validation, the runtime reporter for recoverable global failures, and `notifyDirect` for intentional success/information. Do not expose raw `Error.message` as product copy.
- **Empty is not unavailable.** Preserve loading, empty, and unavailable states separately; never convert a failed read into `[]` unless the caller explicitly documents that loss of information.
- **Composition is explicit.** Stateful modules use `createX()` handles and are composed at an application boundary. Module singletons are allowed only for intentionally process-wide state and should not become hidden dependency injection. The canonical persistence/sync graph is `application/bootstrap.ts` → `createAppServices(db?)` (db → repos → pending-sync store → commands → sync service); build new long-lived handles there.
- **Storage rows are DTOs, not domain models.** Persistence and exports use `data/schema/*Row` types (`EndeavourRow`, `CheckInRow`, `SnapshotRow`) with `*ToRow`/`rowTo*` mappers at the repository edge. Domain models never cross into Dexie tables or `DataExport` payloads. Mappers deep-copy nested arrays/records so a stored row can never alias a live domain value.
- **Derived numbers carry provenance.** A `Snapshot` stamps `calcVersion` from `domain/config/versions.ts`. When a rule set, scoring algorithm, or tuning constant that derives persisted numbers changes, bump the corresponding version label so stale records are detectable.
- **Invariants are single-sourced and enforced at the boundary.** Raw/level scores are derived-only and finite in `0..100` (`domain/checkin/rawScore`); import validation re-checks them (`sync/dataImport`). Never introduce a second, weaker copy of a boundary guard.
- **DB migrations are append-only.** Each schema change is a new Dexie `version(N)` block with its own upgrade test (`data/migrations/migrationPolicy.ts`); never edit an old `version()` block.
- **External data is validated once.** Validate imports, HTTP payloads, IDs, timestamps, enum values, and references at the boundary, then rely on typed domain commands internally. Add contract tests when browser and Worker representations must agree.
- **Names describe the boundary.** A symbol/file should reveal whether it is a pure derivation, query, command, integration client, facade, route shell, or visual primitive. Avoid generic parent files and competing canonical symbols.

## Comment policy (strict)

- **No explanatory/justification comments.** Do not narrate what code does (`// increment counter`) or why you chose an approach (`// because X`). This includes "gap #N" milestone notes, "Mirrors scratch/ARCHITECTURE.md §N" markers, and restated-prose blocks over functions.
- **Allowed:** minimal tsDoc on exported public API (`/** What it is. */` — one or two lines), and comments on genuinely complex/non-obvious algorithms (math, async races, clever invariants). When in doubt, delete the comment.
- Existing files may contain legacy justification comments; do not add new ones. Prefer self-documenting names over comments.

## Naming

- Functions: verb-first (`buildSnapshotFromCheckIn`, `evaluateBeliefs`, `createSyncService`). Factories: `createX`. One-shot boot hooks: `installX` (returns cleanup fn).
- Types: PascalCase nouns. Prefer a discriminated union over boolean flags + null.
- File names: kebab-case for multi-word modules (`dataImport.ts`, `driveWorkerClient.ts`).

## Testing (TDD)

- Tests live beside code: `foo.test.ts`. Vitest + fake-indexeddb for `data`; pure unit tests for `domain`; workers has its own vitest config.
- **TDD default**: write the failing test first, then the implementation. Every behavior change ships with its test.
- `npm run test` must be green before done. `npm run check` must pass.
- Per-package suites exist so a change stays scoped: `npm run test:domain|data|sync|auth|application|core|viewmodels|worker`. When tests land in a package with no suite yet, extend those scripts.

## Documentation

- `ARCHITECTURE.md` files describe the system as they stand. They contain no
  progress/roadmap language (`Resolved`, `gap #N`, backlogs, todo notes) — describe behavior in the present tense.
- The root `ARCHITECTURE.md` is the two-way file index (file → purpose →
  connections and purpose → file); package docs own package-specific depth.   Keep both current when code moves.

## UX

- All user-facing copy is already-friendly plain language. Errors surface through the runtime funnel (`reportError` / `notifyDirect`), never raw `Error.message`.
- One blocking modal at a time (arbitrated). Banners for persistent states, toasts for transient ones. Feedback goes through `domain/notifications`, never ad-hoc UI.

