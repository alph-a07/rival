import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { Alert } from "@/components/alert/Alert";
import { Toast, ToastContainer } from "@/components/toast/Toast";
import { Button } from "@/components/button/Button";
import { useState } from "react";

interface AlertToastState {
  variant: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
}

const ToastPlaygroundDemo = ({ state }: { state: AlertToastState }) => {
  const [toasts, setToasts] = useState<
    { id: string; variant: any; title: string; message: string }[]
  >([]);

  const triggerToast = () => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, ...state }]);
  };

  return (
    <>
      <Button onClick={triggerToast}>Trigger Toast</Button>
      <ToastContainer>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            variant={toast.variant}
            title={toast.title}
            message={toast.message}
            onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
          />
        ))}
      </ToastContainer>
    </>
  );
};

export const alertToastDoc: RegistryEntry = {
  id: "alert-toast",
  title: "Alert & Toast",
  category: "Components",
  description:
    "The notification system. 'Alert' is used for static, inline warnings within a layout. 'Toast' is used for transient, global overlays.",
  sections: [
    {
      type: "playground",
      title: "Alert (Inline)",
      playground: {
        controls: [
          {
            name: "variant",
            type: "select",
            options: ["info", "warning", "error", "success"],
            defaultValue: "error",
          },
          { name: "title", type: "text", defaultValue: "Sync Failed" },
          {
            name: "message",
            type: "text",
            defaultValue: "We couldn't save your latest reps. Check your connection.",
          },
        ] as DocControl<AlertToastState>[],
        render: (state: AlertToastState) => (
          <Alert
            variant={state.variant}
            title={state.title}
            action={
              state.variant === "error" ? (
                <Button size="sm" variant="secondary">
                  Retry
                </Button>
              ) : undefined
            }
          >
            {state.message}
          </Alert>
        ),
        code: (state: AlertToastState) => {
          return `<Alert variant="${state.variant}" title="${state.title}">\n  ${state.message}\n</Alert>`;
        },
      },
    },
    {
      type: "playground",
      title: "Toast (Transient)",
      playground: {
        controls: [
          {
            name: "variant",
            type: "select",
            options: ["info", "warning", "error", "success"],
            defaultValue: "success",
          },
          { name: "title", type: "text", defaultValue: "Item Created" },
          { name: "message", type: "text", defaultValue: "Your new habit is ready to track." },
        ] as DocControl<AlertToastState>[],
        render: (state: AlertToastState) => <ToastPlaygroundDemo state={state} />,
        code: (state: AlertToastState) => {
          return `// Dispatched via a state manager or context\n<Toast\n  variant="${state.variant}"\n  title="${state.title}"\n  message="${state.message}"\n  onClose={...}\n/>`;
        },
      },
    },
  ],
};
