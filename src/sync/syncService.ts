import { Logger } from "@/core/logging/logger";
import { settingsRepository as defaultSettings } from "@/data/repositories/SettingsRepository";
import type { SettingsRepository } from "@/data/repositories/SettingsRepository";
import { exportAllData, downloadAsJson } from "./dataExport";
import { restoreAllData } from "./dataImport";
import { exportToDrive, importFromDrive } from "./driveSync";
import { getDriveAccessToken, connectDrive } from "@/auth/auth";
import { driveTokenStore } from "@/auth/driveToken";
import { getRuntime } from "@/core/runtime/coordinator";
import { reportError, notifyDirect } from "@/domain/errors/reporter";
import { pushDriveSyncOptIn } from "@/auth/driveWorkerClient";
import { pendingSyncStore as defaultPendingSync } from "./pendingSync";
import type { PendingSyncStore } from "./pendingSync";

/** Public interface for the Drive sync service. */
export interface SyncService {
  /** Uploads a fresh backup to Drive. */
  syncDrive(): Promise<void>;
  /** Re-consents Drive for the signed-in account, resuming a paused state. */
  reconnectDrive(): Promise<void>;
  /** Pauses Drive sync until it is reconnected. */
  pauseDrive(): Promise<void>;
  /** Restores the local store from the Drive backup. */
  restoreFromDrive(): Promise<void>;
  /** Restores the local store from a user-picked backup file. */
  restoreFromFile(file: File): Promise<void>;
  /** Downloads the local store as a JSON file. */
  exportLocal(): Promise<void>;
}

export interface SyncServiceEnv {
  settingsRepository?: SettingsRepository;
  pendingSync?: PendingSyncStore;
}

/** Creates the Drive sync orchestration for the injected (or default) stores. */
export function createSyncService(env: SyncServiceEnv = {}): SyncService {
  const settings = env.settingsRepository ?? defaultSettings;
  const pendingSync = env.pendingSync ?? defaultPendingSync;

  /** Records the user's last-known Drive opt-in locally and best-effort to D1. */
  const setDriveOptIn = async (optIn: boolean): Promise<void> => {
    await settings.setDriveSyncOptIn(optIn);
    await pushDriveSyncOptIn(optIn);
    getRuntime().setDriveSyncEnabled(optIn);
  };

  async function syncDrive(): Promise<void> {
    const current = await settings.get();

    if (current.ok && current.value.syncStatus === "auth_required") {
      Logger.sync.debug("syncService.syncDrive — skipping because Drive is paused");
      return; // drive paused pending reconnect
    }

    await settings.setSyncStatus("syncing");
    await pendingSync.recordSyncStarted();

    const data = await exportAllData();
    if (!data.ok) {
      await settings.setSyncStatus("error");
      reportError(data.error, { source: "sync.syncDrive", retry: () => void syncDrive() });
      return;
    }

    const result = await exportToDrive(getDriveToken, data.value);

    if (!result.ok) {
      if (result.error.kind === "sync-conflict") {
        Logger.sync.debug("syncService.syncDrive — conflict detected; raising syncConflict event");

        await settings.setSyncStatus("error");
        await pendingSync.recordSyncFailed("sync-conflict");
        getRuntime().raiseSyncConflict({ body: result.error.message });
        return;
      }

      const error = result.error.kind === "auth-denied" ? "auth_required" : "error";
      await settings.setSyncStatus(error);
      await pendingSync.recordSyncFailed(result.error.kind);
      reportError(result.error, { source: "sync.syncDrive", retry: () => void syncDrive() });
      return;
    }

    await settings.setSyncStatus("connected");
    await pendingSync.recordSyncSucceeded();
    notifyDirect({
      surface: { surface: "toast" },
      tone: "info",
      title: "Synced to Drive",
      body: "Your backup is up to date.",
    });
  }

  async function restoreFromDrive(): Promise<void> {
    const download = await importFromDrive(getDriveToken);
    if (!download.ok) {
      reportError(download.error, {
        source: "sync.restoreFromDrive",
        retry: () => void restoreFromDrive(),
      });

      return;
    }

    const applied = await restoreAllData(download.value);
    if (!applied.ok) {
      reportError(applied.error, {
        source: "sync.restoreFromDrive",
        retry: () => void restoreFromDrive(),
      });
    }
  }

  async function reconnectDrive(): Promise<void> {
    await settings.setSyncStatus("syncing");
    try {
      await connectDrive();
      await setDriveOptIn(true);
    } catch (error) {
      await settings.setSyncStatus("auth_required");
      reportError(error, { source: "sync.reconnectDrive" });
      return;
    }

    await settings.setSyncStatus("connected");
  }

  async function pauseDrive(): Promise<void> {
    await settings.setSyncStatus("auth_required");
  }

  async function restoreFromFile(file: File): Promise<void> {
    try {
      const payload = JSON.parse(await file.text()) as unknown;
      const result = await restoreAllData(payload);
      if (!result.ok) {
        reportError(result.error, { source: "sync.restoreFromFile" });
      }
    } catch (err) {
      reportError(err, { source: "sync.restoreFromFile" });
    }
  }

  async function exportLocal(): Promise<void> {
    const result = await exportAllData();
    if (result.ok) {
      downloadAsJson(result.value);
    } else {
      reportError(result.error, { source: "sync.exportLocal" });
    }
  }

  Logger.sync.debug("syncService — created");

  return { syncDrive, restoreFromDrive, restoreFromFile, exportLocal, reconnectDrive, pauseDrive };
}

const getDriveToken = async (): Promise<{ token: string; invalidate: () => void }> => ({
  token: await getDriveAccessToken(),
  invalidate: () => driveTokenStore.clear(),
});

/** App-wide singleton backing the viewmodel/UI path. */
export const syncService = createSyncService();
