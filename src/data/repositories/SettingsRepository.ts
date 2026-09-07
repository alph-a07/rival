import { db as defaultDb, type AppDatabase } from "@/data/db";
import { SYNC_STATUSES } from "@/data/schema/AppSettings";
import type { AppSettings, SettingsRow, SyncStatus } from "@/data/schema/AppSettings";
import type { Theme } from "@/theme/ThemeContext";
import { THEMES } from "@/theme/ThemeContext";
import { Logger } from "@/core/logging/logger";
import { Ok, Err, type Result } from "@/domain/errors/Result";
import { ErrorClassifier } from "@/domain/errors/ErrorClassifier";
import { crossTabBus } from "@/core/runtime/crossTab";

/** Fallback values used before any preference has been persisted. */
export const DEFAULT_SETTINGS: AppSettings = {
  emailNudgesEnabled: false,
  syncStatus: "disconnected",
  theme: "dark",
  driveSyncOptIn: false,
};

/** Data-access surface for persisted settings. A handle, not a class. */
export interface SettingsRepository {
  get(): Promise<Result<AppSettings>>;
  setEmailNudgesEnabled(enabled: boolean): Promise<Result<void>>;
  setSyncStatus(status: SyncStatus): Promise<Result<void>>;
  setDriveSyncOptIn(optIn: boolean): Promise<Result<void>>;
  setTheme(theme: Theme): Promise<Result<void>>;
}

/** Creates a settings repository against a Dexie database. */
export function createSettingsRepository(db: AppDatabase = defaultDb): SettingsRepository {
  async function set(key: string, value: unknown): Promise<Result<void>> {
    try {
      await db.settings.put({ key, value } satisfies SettingsRow);
      crossTabBus.post("app:data-changed", { changedAt: Date.now() });
      Logger.storage.debug("SettingsRepository.set", { key, value });
      return Ok(undefined);
    } catch (e) {
      return Err(ErrorClassifier.fromDexieError(e, { entity: "Settings", key }));
    }
  }

  return {
    async get() {
      try {
        const rows = await db.settings.toArray();
        const values = rows.reduce<Record<string, unknown>>((acc, row) => {
          acc[row.key] = row.value;
          return acc;
        }, {});

        const syncStatus = SYNC_STATUSES.includes(values.syncStatus as SyncStatus)
          ? (values.syncStatus as SyncStatus)
          : DEFAULT_SETTINGS.syncStatus;

        const theme = THEMES.includes(values.theme as Theme)
          ? (values.theme as Theme)
          : DEFAULT_SETTINGS.theme;

        if (values.syncStatus !== undefined && values.syncStatus !== syncStatus) {
          Logger.storage.warn("SettingsRepository.get — unknown syncStatus, fell back", {
            raw: values.syncStatus,
            fallback: syncStatus,
          });
        }

        if (values.theme !== undefined && values.theme !== theme) {
          Logger.storage.warn("SettingsRepository.get — unknown theme, fell back", {
            raw: values.theme,
            fallback: theme,
          });
        }

        return Ok({
          emailNudgesEnabled:
            typeof values.emailNudgesEnabled === "boolean"
              ? values.emailNudgesEnabled
              : DEFAULT_SETTINGS.emailNudgesEnabled,
          syncStatus,
          theme,
          driveSyncOptIn:
            typeof values.driveSyncOptIn === "boolean"
              ? values.driveSyncOptIn
              : DEFAULT_SETTINGS.driveSyncOptIn,
        });
      } catch (e) {
        return Err(ErrorClassifier.fromDexieError(e, { entity: "Settings" }));
      }
    },

    setEmailNudgesEnabled(enabled) {
      return set("emailNudgesEnabled", enabled);
    },

    setSyncStatus(status) {
      return set("syncStatus", status);
    },

    setDriveSyncOptIn(optIn) {
      return set("driveSyncOptIn", optIn);
    },

    setTheme(theme) {
      return set("theme", theme);
    },
  };
}

/** App-wide singleton instance backing the hooks/UI path. */
export const settingsRepository: SettingsRepository = createSettingsRepository();
