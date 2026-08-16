import type { LogLevel } from "./config";

/** A unique identifier for a logging category. */
export type CategoryId =
  | "behavior"
  | "checkIn"
  | "sync"
  | "storage"
  | "network"
  | "auth"
  | "ui"
  | "navigation"
  | "performance"
  | "analytics";

/** Definition for a logging category.
 * @param id Unique identifier for the category.
 * @param tag Short human-readable tag prefixed onto every line.
 * @param icon Optional icon/emoji to make the stream scannable.
 * @param minLevel Optional per-category minimum level; falls back to the global default.
 */
export interface CategoryDefinition {
  id: CategoryId;
  tag: string;
  icon?: string;
  minLevel?: LogLevel;
}

/** All logging categories in the system, keyed by their unique identifier. */
export const CATEGORIES: Record<CategoryId, CategoryDefinition> = {
  behavior: {
    id: "behavior",
    tag: "Behavior",
    icon: "🧠",
    minLevel: "DEBUG",
  },
  checkIn: { id: "checkIn", tag: "CheckIn", icon: "📋" },
  sync: { id: "sync", tag: "Sync", icon: "🔄" },
  storage: { id: "storage", tag: "Storage", icon: "💾" },
  network: { id: "network", tag: "Network", icon: "🌐" },
  auth: { id: "auth", tag: "Auth", icon: "🔐" },
  ui: { id: "ui", tag: "UI", icon: "🖼️" },
  navigation: { id: "navigation", tag: "Nav", icon: "🧭" },
  performance: { id: "performance", tag: "Perf", icon: "⚡" },
  analytics: { id: "analytics", tag: "Analytics", icon: "📈" },
};
