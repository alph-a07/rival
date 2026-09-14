import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { ConsistencyBadge } from "@/components/badge/ConsistencyBadge";
import type { BadgeVariant, BadgeSize } from "@/components/badge/Badge";
import type { ConsistencyStatus } from "@/domain/trajectory/consistencyTracker";

interface ConsistencyBadgeState {
  status: ConsistencyStatus;
  variant: BadgeVariant;
  size: BadgeSize;
}

export const consistencyBadgeDoc: RegistryEntry = {
  id: "consistency-badge",
  title: "Consistency Badge",
  category: "Components",
  parent: "badge",
  description:
    "A semantic wrapper around the Badge primitive that maps ConsistencyStatus enums directly to their respective colors and labels.",
  sections: [
    {
      type: "playground",
      title: "Playground",
      playground: {
        controls: [
          {
            name: "status",
            type: "select",
            options: [
              "warming_up",
              "dialed_in",
              "on_track",
              "finding_footing",
              "uneven_ground",
              "choppy_waters",
              "off_course",
              "in_the_storm",
            ],
            defaultValue: "dialed_in",
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
        ] as DocControl<ConsistencyBadgeState>[],
        render: (state) => (
          <ConsistencyBadge status={state.status} variant={state.variant} size={state.size} />
        ),
        code: (state) =>
          `<ConsistencyBadge status="${state.status}" variant="${state.variant}" size="${state.size}" />`,
      },
    },
    {
      type: "props",
      title: "Props",
      propsList: [
        {
          name: "status",
          type: "ConsistencyStatus",
          default: "warming_up",
          notes:
            "Domain status state. Automatically maps to the designated token colors and text labels.",
        },
        {
          name: "variant",
          type: "soft · solid · outlined",
          default: "soft",
          notes: "Visual container variant passed to the underlying Badge primitive.",
        },
        {
          name: "size",
          type: "sm · md",
          default: "sm",
          notes: "Height and padding size variant passed to the underlying Badge primitive.",
        },
      ],
    },
  ],
};
