import { createAction } from "@/domain/notifications/actions/base";
import type { RuntimeAction } from "@/domain/notifications/types";

export function createRetryAction(retry: () => void): RuntimeAction<"retry"> {
  return createAction("retry", "Retry", () => retry());
}
