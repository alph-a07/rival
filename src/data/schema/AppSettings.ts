import type { Theme } from "@/theme/ThemeContext";

/** Canonical sync connection states surfaced on the Settings screen. */
export const SYNC_STATUSES = [
  "connected",
  "disconnected",
  "syncing",
  "error",
  "auth_required",
] as const;

/** The sync connection state surfaced on the Settings screen. */
export type SyncStatus = (typeof SYNC_STATUSES)[number];

/** User preferences persisted via the Settings screen. */
export interface AppSettings {
  emailNudgesEnabled: boolean;
  syncStatus: SyncStatus;
  theme: Theme;
  driveSyncOptIn: boolean;
}

/** The storage shape of a generic `settings` key-value row. */
export interface SettingsRow {
  key: string;
  value: unknown;
}
