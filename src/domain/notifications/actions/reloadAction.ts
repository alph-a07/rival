import { createAction } from "@/domain/notifications/actions/base";
import type { RuntimeAction } from "@/domain/notifications/types";

export function createReloadAction(): RuntimeAction<"reload"> {
  return createAction("reload", "Reload", () => window.location.reload());
}
