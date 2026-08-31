import { createAction } from "@/domain/notifications/actions/base";
import type { RuntimeAction } from "@/domain/notifications/types";

export function createEnableSyncAction(enable: () => void): RuntimeAction<"enable-sync"> {
  return createAction("enable-sync", "Enable Drive sync", () => enable());
}
