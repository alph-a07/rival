import type { ActionKind, RuntimeAction } from "@/domain/notifications/types";

/**
 * Builds a `RuntimeAction` with a fixed kind, defaulting to the `primary` tone.
 * The returned action carries its specific kind in the type, so callers get a narrowed, closed-set action rather than a free-form literal.
 */
export function createAction<Kind extends ActionKind>(
  kind: Kind,
  label: string,
  run: () => void,
  presentationKind: RuntimeAction["presentationKind"] = "primary",
): RuntimeAction<Kind> {
  return { kind, label, presentationKind, run };
}
