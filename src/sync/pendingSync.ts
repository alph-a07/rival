import { db as defaultDb, type AppDatabase } from "@/data/db";
import type { SettingsRow } from "@/data/schema/AppSettings";
import { Logger } from "@/core/logging/logger";
import { Ok, Err, type Result } from "@/domain/errors/Result";
import { ErrorClassifier } from "@/domain/errors/ErrorClassifier";

export const PENDING_SYNC_KEY = "syncQueue";

/** A snapshot of the current sync state. */
export interface SyncDiagnostics {
  /** A local change is waiting to be pushed to Drive. */
  pending: boolean;
  /** Monotonic local revision; bumps on every mark, so consumers drop stale marks. */
  revision: number;
  /** When the pending latch was first raised (ISO), or null when idle. */
  pendingSince: string | null;
  /** Attempts since the latch was raised. */
  attempts: number;
  /** When the last sync attempt finished (ISO), or null if never. */
  lastAttemptAt: string | null;
  /** When the last push confirmed clean (ISO), or null if never. */
  syncedAt: string | null;
  /** Error kind from the last failed push, or null. */
  lastErrorKind: string | null;
  /** When the last push failed (ISO), or null. */
  lastErrorAt: string | null;
}

/** A store for managing the pending sync state. */
export interface PendingSyncStore {
  /** Raise the durable pending latch after a local commit. */
  markDirty(now?: string): Promise<Result<void>>;
  /** Record that a flush attempt is starting. */
  recordSyncStarted(now?: string): Promise<Result<void>>;
  /** Clear the latch and record a successful push. */
  recordSyncSucceeded(now?: string): Promise<Result<void>>;
  /** Keep `pending` true and record the failure kind + time for recovery surfaces. */
  recordSyncFailed(errorKind: string, now?: string): Promise<Result<void>>;
  /** Drop the latch (Drive disabled / intentional stop). */
  clear(): Promise<Result<void>>;
  /** Current diagnostics; falls back to idle on a corrupt row. */
  snapshot(): Promise<Result<SyncDiagnostics>>;
}

/** Creates the durable pending-sync store against a Dexie database. */
export function createPendingSyncStore(db: AppDatabase = defaultDb): PendingSyncStore {
  async function read(): Promise<SyncDiagnostics> {
    const row = await db.settings.get(PENDING_SYNC_KEY);
    return row ? toDiagnostics(row.value) : IDLE;
  }

  async function write(value: SyncDiagnostics): Promise<Result<void>> {
    try {
      await db.settings.put({ key: PENDING_SYNC_KEY, value } satisfies SettingsRow);
      Logger.sync.debug("pendingSync.write", { pending: value.pending });
      return Ok(undefined);
    } catch (e) {
      return Err(ErrorClassifier.fromDexieError(e, { entity: "PendingSync" }));
    }
  }

  return {
    async markDirty(now) {
      const current = await read();
      const stamp = iso(now);

      return write({
        ...current,
        pending: true,
        pendingSince: current.pendingSince ?? stamp,
        revision: current.revision + 1,
      });
    },

    async recordSyncStarted(now) {
      const current = await read();
      return write({ ...current, attempts: current.attempts + 1, lastAttemptAt: iso(now) });
    },

    async recordSyncSucceeded(now) {
      const current = await read();
      const stamp = iso(now);
      return write({
        pending: false,
        revision: current.revision,
        pendingSince: null,
        attempts: 0,
        lastAttemptAt: current.lastAttemptAt,
        syncedAt: stamp,
        lastErrorKind: null,
        lastErrorAt: null,
      });
    },

    async recordSyncFailed(errorKind, now) {
      const current = await read();
      return write({
        ...current,
        pending: true,
        lastErrorKind: errorKind,
        lastErrorAt: iso(now),
      });
    },

    async clear() {
      const current = await read();
      return write({ ...IDLE, revision: current.revision });
    },

    snapshot: () => read().then(Ok),
  };
}

/** Guards a stored row into the diagnostics shape, tolerant of older/corrupt data. */
function toDiagnostics(value: unknown): SyncDiagnostics {
  if (!isRecord(value)) {
    return IDLE;
  }

  return {
    pending: value.pending === true,
    revision: isCount(value.revision) ? value.revision : 0,
    pendingSince: isIsoDate(value.pendingSince) ? value.pendingSince : null,
    attempts: isCount(value.attempts) ? value.attempts : 0,
    lastAttemptAt: isIsoDate(value.lastAttemptAt) ? value.lastAttemptAt : null,
    syncedAt: isIsoDate(value.syncedAt) ? value.syncedAt : null,
    lastErrorKind: typeof value.lastErrorKind === "string" ? value.lastErrorKind : null,
    lastErrorAt: isIsoDate(value.lastErrorAt) ? value.lastErrorAt : null,
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const isIsoDate = (v: unknown): v is string =>
  typeof v === "string" && !Number.isNaN(Date.parse(v));

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const iso = (now?: string): string => now ?? new Date().toISOString();

const IDLE: SyncDiagnostics = {
  pending: false,
  revision: 0,
  pendingSince: null,
  attempts: 0,
  lastAttemptAt: null,
  syncedAt: null,
  lastErrorKind: null,
  lastErrorAt: null,
};

/** App-wide singleton backing the composition boundary / background flush. */
export const pendingSyncStore = createPendingSyncStore();
