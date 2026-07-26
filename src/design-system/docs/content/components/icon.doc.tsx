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
              "building",
              "exploring",
              "practicing",
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
          notes: "Required. Sourced from iconRegistry.",
        },
        {
          name: "variant",
          type: "standard · secondary-filled",
          default: "standard",
          notes: "Adds structural floating surface padding",
        },
        {
          name: "tint",
          type: "IconTint",
          default: "main",
          notes: "Color mapped directly to text design tokens",
        },
        {
          name: "size",
          type: "number | string",
          default: "1.25rem",
          notes: "Width and height (accepts rem strings or px numbers)",
        },
        {
          name: "weight",
          type: "thin · regular · bold",
          default: "regular",
          notes: "Stroke weight",
        },
      ],
    },
  ],
};
