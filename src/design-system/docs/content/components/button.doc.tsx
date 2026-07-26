import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { Button } from "@/components/button/Button";
import { iconRegistry, type IconName } from "@/design-system/icons";
import type { IconWeight } from "@/components/icon/Icon";

const iconNames = Object.keys(iconRegistry) as IconName[];

interface ButtonState {
  variant: "hero" | "primary" | "secondary" | "danger" | "ghost";
  size: "sm" | "md" | "lg";
  shape: "rounded" | "pill";
  fullWidth: boolean;
  loading: boolean;
  disabled: boolean;
  label: string;
  leftIcon: IconName | "none";
  iconWeight: IconWeight;
}

export const buttonDoc: RegistryEntry = {
  id: "button",
  title: "Button",
  category: "Components",
  description:
    "Five variants. Hero is the rare one with a theme-structural glow surface, reserved for a handful of spotlight CTAs — primary is the everyday default action.",
  sections: [
    {
      type: "playground",
      title: "Playground",
      playground: {
        controls: [
          { name: "label", type: "text", defaultValue: "Log today's rep" },
          {
            name: "variant",
            type: "select",
            options: ["hero", "primary", "secondary", "danger", "ghost"],
            defaultValue: "primary",
          },
          { name: "size", type: "radio", options: ["sm", "md", "lg"], defaultValue: "lg" },
          { name: "shape", type: "radio", options: ["rounded", "pill"], defaultValue: "rounded" },
          { name: "fullWidth", type: "boolean", defaultValue: false },
          { name: "loading", type: "boolean", defaultValue: false },
          { name: "disabled", type: "boolean", defaultValue: false },
          {
            name: "leftIcon",
            type: "select",
            options: ["none", ...iconNames],
            defaultValue: "none",
          },
          {
            name: "iconWeight",
            type: "select",
            options: ["thin", "regular", "bold"],
            defaultValue: "regular",
          },
        ] as DocControl<ButtonState>[],
        render: (state: ButtonState) => (
          <Button
            variant={state.variant}
            size={state.size}
            shape={state.shape}
            fullWidth={state.fullWidth}
            loading={state.loading}
            disabled={state.disabled}
            leftIcon={state.leftIcon === "none" ? undefined : state.leftIcon}
            iconWeight={state.iconWeight}
          >
            {state.label}
          </Button>
        ),
        code: (state: ButtonState) =>
          `<Button variant="${state.variant}" size="${state.size}"${
            state.leftIcon !== "none" ? ` leftIcon="${state.leftIcon}"` : ""
          }>\n  ${state.label}\n</Button>`,
      },
    },
    {
      type: "props",
      title: "Props",
      propsList: [
        {
          name: "variant",
          type: "hero · primary · secondary · danger · ghost",
          default: "primary",
          notes: "Visual role",
        },
        { name: "size", type: "sm · md · lg", default: "md", notes: "Padding + font-size" },
        { name: "shape", type: "rounded · pill", default: "rounded", notes: "Border radius" },
        { name: "fullWidth", type: "boolean", default: "false", notes: "100% width" },
        {
          name: "loading",
          type: "boolean",
          default: "false",
          notes: "Swaps left icon for spinner, forces disabled",
        },
        {
          name: "leftIcon / rightIcon",
          type: "IconName",
          default: "—",
          notes: "Rendered via the typed Icon system",
        },
        {
          name: "iconWeight",
          type: "thin · regular · bold",
          default: "regular",
          notes: "Stroke weight, passed through to Icon",
        },
      ],
    },
  ],
};
