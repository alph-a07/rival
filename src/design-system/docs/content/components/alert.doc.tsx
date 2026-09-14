import { useEffect, useState } from "react";
import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { Alert, type AlertVariant } from "@/components/alert/Alert";
import { Button } from "@/components/button/Button";
import { iconRegistry, type IconName } from "@/design-system/icons";
import { useDemoBanner } from "@/design-system/docs/ui/DemoBanner";
const iconNames = Object.keys(iconRegistry) as IconName[];

interface AlertState {
  variant: AlertVariant;
  title: string;
  message: string;
  icon: IconName | "default";
  showAction: boolean;
}

interface BannerState {
  variant: AlertVariant;
  title: string;
  message: string;
}

/** The viewport where `presentation="banner"` turns full-bleed. */
const PHONE_PERIOD = "(width < 48em)";

const FullBleedDemo = ({ state }: { state: BannerState }) => {
  const { show, dismiss } = useDemoBanner();
  const [isPhone, setIsPhone] = useState(() => window.matchMedia(PHONE_PERIOD).matches);

  useEffect(() => {
    const mq = window.matchMedia(PHONE_PERIOD);
    const onChange = (e: MediaQueryListEvent) => {
      setIsPhone(e.matches);
      if (!e.matches) {
        dismiss();
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [dismiss]);

  return (
    <div>
      <Button
        disabled={!isPhone}
        onClick={() =>
          show({
            variant: state.variant,
            title: state.title,
            children: state.message,
          })
        }
      >
        Trigger Full-Bleed Alert
      </Button>
      {!isPhone && (
        <p
          style={{
            marginTop: "0.75rem",
            fontSize: "0.8125rem",
            color: "var(--text-muted)",
          }}
        >
          Shrink to a phone-width viewport to enable this button. The banner follows the phone
          viewport, not the width of this panel.
        </p>
      )}
    </div>
  );
};

export const alertDoc: RegistryEntry = {
  id: "alert",
  title: "Alert",
  category: "Components",
  description:
    "Inline status message with semantic variants, optional actions, and a banner presentation for app-wide states.",
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
          {
            name: "icon",
            type: "select",
            options: ["default", ...iconNames],
            defaultValue: "default",
          },
          { name: "showAction", type: "boolean", defaultValue: true },
        ] as DocControl<AlertState>[],
        render: (state: AlertState) => (
          <Alert
            variant={state.variant}
            title={state.title}
            icon={state.icon === "default" ? undefined : state.icon}
            action={
              state.showAction ? (
                <Button size="sm" variant="secondary">
                  Retry
                </Button>
              ) : undefined
            }
          >
            {state.message}
          </Alert>
        ),
        code: (state: AlertState) => {
          const props = [
            `variant="${state.variant}"`,
            state.title && `title="${state.title}"`,
            state.icon !== "default" && `icon="${state.icon}"`,
            state.showAction && `action={<Button size="sm" variant="secondary">Retry</Button>}`,
          ]
            .filter(Boolean)
            .join("\n  ");
          return `<Alert\n  ${props}\n>\n  ${state.message}\n</Alert>`;
        },
      },
    },
    {
      type: "playground",
      title: "Alert (Banner — phone viewport)",
      playground: {
        controls: [
          {
            name: "variant",
            type: "select",
            options: ["info", "warning", "error", "success"],
            defaultValue: "warning",
          },
          { name: "title", type: "text", defaultValue: "You're offline" },
          {
            name: "message",
            type: "text",
            defaultValue: "Changes will sync once you're back online.",
          },
        ] as DocControl<BannerState>[],
        render: (state: BannerState) => <FullBleedDemo state={state} />,
        code: (state: BannerState) =>
          `<Alert\n  variant="${state.variant}"\n  title="${state.title}"\n  presentation="banner"\n  action={<Button size="sm" variant="secondary">Got it</Button>}\n>\n  ${state.message}\n</Alert>`,
      },
    },
    {
      type: "props",
      title: "Props",
      propsList: [
        {
          name: "variant",
          type: "info · warning · error · success",
          default: "info",
          notes: "Sets the semantic color, icon, and live-region urgency.",
        },
        {
          name: "title",
          type: "string",
          default: "—",
          notes: "Optional short heading above the message.",
        },
        {
          name: "children",
          type: "ReactNode",
          default: "—",
          notes: "Message content rendered below the title.",
        },
        {
          name: "icon",
          type: "IconName",
          default: "variant icon",
          notes: "Replaces the default icon for the selected variant.",
        },
        {
          name: "action",
          type: "ReactNode",
          default: "—",
          notes: "Optional action placed beside the message.",
        },
        {
          name: "presentation",
          type: "inline · banner",
          default: "inline",
          notes: "Banner is full-bleed on phone viewports and inline above the phone breakpoint.",
        },
      ],
    },
  ],
};
