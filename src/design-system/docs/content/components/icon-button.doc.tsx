import type { IconWeight } from "@/components/icon/Icon";
import { iconRegistry, type IconName } from "@/design-system/icons";
import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { IconButton } from "@/components/icon-button/IconButton";

const iconNames = Object.keys(iconRegistry) as IconName[];

interface IconButtonState {
  icon: IconName;
  ariaLabel: string;
  variant: "primary" | "secondary" | "filled" | "danger" | "ghost";
  size: "sm" | "md" | "lg";
  shape: "circle" | "rounded";
  weight: IconWeight;
  loading: boolean;
  disabled: boolean;
}

export const iconButtonDoc: RegistryEntry = {
  id: "icon-button",
  title: "Icon Button",
  category: "Components",
  description:
    "Square, icon-only action button. No hero variant — the flourish is built for a text-label shape and reads as noisy at this scale.",
  sections: [
    {
      type: "playground",
      title: "Playground",
      playground: {
        controls: [
          { name: "icon", type: "select", options: iconNames, defaultValue: "close" },
          { name: "ariaLabel", type: "text", defaultValue: "Close" },
          {
            name: "variant",
            type: "select",
            options: ["primary", "secondary", "filled", "danger", "ghost"],
            defaultValue: "ghost",
          },
          { name: "size", type: "radio", options: ["sm", "md", "lg"], defaultValue: "md" },
          {
            name: "shape",
            type: "radio",
            options: ["circle", "rounded"],
            defaultValue: "circle",
          },
          {
            name: "weight",
            type: "select",
            options: ["thin", "regular", "bold"],
            defaultValue: "regular",
          },
          { name: "loading", type: "boolean", defaultValue: false },
          { name: "disabled", type: "boolean", defaultValue: false },
        ] as DocControl<IconButtonState>[],
        render: (state: IconButtonState) => (
          <IconButton
            icon={state.icon}
            aria-label={state.ariaLabel}
            variant={state.variant}
            size={state.size}
            shape={state.shape}
            weight={state.weight}
            loading={state.loading}
            disabled={state.disabled}
          />
        ),
        code: (state: IconButtonState) =>
          `<IconButton icon="${state.icon}" aria-label="${state.ariaLabel}" variant="${state.variant}" size="${state.size}" />`,
      },
    },
    {
      type: "props",
      title: "Props",
      propsList: [
        { name: "icon", type: "IconName", default: "—", notes: "Required" },
        {
          name: "aria-label",
          type: "string",
          default: "—",
          notes: "Required — no visible text fallback for assistive tech",
        },
        {
          name: "variant",
          type: "primary · secondary · filled · danger · ghost",
          default: "ghost",
          notes: "No hero variant here",
        },
        { name: "size", type: "sm · md · lg", default: "md", notes: "32 / 40 / 48px square" },
        {
          name: "shape",
          type: "circle · rounded",
          default: "circle",
          notes: "Circle reuses the shared base's pill radius",
        },
        {
          name: "weight",
          type: "thin · regular · bold",
          default: "regular",
          notes: "Stroke weight, passed through to Icon",
        },
        {
          name: "loading",
          type: "boolean",
          default: "false",
          notes: "Swaps icon for spinner, forces disabled",
        },
        {
          name: "...rest",
          type: "ButtonHTMLAttributes",
          default: "—",
          notes: "Passed straight to <button>",
        },
      ],
    },
  ],
};
