import { db } from "@/data/db";
import { Logger } from "@/core/logging/logger";
import { Ok, Err, type Result } from "@/domain/errors/Result";
import { ErrorClassifier } from "@/domain/errors/ErrorClassifier";
import type { EndeavourRow } from "@/data/schema/EndeavourRow";
import type { CheckInRow } from "@/data/schema/CheckInRow";
import type { SnapshotRow } from "@/data/schema/SnapshotRow";
import type { MicroCheckIn } from "@/data/schema/MicroCheckIn";
import type { SettingsRow } from "@/data/schema/AppSettings";
import type { AppDatabase } from "@/data/db";

/** Current version of the portable {@link DataExport} file format. */
export const DATA_EXPORT_VERSION = 1;

/** A full, portable snapshot of every table in the app's IndexedDB store. */
export interface DataExport {
  exportedAt: string;
  app: string;
  version: number;
  endeavours: EndeavourRow[];
  checkIns: CheckInRow[];
  snapshots: SnapshotRow[];
  microCheckIns: MicroCheckIn[];
  settings: SettingsRow[];
}

/**
 * Reads every table into a plain-JSON-friendly object.
 * Used both for local download and for Drive backup/sync.
 */
export async function exportAllData(target: AppDatabase = db): Promise<Result<DataExport>> {
  try {
    const [endeavours, checkIns, snapshots, microCheckIns, settings] = await target.transaction(
      "r",
      target.endeavours,
      target.checkIns,
      target.snapshots,
      target.microCheckIns,
      target.settings,
      async () =>
        Promise.all([
          target.endeavours.toArray(),
          target.checkIns.toArray(),
          target.snapshots.toArray(),
          target.microCheckIns.toArray(),
          target.settings.toArray(),
        ]),
    );

    Logger.sync.info("exportAllData — computed payload", {
      endeavours: endeavours.length,
      checkIns: checkIns.length,
      snapshots: snapshots.length,
      microCheckIns: microCheckIns.length,
      settings: settings.length,
    });

    return Ok({
      exportedAt: new Date().toISOString(),
      app: "rival",
      version: DATA_EXPORT_VERSION,
      endeavours,
      checkIns,
      snapshots,
      microCheckIns,
      settings,
    });
  } catch (e) {
    return Err(ErrorClassifier.fromDexieError(e, { entity: "DataExport" }));
  }
}

/** Triggers a local download of the given payload as a JSON file. */
export function downloadAsJson(payload: unknown, filename = "rival-backup.json"): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}
