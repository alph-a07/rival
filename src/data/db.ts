import type { CheckIn } from "@/data/schema/CheckIn";
import type { Endeavour } from "@/data/schema/Endeavour";
import type { MicroCheckIn } from "@/data/schema/MicroCheckIn";
import type { Snapshot } from "@/data/schema/Snapshot";
import type { SettingsRow } from "@/data/schema/AppSettings";
import Dexie, { type Table } from "dexie";

export class AppDatabase extends Dexie {
  endeavours!: Table<Endeavour, string>;
  checkIns!: Table<CheckIn, string>;
  snapshots!: Table<Snapshot, string>;
  microCheckIns!: Table<MicroCheckIn, string>;
  settings!: Table<SettingsRow, string>;

  constructor() {
    super("AppDatabase");

    this.version(1).stores({
      endeavours: "id, name",
      checkIns: "id, endeavourId, timestamp",
      snapshots: "id, endeavourId, checkInId",
      microCheckIns: "id, timestamp",
      settings: "key",
    });
  }
}

export const db = new AppDatabase();
