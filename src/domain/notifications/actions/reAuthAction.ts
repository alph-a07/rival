import { createAction } from "@/domain/notifications/actions/base";
import type { RuntimeAction } from "@/domain/notifications/types";

export function createReAuthAction(reconnect: () => void | Promise<void>): RuntimeAction<"re-auth"> {
  return createAction("re-auth", "Sign in", () => void reconnect());
}
