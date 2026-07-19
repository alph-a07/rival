import type { CheckIn } from "@/domain/models/CheckIn";
import type { Domain } from "@/domain/models/Domain";
import type { Endeavour } from "@/domain/models/Endeavour";
import type { Gis } from "@/domain/models/Gis";
import type { Snapshot } from "@/domain/models/Snapshot";
import Dexie, { type Table } from "dexie";

export class AppDatabase extends Dexie {
  endeavours!: Table<Endeavour, string>;
  checkIns!: Table<CheckIn, string>;
  domains!: Table<Domain, string>;
  gises!: Table<Gis, string>;
  snapshots!: Table<Snapshot, string>;

  constructor() {
    super("AppDatabase");

    this.version(1).stores({
      endeavours: "id, name",
      checkIns: "id, endeavourId, timestamp",
      domains: "id",
      gises: "id",
      snapshots: "id, endeavourId, checkInId",
    });
  }
}

export const db = new AppDatabase();
