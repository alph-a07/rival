import { createAction } from "@/domain/notifications/actions/base";
import type { RuntimeAction } from "@/domain/notifications/types";

export interface DriveAuthHandler {
  /** Re-consents Drive for the signed-in account. */
  onReconnect: () => void | Promise<void>;
  /** User declined reconnecting now — pause Drive sync until reconnected. */
  onDefer?: () => void | Promise<void>;
}

/** CTAs carried by a "Drive access denied" blocking modal. */
export interface DriveAuthActionPair {
  primary: RuntimeAction;
  /** Present only when the caller wired a defer handler. */
  secondary?: RuntimeAction;
}

/** Builds a reconnect action (and, when wired, a defer/cancel one) for the drive modal. */
export function createDriveAuthActions(handler: DriveAuthHandler): DriveAuthActionPair {
  const primary: RuntimeAction = createAction("reconnect-drive", "Reconnect Drive", () =>
    handler.onReconnect(),
  );

  if (!handler.onDefer) {
    return { primary };
  }
  
  const secondary: RuntimeAction = createAction(
    "defer-auth",
    "Not now",
    () => handler.onDefer!(),
    "secondary",
  );
  return { primary, secondary };
}
