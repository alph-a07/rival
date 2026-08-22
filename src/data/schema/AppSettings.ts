import type { Theme } from "@/theme/ThemeContext";

/** The sync connection state surfaced on the Settings screen. */
export type SyncStatus = "connected" | "disconnected" | "syncing" | "error";

/** User preferences persisted via the Settings screen. */
export interface AppSettings {
  emailNudgesEnabled: boolean;
  syncStatus: SyncStatus;
  theme: Theme;
}

/** The storage shape of a generic `settings` key-value row. */
export interface SettingsRow {
  key: string;
  value: unknown;
}
