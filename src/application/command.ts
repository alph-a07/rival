import { Logger } from "@/core/logging/logger";

export interface BaseCommandEnv {
  markLocalDataChanged(): Promise<unknown>;
  makeId?(): string;
  makeTimestamp?(): string;
}

export function defaultMakeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function defaultMakeTimestamp(): string {
  return new Date().toISOString();
}

export async function markLocalDataChanged(env: BaseCommandEnv): Promise<void> {
  try {
    await env.markLocalDataChanged();
  } catch {
    Logger.sync.warn("Failed to mark local data as changed; this will be retried on next sync.");
  }
}
