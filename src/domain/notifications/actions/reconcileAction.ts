import { createAction } from "@/domain/notifications/actions/base";
import type { RuntimeAction } from "@/domain/notifications/types";

export interface ReconcileOptions {
  label?: string;
  onReconcile: () => void | Promise<void>;
  /** Fires as reconcile kicks off (e.g. to flip a busy state). */
  onStart?: () => void;
}

export function createReconcileAction(opts: ReconcileOptions): RuntimeAction<"reconcile"> {
  return createAction("reconcile", opts.label ?? "Reconcile", () => {
    opts.onStart?.();
    void opts.onReconcile();
  });
}
