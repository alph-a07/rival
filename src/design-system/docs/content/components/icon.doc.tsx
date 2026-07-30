import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { Icon, type IconWeight, type IconTint, type IconVariant } from "@/components/icon/Icon";
import { iconRegistry, type IconName } from "@/design-system/icons";

const iconNames = Object.keys(iconRegistry) as IconName[];

interface IconState {
  name: IconName;
  variant: IconVariant;
  tint: IconTint;
  weight: IconWeight;
  size: number;
}

export const iconDoc: RegistryEntry = {
  id: "icon",
  title: "Icon",
  category: "Components",
  description: "Core icon component equipped with semantic tints and structural variant surfaces.",
  sections: [
    {
      type: "playground",
      title: "Playground",
      playground: {
        controls: [
          { name: "name", type: "select", options: iconNames, defaultValue: "search" },
          {
            name: "variant",
            type: "radio",
            options: ["standard", "secondary-filled"],
            defaultValue: "standard",
          },
          {
            name: "tint",
            type: "select",
            options: [
              "main",
              "muted",
              "primary",
              "accent",
              "danger",
              "success",
              "warning",
              "info",
              "building",
              "learning",
              "exploring",
              "practicing",
              "habit",
              "maintaining",
            ],
            defaultValue: "main",
          },
          {
            name: "weight",
            type: "select",
            options: ["thin", "regular", "bold"],
            defaultValue: "regular",
          },
          { name: "size", type: "range", min: 12, max: 64, step: 2, defaultValue: 24 },
        ] as DocControl<IconState>[],
        render: (state: IconState) => (
          <Icon
            name={state.name}
            variant={state.variant}
            tint={state.tint}
            weight={state.weight}
            size={`${state.size / 16}rem`}
          />
        ),
        code: (state: IconState) =>
          `<Icon name="${state.name}" variant="${state.variant}" tint="${state.tint}" weight="${state.weight}" size="${state.size / 16}rem" />`,
      },
    },
    {
      type: "props",
      title: "Props",
      propsList: [
        {
          name: "name",
          type: "IconName",
          default: "—",
          notes:
            "Required. Check available icons in the [Icon Library](/design-system/icon-library)",
        },
        {
          name: "variant",
          type: "[IconVariant](/design-system/icon#type-iconvariant)",
          default: "standard",
          notes: "Adds structural floating surface padding",
        },
        {
          name: "tint",
          type: "[IconTint](/design-system/icon#type-icontint)",
          default: "inherit",
          notes: "Color mapped directly to text design tokens",
        },
        {
          name: "weight",
          type: "[IconWeight](/design-system/icon#type-iconweight)",
          default: "regular",
          notes: "Stroke weight",
        },
      ],
    },
    {
      type: "types",
      title: "Custom Types",
      typesList: [
        {
          name: "IconTint",
          definition: `type IconTint =\n  | "inherit"\n  | "main"\n  | "muted"\n  | "primary"\n  | "accent"\n  | "danger"\n  | "success"\n  | "warning"\n  | "info"\n  | "building"\n  | "learning"\n  | "exploring"\n  | "practicing"\n  | "habit"\n  | "maintaining";`,
        },
        {
          name: "IconWeight",
          definition: `type IconWeight = "thin" | "regular" | "bold";`,
        },
        {
          name: "IconVariant",
          definition: `type IconVariant = "standard" | "secondary-filled";`,
        },
      ],
    },
  ],
};
