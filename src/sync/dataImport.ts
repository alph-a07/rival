import { db as defaultDb, type AppDatabase } from "@/data/db";
import type { DataExport } from "./dataExport";
import { DATA_EXPORT_VERSION, exportAllData } from "./dataExport";
import { Logger } from "@/core/logging/logger";
import { Ok, Err, type Result } from "@/domain/errors/Result";
import { ErrorClassifier } from "@/domain/errors/ErrorClassifier";
import { DomainRegistry } from "@/domain/domains/domainDefinitions";
import { MICRO_MOODS } from "@/domain/models/MicroMood";
import { isInRawScoreRange, isInLevelRange } from "@/domain/checkin/rawScore";

const SUPPORTED_APP = "rival";
const SUPPORTED_VERSIONS = new Set([DATA_EXPORT_VERSION]);
const SETTINGS_KEYS = new Set(["emailNudgesEnabled", "syncStatus", "theme", "driveSyncOptIn"]);
const MOOD_VALUES = new Set<string>(MICRO_MOODS);

/** The shape reported after an import. */
interface ImportSummary {
  strategy: ImportStrategy;
  /** Rows written per table. */
  rows: {
    endeavours: number;
    checkIns: number;
    snapshots: number;
    microCheckIns: number;
    settings: number;
  };
}

/** How a backup payload is applied to the local store. */
type ImportStrategy = "replace" | "merge";
type SettingsImportPolicy = "replace" | "preserve";

interface ImportOptions {
  settings?: SettingsImportPolicy;
}

/** Applies a validated backup payload to the local store, inside a single Dexie transaction so a partial failure never leaves the DB half-restored. */
export async function importAllData(
  payload: unknown,
  strategy: ImportStrategy = "replace",
  target: AppDatabase = defaultDb,
  options: ImportOptions = {},
): Promise<Result<ImportSummary>> {
  if (!isDataExport(payload)) {
    return Err(ErrorClassifier.validation("That backup file isn't a valid rival export."));
  }

  const db = target;
  const microCheckIns = payload.microCheckIns.map((row) => ({
    ...row,
    day: row.day ?? new Date(row.timestamp).toISOString().slice(0, 10),
  }));

  try {
    await db.transaction(
      "rw",
      db.endeavours,
      db.checkIns,
      db.snapshots,
      db.microCheckIns,
      db.settings,
      async () => {
        if (strategy === "replace") {
          await Promise.all([
            db.endeavours.clear(),
            db.checkIns.clear(),
            db.snapshots.clear(),
            db.microCheckIns.clear(),
            options.settings === "replace" ? db.settings.clear() : Promise.resolve(),
          ]);
        }

        await db.endeavours.bulkPut(payload.endeavours);
        await db.checkIns.bulkPut(payload.checkIns);
        await db.snapshots.bulkPut(payload.snapshots);
        await db.microCheckIns.bulkPut(microCheckIns);

        if (options.settings === "replace") {
          await db.settings.bulkPut(payload.settings);
        }

        const written = {
          endeavours: payload.endeavours.length,
          checkIns: payload.checkIns.length,
          snapshots: payload.snapshots.length,
          microCheckIns: payload.microCheckIns.length,
          settings: payload.settings.length,
        };

        Logger.sync.info("importAllData — imported", {
          strategy,
          rows: written,
          exportedAt: payload.exportedAt,
        });
      },
    );
  } catch (e) {
    return Err(ErrorClassifier.fromDexieError(e, { entity: "DataImport", strategy }));
  }

  return Ok({
    strategy,
    rows: {
      endeavours: payload.endeavours.length,
      checkIns: payload.checkIns.length,
      snapshots: payload.snapshots.length,
      microCheckIns: payload.microCheckIns.length,
      settings: payload.settings.length,
    },
  });
}

/** Restores all data from a backup payload
 *
 * Ensures that the local store is always in a consistent state.
 * If the new payload fails to import, the original data is restored.
 */
export async function restoreAllData(
  payload: unknown,
  target: AppDatabase = defaultDb,
): Promise<Result<ImportSummary>> {
  const exportResult = await exportAllData(target);

  if (!exportResult.ok) {
    return exportResult;
  }

  const imported = await importAllData(payload, "replace", target);
  if (imported.ok) {
    return imported;
  }

  await importAllData(exportResult.value, "replace", target, { settings: "replace" });
  return imported;
}

/** Minimal structural check so we never write garbage into the IndexedDB tables. */
export function isDataExport(value: unknown): value is DataExport {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Partial<DataExport>;
  if (
    v.app !== SUPPORTED_APP ||
    typeof v.version !== "number" ||
    !SUPPORTED_VERSIONS.has(v.version) ||
    typeof v.exportedAt !== "string" ||
    Number.isNaN(Date.parse(v.exportedAt)) ||
    !isRowArray(v.endeavours, isEndeavourRow) ||
    !isRowArray(v.checkIns, isCheckInRow) ||
    !isRowArray(v.snapshots, isSnapshotRow) ||
    !isRowArray(v.microCheckIns, isMicroCheckInRow) ||
    !isRowArray(v.settings, isSettingsRow)
  ) {
    return false;
  }

  const endeavours = v.endeavours as DataExport["endeavours"];
  const checkIns = v.checkIns as DataExport["checkIns"];
  const snapshots = v.snapshots as DataExport["snapshots"];
  const microCheckIns = v.microCheckIns as DataExport["microCheckIns"];

  return (
    hasUniqueIds(endeavours) &&
    hasUniqueIds(checkIns) &&
    hasUniqueIds(snapshots) &&
    hasUniqueIds(microCheckIns) &&
    crossRepresentsValidGraph(endeavours, checkIns, snapshots) &&
    snapshots.every(
      (row) =>
        isRecord(row) &&
        typeof row.domainId === "string" &&
        DomainRegistry.all().some((domain) => domain.id === row.domainId),
    )
  );
}

/** Returns true if the given rows form a valid graph, i.e., all IDs are consistent and refer to each other correctly. */
function crossRepresentsValidGraph(
  endeavours: Array<{ id: string; domainHistory?: unknown }>,
  checkIns: Array<{ id: string; endeavourId: string }>,
  snapshots: Array<{ id: string; endeavourId: string; checkInId: string }>,
): boolean {
  const knownEndeavours = new Set(endeavours.map((e) => e.id));
  const checkInToEndeavour = new Map<string, string>();

  for (const c of checkIns) {
    checkInToEndeavour.set(c.id, c.endeavourId);
  }

  for (const e of endeavours) {
    if (!Array.isArray(e.domainHistory)) {
      return false;
    }
    // each history segment lives in a known domain, chronological + one active
    if (
      !e.domainHistory.every(
        (s) =>
          isRecord(s) &&
          typeof s.domainId === "string" &&
          DomainRegistry.all().some((d) => d.id === s.domainId) &&
          (s.endDate === null || isIsoTime(s.endDate)),
      )
    ) {
      return false;
    }
  }

  for (const c of checkIns) {
    if (!knownEndeavours.has(c.endeavourId)) {
      return false;
    }
  }

  for (const s of snapshots) {
    if (!knownEndeavours.has(s.endeavourId) || !checkInToEndeavour.has(s.checkInId)) {
      return false;
    }
    // snapshot's check-in must belong to the same endeavour as the snapshot itself
    if (checkInToEndeavour.get(s.checkInId) !== s.endeavourId) {
      return false;
    }
  }

  return true;
}

function isIsoTime(v: unknown): v is string {
  return typeof v === "string" && !Number.isNaN(Date.parse(v));
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const isTimestamp = (v: unknown): v is string =>
  typeof v === "string" && !Number.isNaN(Date.parse(v));

const hasStringId = (v: unknown): v is Record<string, unknown> & { id: string } =>
  isRecord(v) && typeof v.id === "string" && v.id.length > 0;

const isEndeavourRow = hasStringId;

const isCheckInRow = (v: unknown): v is Record<string, unknown> & { id: string } =>
  isRecord(v) &&
  hasStringId(v) &&
  typeof v.endeavourId === "string" &&
  isTimestamp(v.timestamp) &&
  Array.isArray(v.responses) &&
  typeof v.rawScore === "number" &&
  isInRawScoreRange(v.rawScore) &&
  v.responses.every(
    (response) =>
      isRecord(response) &&
      typeof response.gisId === "string" &&
      typeof response.questionId === "string" &&
      Array.isArray(response.optionIds) &&
      response.optionIds.every((optionId) => typeof optionId === "string"),
  );

const isSnapshotRow = (v: unknown): v is Record<string, unknown> & { id: string } =>
  isRecord(v) &&
  hasStringId(v) &&
  typeof v.endeavourId === "string" &&
  typeof v.checkInId === "string" &&
  isTimestamp(v.timestamp) &&
  isTimestamp(v.segmentStartDate) &&
  typeof v.domainId === "string" &&
  Number.isInteger(v.n) &&
  Number(v.n) >= 1 &&
  isInRawScoreRange(v.raw) &&
  isInLevelRange(v.level) &&
  typeof v.trend === "number" &&
  Number.isFinite(v.trend) &&
  (v.forecast === null || (typeof v.forecast === "number" && Number.isFinite(v.forecast))) &&
  (v.residual === null || (typeof v.residual === "number" && Number.isFinite(v.residual))) &&
  typeof v.consistencyStatus === "string";

const isMicroCheckInRow = (v: unknown): v is Record<string, unknown> & { id: string } =>
  isRecord(v) &&
  hasStringId(v) &&
  isTimestamp(v.timestamp) &&
  typeof v.mood === "string" &&
  MOOD_VALUES.has(v.mood);

const isSettingsRow = (v: unknown): v is Record<string, unknown> & { key: string } =>
  isRecord(v) && typeof v.key === "string" && SETTINGS_KEYS.has(v.key);

const isRowArray = <T>(v: unknown, guard: (row: unknown) => row is T): v is T[] =>
  Array.isArray(v) && v.every(guard);

const hasUniqueIds = (rows: Array<{ id: string }>): boolean =>
  new Set(rows.map((row) => row.id)).size === rows.length;
