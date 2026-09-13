import { createAppDatabase, type AppDatabase } from "@/data/db";
import {
  createSettingsRepository,
  type SettingsRepository,
} from "@/data/repositories/SettingsRepository";
import {
  createEndeavourRepository,
  type EndeavourRepository,
} from "@/data/repositories/EndeavourRepository";
import {
  createCheckInRepository,
  type CheckInRepository,
} from "@/data/repositories/CheckInRepository";
import {
  createSnapshotRepository,
  type SnapshotRepository,
} from "@/data/repositories/SnapshotRepository";
import {
  createMicroCheckInRepository,
  type MicroCheckInRepository,
} from "@/data/repositories/MicroCheckInRepository";
import { createPendingSyncStore, type PendingSyncStore } from "@/sync/pendingSync";
import { createSyncService, type SyncService, type SyncServiceEnv } from "@/sync/syncService";
import { createEndeavourCommands, type EndeavourCommands } from "./endeavour";
import { createCheckInCommands, type CheckInCommands } from "./checkIn";
import { createMicroCheckInCommands, type MicroCheckInCommands } from "./microCheckIn";

/** The full set of app services, including repositories, commands, and sync. */
export interface AppServices {
  db: AppDatabase;
  settingsRepository: SettingsRepository;
  endeavourRepository: EndeavourRepository;
  checkInRepository: CheckInRepository;
  snapshotRepository: SnapshotRepository;
  microCheckInRepository: MicroCheckInRepository;
  pendingSyncStore: PendingSyncStore;
  endeavourCommands: EndeavourCommands;
  checkInCommands: CheckInCommands;
  microCheckInCommands: MicroCheckInCommands;
  syncService: SyncService;
}

/** Builds the full set of app handles against one (optionally injected) database. */
export function createAppServices(db: AppDatabase = createAppDatabase()): AppServices {
  const settingsRepository = createSettingsRepository(db);
  const snapshotRepository = createSnapshotRepository(db);
  const checkInRepository = createCheckInRepository(db, snapshotRepository);
  const endeavourRepository = createEndeavourRepository(db, snapshotRepository);
  const microCheckInRepository = createMicroCheckInRepository(db);
  const pendingSyncStore = createPendingSyncStore(db);
  const endeavourCommands = createEndeavourCommands({
    repository: endeavourRepository,
    markLocalDataChanged: () => pendingSyncStore.markDirty(),
  });
  const checkInCommands = createCheckInCommands({
    repository: checkInRepository,
    markLocalDataChanged: () => pendingSyncStore.markDirty(),
  });
  const microCheckInCommands = createMicroCheckInCommands({
    repository: microCheckInRepository,
    markLocalDataChanged: () => pendingSyncStore.markDirty(),
  });
  const syncEnv: SyncServiceEnv = { settings: settingsRepository, pendingSync: pendingSyncStore };
  const syncService = createSyncService(syncEnv);

  return {
    db,
    settingsRepository,
    endeavourRepository,
    checkInRepository,
    snapshotRepository,
    microCheckInRepository,
    pendingSyncStore,
    endeavourCommands,
    checkInCommands,
    microCheckInCommands,
    syncService,
  };
}
