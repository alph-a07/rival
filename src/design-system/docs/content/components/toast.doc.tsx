import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { Toast, ToastContainer } from "@/components/toast/Toast";
import { Button } from "@/components/button/Button";
import { useState } from "react";
import { iconRegistry, type IconName } from "@/design-system/icons";

const iconNames = Object.keys(iconRegistry) as IconName[];

interface ToastState {
  variant: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  icon: IconName | "default";
  duration: number;
}

const ToastPlaygroundDemo = ({ state }: { state: ToastState }) => {
  const [toasts, setToasts] = useState<
    {
      id: string;
      variant: ToastState["variant"];
      title: string;
      message: string;
      icon: ToastState["icon"];
      duration: number;
    }[]
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
            icon={toast.icon === "default" ? undefined : toast.icon}
            duration={toast.duration}
            onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
          />
        ))}
      </ToastContainer>
    </>
  );
};

export const toastDoc: RegistryEntry = {
  id: "toast",
  title: "Toast",
  category: "Components",
  description:
    "Transient notification rendered in a global container, with configurable severity, icon, and auto-dismiss timing.",
  sections: [
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
          {
            name: "icon",
            type: "select",
            options: ["default", ...iconNames],
            defaultValue: "default",
          },
          { name: "duration", type: "range", min: 1000, max: 10000, step: 500, defaultValue: 4000 },
        ] as DocControl<ToastState>[],
        render: (state: ToastState) => <ToastPlaygroundDemo state={state} />,
        code: (state: ToastState) =>
          `<Toast\n  id="toast-id"\n  variant="${state.variant}"\n  title="${state.title}"\n  message="${state.message}"\n${state.icon === "default" ? "" : `  icon="${state.icon}"\n`}  duration={${state.duration}}\n  onClose={handleClose}\n/>`,
      },
    },
    {
      type: "props",
      title: "Props",
      propsList: [
        {
          name: "id",
          type: "string",
          default: "—",
          notes: "Stable identifier passed back to onClose.",
        },
        {
          name: "variant",
          type: "info · warning · error · success",
          default: "info",
          notes: "Sets the semantic color and default icon.",
        },
        { name: "title", type: "string", default: "—", notes: "Optional short heading." },
        { name: "message", type: "string", default: "—", notes: "Notification body text." },
        {
          name: "icon",
          type: "IconName",
          default: "variant icon",
          notes: "Replaces the default icon.",
        },
        {
          name: "duration",
          type: "number",
          default: "4000",
          notes: "Auto-dismiss delay in milliseconds; use Infinity to keep it open.",
        },
        {
          name: "onClose",
          type: "function",
          default: "—",
          notes: "Called after the close animation completes.",
        },
      ],
    },
  ],
};
