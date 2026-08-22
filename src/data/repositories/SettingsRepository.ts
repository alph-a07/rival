import { db as defaultDb } from "@/data/db";
import type { AppDatabase } from "@/data/db";
import { SYNC_STATUSES } from "@/data/schema/AppSettings";
import type { AppSettings, SettingsRow, SyncStatus } from "@/data/schema/AppSettings";
import type { Theme } from "@/theme/ThemeContext";
import { THEMES } from "@/theme/ThemeContext";
import { Logger } from "@/core/logging/logger";

/** Fallback values used before any preference has been persisted. */
export const DEFAULT_SETTINGS: AppSettings = {
  emailNudgesEnabled: false,
  syncStatus: "disconnected",
  theme: "dark",
};

/**
 * Persists user preferences as typed key-value rows in Dexie so Settings state survives reloads and can be included in Drive export/sync.
 *
 * A generic table also gives the rest of the app a place to store lightweight app state.
 */
export class SettingsRepository {
  private readonly db: AppDatabase;

  constructor(db: AppDatabase = defaultDb) {
    this.db = db;
  }

  async get(): Promise<AppSettings> {
    const rows = await this.db.settings.toArray();
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

    return {
      emailNudgesEnabled:
        typeof values.emailNudgesEnabled === "boolean"
          ? values.emailNudgesEnabled
          : DEFAULT_SETTINGS.emailNudgesEnabled,
      syncStatus,
      theme,
    };
  }

  private async set(key: string, value: unknown): Promise<void> {
    await this.db.settings.put({ key, value } satisfies SettingsRow);
    Logger.storage.debug("SettingsRepository.set", { key, value });
  }

  async setEmailNudgesEnabled(enabled: boolean): Promise<void> {
    await this.set("emailNudgesEnabled", enabled);
  }

  async setSyncStatus(status: SyncStatus): Promise<void> {
    await this.set("syncStatus", status);
  }

  async setTheme(theme: Theme): Promise<void> {
    await this.set("theme", theme);
  }
}

/** App-wide singleton instance backing the hooks/UI path. */
export const settingsRepository = new SettingsRepository();
