import type { CheckIn } from "@/domain/models/CheckIn";
import type { Endeavour } from "@/domain/models/Endeavour";
import type { Snapshot } from "@/domain/models/Snapshot";
import Dexie, { type Table } from "dexie";

export class AppDatabase extends Dexie {
  endeavours!: Table<Endeavour, string>;
  checkIns!: Table<CheckIn, string>;
  snapshots!: Table<Snapshot, string>;

  constructor() {
    super("AppDatabase");

    this.version(1).stores({
      endeavours: "id, name",
      checkIns: "id, endeavourId, timestamp",
      snapshots: "id, endeavourId, checkInId",
    });
  }
}

export const db = new AppDatabase();
