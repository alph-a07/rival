import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { Loader } from "@/components/loader/Loader";

interface LoaderState {
  variant: "colored" | "monochrome";
  size: string;
  speed: "slow" | "normal" | "fast";
}

export const loaderDoc: RegistryEntry = {
  id: "loader",
  title: "Loader",
  category: "Components",
  description:
    "An animated variation of the brand logo used specifically to indicate processing or loading states. Automatically obeys 'prefers-reduced-motion'.",
  sections: [
    {
      type: "playground",
      title: "Playground",
      playground: {
        controls: [
          {
            name: "variant",
            type: "radio",
            options: ["colored", "monochrome"],
            defaultValue: "colored",
          },
          { name: "size", type: "range", min: 16, max: 128, step: 8, defaultValue: 48 },
          {
            name: "speed",
            type: "radio",
            options: ["slow", "normal", "fast"],
            defaultValue: "normal",
          },
        ] as DocControl<LoaderState>[],
        render: (state: LoaderState) => (
          <Loader variant={state.variant} size={Number(state.size)} speed={state.speed} />
        ),
        code: (state: LoaderState) => {
          return `<Loader variant="${state.variant}" size={${state.size}} speed="${state.speed}" />`;
        },
      },
    },
    {
      type: "props",
      title: "Props",
      propsList: [
        {
          name: "variant",
          type: "colored · monochrome",
          default: "colored",
          notes: "Matches the base Logo coloring.",
        },
        {
          name: "size",
          type: "number | string",
          default: "32",
          notes: "Applies to both width and height properties.",
        },
        {
          name: "speed",
          type: "slow · normal · fast",
          default: "normal",
          notes: "Semantic speed modifier for the flame animation.",
        },
      ],
    },
  ],
};
