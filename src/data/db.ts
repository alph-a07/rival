import type { CheckInRow } from "@/data/schema/CheckInRow";
import type { MicroCheckIn } from "@/data/schema/MicroCheckIn";
import type { SnapshotRow } from "@/data/schema/SnapshotRow";
import type { EndeavourRow } from "@/data/schema/EndeavourRow";
import type { SettingsRow } from "@/data/schema/AppSettings";
import Dexie, { type Table } from "dexie";

/**
 * Current Dexie schema version. Bump this alongside a new `.version(N).stores({...})`
 * block below when the schema changes; keep older `.version()` blocks in place
 * once a second version exists (Dexie applies migrations top-down from the
 * opener's verno), and add a `.upgrade(tx => ...)` only when a data transformation is needed.
 */
export const DATABASE_LATEST_VERSION = 1;

/** Internal Dexie adapter owning the app's IndexedDB tables. */
export class AppDatabase extends Dexie {
  endeavours!: Table<EndeavourRow, string>;
  checkIns!: Table<CheckInRow, string>;
  snapshots!: Table<SnapshotRow, string>;
  microCheckIns!: Table<MicroCheckIn, string>;
  settings!: Table<SettingsRow, string>;

  constructor() {
    super("AppDatabase");

    this.version(1).stores({
      endeavours: "id, name",
      checkIns: "id, endeavourId, timestamp",
      snapshots: "id, endeavourId, checkInId",
      microCheckIns: "id, &day, timestamp",
      settings: "key",
    });
  }
}

/** Fresh, isolated AppDatabase handle. Repos/commands compose this at tests or an app boundary. */
export function createAppDatabase(): AppDatabase {
  return new AppDatabase();
}

export const db: AppDatabase = createAppDatabase();
