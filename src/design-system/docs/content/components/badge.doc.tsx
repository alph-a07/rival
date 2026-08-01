import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { Badge } from "@/components/badge/Badge";
import { iconRegistry, type IconName } from "@/design-system/icons";

const iconNames = Object.keys(iconRegistry) as IconName[];

interface BadgeState {
  label: string;
  color:
    | "primary"
    | "accent"
    | "danger"
    | "building"
    | "learning"
    | "exploring"
    | "practicing"
    | "habit"
    | "maintaining"
    | "muted";
  variant: "solid" | "soft" | "outlined";
  size: "sm" | "md";
  font: "body" | "mono";
  icon: IconName | "none";
}

export const badgeDoc: RegistryEntry = {
  id: "badge",
  title: "Badge",
  category: "Components",
  description:
    "A base-colored pill component. It is entirely domain-agnostic. Higher-level chips (like Consistency or Domain State) should wrap this component to map logic to its structural colors.",
  sections: [
    {
      type: "playground",
      title: "Playground",
      playground: {
        controls: [
          { name: "label", type: "text", defaultValue: "Steady" },
          {
            name: "color",
            type: "select",
            options: [
              "primary",
              "accent",
              "danger",
              "building",
              "learning",
              "exploring",
              "practicing",
              "habit",
              "maintaining",
              "muted",
            ],
            defaultValue: "practicing",
          },
          {
            name: "variant",
            type: "radio",
            options: ["solid", "soft", "outlined"],
            defaultValue: "soft",
          },
          { name: "size", type: "radio", options: ["sm", "md"], defaultValue: "sm" },
          { name: "font", type: "radio", options: ["body", "mono"], defaultValue: "body" },
          { name: "icon", type: "select", options: ["none", ...iconNames], defaultValue: "none" },
        ] as DocControl<BadgeState>[],
        render: (state: BadgeState) => (
          <Badge
            color={state.color}
            variant={state.variant}
            size={state.size}
            font={state.font}
            icon={state.icon === "none" ? undefined : state.icon}
          >
            {state.label}
          </Badge>
        ),
        code: (state: BadgeState) => {
          const props = [
            state.color !== "primary" && `color="${state.color}"`,
            state.variant !== "soft" && `variant="${state.variant}"`,
            state.size !== "sm" && `size="${state.size}"`,
            state.font !== "body" && `font="${state.font}"`,
            state.icon !== "none" && `icon="${state.icon}"`,
          ]
            .filter(Boolean)
            .join(" ");

          return `<Badge ${props}>\n  ${state.label}\n</Badge>`;
        },
      },
    },
    {
      type: "props",
      title: "Props",
      propsList: [
        {
          name: "color",
          type: "[BadgeColor](/design-system/badge#type-badgecolor)",
          default: "primary",
          notes: "Sets the semantic color mapping for the badge",
        },
        {
          name: "variant",
          type: "[BadgeVariant](/design-system/badge#type-badgevariant)",
          default: "soft",
          notes: "Determines the visual style (fill vs outline)",
        },
        {
          name: "size",
          type: "[BadgeSize](/design-system/badge#type-badgesize)",
          default: "sm",
          notes: "Adjusts the height, padding, and inner icon scale",
        },
        {
          name: "font",
          type: "[BadgeFont](/design-system/badge#type-badgefont)",
          default: "body",
          notes: "Switches the text styling between body and monospace",
        },
        {
          name: "icon",
          type: "IconName",
          default: "—",
          notes:
            "Optional leading icon. Check available icons in the [Icon Library](/design-system/icons)",
        },
      ],
    },
    {
      type: "types",
      title: "Custom Types",
      typesList: [
        {
          name: "BadgeColor",
          definition: `type BadgeColor =\n  | "primary"\n  | "accent"\n  | "danger"\n  | "building"\n  | "learning"\n  | "exploring"\n  | "practicing"\n  | "habit"\n  | "maintaining"\n  | "muted";`,
        },
        {
          name: "BadgeVariant",
          definition: `type BadgeVariant = "solid" | "soft" | "outlined";`,
        },
        {
          name: "BadgeSize",
          definition: `type BadgeSize = "sm" | "md";`,
        },
        {
          name: "BadgeFont",
          definition: `type BadgeFont = "body" | "mono";`,
        },
      ],
    },
  ],
};
