import { Alert } from "@/components/alert/Alert";
import { Dialog } from "@/components/dialog/Dialog";
import { Button } from "@/components/button/Button";
import { Toast, ToastContainer } from "@/components/toast/Toast";
import { useRuntimeSnapshot, useDismissMessage } from "./react";
import { getRuntime } from "@/core/runtime/coordinator";
import { reportError } from "@/domain/errors/reporter";
import type { RuntimeAction, RuntimeMessage } from "@/domain/notifications/types";
import styles from "./RuntimeNotices.module.css";

/** Persistent non-blocking banners (offline, storage-pressure, sync-conflict needing an action, PWA update) as stacked Alerts. */
export function RuntimeNotices() {
  const { notices } = useRuntimeSnapshot();
  const dismiss = useDismissMessage();
  const banners = notices.filter((m) => m.surface.surface === "banner");

  if (banners.length === 0) {
    return null;
  }

  return (
    <div className={styles.notices} role="status" aria-live="polite">
      {banners.map((msg) => (
        <Alert
          key={msg.id}
          variant={msg.tone}
          title={msg.title}
          presentation="banner"
          action={<ActionButton msg={msg} emphasis="primary" onDismiss={dismiss} />}
        >
          {msg.body}
        </Alert>
      ))}
    </div>
  );
}

/** Transient short-lived notifications (e.g., success, error, info) as toasts. Automatically dismiss after a set time. */
export function RuntimeToasts() {
  const { notices } = useRuntimeSnapshot();
  const dismiss = useDismissMessage();
  const toasts = notices.filter((m) => m.surface.surface === "toast");

  if (toasts.length === 0) {
    return null;
  }

  return (
    <ToastContainer>
      {toasts.map((msg) => (
        <Toast
          key={msg.id}
          id={msg.id}
          variant={msg.tone}
          title={msg.title}
          message={msg.body ?? msg.title}
          onClose={dismiss}
        />
      ))}
    </ToastContainer>
  );
}

/** Renders the single arbitrated blocking message as a modal. */
export function RuntimeBlockingDialog() {
  const { blocking } = useRuntimeSnapshot();
  const dismiss = useDismissMessage();

  if (!blocking) {
    return null;
  }

  const msg = blocking;
  const actions = [
    msg.action ? { action: msg.action, as: "primary" as const } : null,
    msg.secondary ? { action: msg.secondary, as: "secondary" as const } : null,
  ].filter((x): x is { action: RuntimeAction; as: "primary" | "secondary" } => x !== null);

  return (
    <Dialog isOpen onClose={() => dismiss(msg.id)} title={msg.title} size="sm">
      {msg.body && <p>{msg.body}</p>}
      {actions.length === 0
        ? null
        : actions.map(({ action, as }) => (
            <ActionButton key={action.kind} msg={msg} emphasis={as} onDismiss={dismiss} />
          ))}
    </Dialog>
  );
}

/** Maps a runtime action to the Button variants we have. */
function ActionButton({
  msg,
  emphasis,
  onDismiss,
}: {
  msg: RuntimeMessage;
  emphasis: "primary" | "secondary";
  onDismiss: (id: string) => void;
}) {
  const action = emphasis === "primary" ? msg.action : msg.secondary;

  if (!action) {
    return null;
  }

  const variant =
    action.presentationKind === "danger"
      ? "danger"
      : emphasis === "primary"
        ? action.presentationKind === "secondary"
          ? "secondary"
          : "primary"
        : "secondary";

  return (
    <Button
      variant={variant}
      loading={msg.busy}
      size="sm"
      onClick={async () => {
        if (msg.busy) {
          return;
        }
        const runtime = getRuntime();
        runtime.bridge.setBusy(msg.id, true);
        try {
          await action.run();
          onDismiss(msg.id);
        } catch (error) {
          reportError(error, { source: `runtime.action.${action.kind}` });
        } finally {
          runtime.bridge.setBusy(msg.id, false);
        }
      }}
    >
      {action.label}
    </Button>
  );
}
