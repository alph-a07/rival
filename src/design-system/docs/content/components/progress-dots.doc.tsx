import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { ProgressDots } from "@/components/progress-dots/ProgressDots";

interface ProgressDotsState {
  total: number;
  current: number;
}

export const progressDotsDoc: RegistryEntry = {
  id: "progress-dots",
  title: "ProgressDots",
  category: "Components",
  description:
    "A pure visual indicator of a step's index relative to a total. Decoupled entirely from specific feature logic (like Check-in).",
  sections: [
    {
      type: "playground",
      title: "Playground",
      playground: {
        controls: [
          { name: "total", type: "select", options: [2, 3, 4, 5], defaultValue: 4 },
          { name: "current", type: "select", options: [0, 1, 2, 3, 4], defaultValue: 1 },
        ] as unknown as DocControl<ProgressDotsState>[],
        render: (state: ProgressDotsState) => (
          <ProgressDots total={state.total} current={Math.min(state.current, state.total - 1)} />
        ),
        code: (state: ProgressDotsState) =>
          `<ProgressDots total={${state.total}} current={${Math.min(state.current, state.total - 1)}} />`,
      },
    },
    {
      type: "props",
      title: "Props",
      propsList: [
        {
          name: "total",
          type: "number",
          default: "—",
          notes: "The total number of dots to render.",
        },
        {
          name: "current",
          type: "number",
          default: "—",
          notes: "The zero-indexed active step.",
        },
      ],
    },
  ],
};
