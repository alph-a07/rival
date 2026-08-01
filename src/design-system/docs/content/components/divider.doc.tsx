import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { Divider } from "@/components/divider/Divider";

interface DividerState {
  label: string;
}

export const dividerDoc: RegistryEntry = {
  id: "divider",
  title: "Divider",
  category: "Components",
  description:
    "A simple horizontal line that can optionally display a label in the center. It is used to separate content or sections within a page.",
  sections: [
    {
      type: "playground",
      title: "Divider",
      playground: {
        controls: [
          { name: "label", type: "text", defaultValue: "OR" },
        ] as DocControl<DividerState>[],
        render: (state: DividerState) => (
          <div style={{ width: "100%" }}>
            <Divider label={state.label === "" ? undefined : state.label} />
          </div>
        ),
        code: (state: DividerState) =>
          state.label ? `<Divider label="${state.label}" />` : `<Divider />`,
      },
    },
  ],
};
