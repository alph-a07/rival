import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { Badge, type BadgeVariant, type BadgeSize, type BadgeFont } from "@/components/badge/Badge";

interface BadgePrimitiveState {
  children: string;
  color: any;
  variant: BadgeVariant;
  size: BadgeSize;
  font: BadgeFont;
}

export const badgeDoc: RegistryEntry = {
  id: "badge",
  title: "Badge",
  category: "Components",
  description:
    "Compact status indicators used to highlight categorizations, states, or domain metrics.",
  sections: [
    {
      type: "playground",
      title: "Badge Primitive",
      playground: {
        controls: [
          {
            name: "children",
            type: "text",
            defaultValue: "Active",
            label: "Label",
          },
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
            defaultValue: "primary",
          },
          {
            name: "variant",
            type: "radio",
            options: ["soft", "solid", "outlined"],
            defaultValue: "soft",
          },
          {
            name: "size",
            type: "radio",
            options: ["sm", "md"],
            defaultValue: "sm",
          },
          {
            name: "font",
            type: "radio",
            options: ["body", "mono"],
            defaultValue: "body",
          },
        ] as DocControl<BadgePrimitiveState>[],
        render: (state) => (
          <Badge color={state.color} variant={state.variant} size={state.size} font={state.font}>
            {state.children}
          </Badge>
        ),
        code: (state) =>
          `<Badge color="${state.color}" variant="${state.variant}" size="${state.size}" font="${state.font}">${state.children}</Badge>`,
      },
    },
    {
      type: "props",
      title: "Props",
      propsList: [
        {
          name: "color",
          type: "BadgeColor",
          default: "primary",
          notes: "Base theme color for the badge.",
        },
        {
          name: "variant",
          type: "soft · solid · outlined",
          default: "soft",
          notes: "Visual container variant.",
        },
        {
          name: "size",
          type: "sm · md",
          default: "sm",
          notes: "Height and padding size variant.",
        },
        {
          name: "font",
          type: "body · mono",
          default: "body",
          notes: "Typography style applied to the text.",
        },
      ],
    },
  ],
};
