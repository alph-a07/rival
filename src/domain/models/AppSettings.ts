import type { Theme } from "@/theme/ThemeContext";

/** The sync connection state surfaced on the Settings screen. */
export type SyncStatus = "connected" | "disconnected" | "syncing" | "error";

/**
 * User preferences persisted via the Settings screen.
 * Stored as a typed key-value set in Dexie so it survives reloads (and can be exported/synced to Drive).
 */
export interface AppSettings {
  emailNudgesEnabled: boolean;
  syncStatus: SyncStatus;
  theme: Theme;
}
