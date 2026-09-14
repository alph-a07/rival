import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { Text } from "@/components/typography/Typography";
import { ProgressDots } from "@/components/progress-dots/ProgressDots";
import { FlowShell } from "@/components/flow-shell/FlowShell";

interface FlowShellState {
  title: string;
  subtitle: string;
  showBack: boolean;
  backAriaLabel: string;
  showAction: boolean;
}

export const flowShellDoc: RegistryEntry = {
  id: "flow-shell",
  title: "FlowShell",
  category: "Components",
  description:
    "Page chrome for wizard and multi-step flows, with optional back navigation, progress content, and a custom header action.",
  sections: [
    {
      type: "playground",
      title: "Playground",
      playground: {
        controls: [
          { name: "title", type: "text", defaultValue: "Create New Item" },
          { name: "subtitle", type: "text", defaultValue: "Step 2 of 3" },
          { name: "showBack", type: "boolean", defaultValue: true },
          { name: "backAriaLabel", type: "text", defaultValue: "Go back" },
          { name: "showAction", type: "boolean", defaultValue: true },
        ] as DocControl<FlowShellState>[],
        render: (state: FlowShellState) => (
          <div
            style={{
              border: "1px solid var(--border-surface)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              maxHeight: "500px",
            }}
          >
            <FlowShell
              title={state.title}
              subtitle={state.subtitle}
              onBack={state.showBack ? () => console.log("back clicked") : undefined}
              backAriaLabel={state.backAriaLabel}
              action={state.showAction ? <ProgressDots total={3} current={1} /> : undefined}
            >
              <Text size="lg">
                Wizard body content goes here. The shell centers content cleanly up to 640px width
                while pinning the header to the top.
              </Text>
            </FlowShell>
          </div>
        ),
        code: (state: FlowShellState) => {
          const props = [
            state.title && `title="${state.title}"`,
            state.subtitle && `subtitle="${state.subtitle}"`,
            state.showBack && `onBack={() => handleBack()}`,
            state.showBack && `backAriaLabel="${state.backAriaLabel}"`,
            state.showAction && `action={<ProgressDots total={3} current={1} />}`,
          ]
            .filter(Boolean)
            .join("\n  ");

          return `<FlowShell\n  ${props}\n>\n  <WizardStepContent />\n</FlowShell>`;
        },
      },
    },
    {
      type: "props",
      title: "Props",
      propsList: [
        {
          name: "title",
          type: "string",
          default: "—",
          notes: "Centered header title text.",
        },
        {
          name: "subtitle",
          type: "string",
          default: "—",
          notes: "Small contextual text below the title.",
        },
        {
          name: "onBack",
          type: "function",
          default: "—",
          notes: "Renders a back IconButton on the left if provided.",
        },
        {
          name: "backAriaLabel",
          type: "string",
          default: '"Go back"',
          notes: "Accessible name for the back action.",
        },
        {
          name: "action",
          type: "ReactNode",
          default: "—",
          notes: "Custom action slot on the right side of the header.",
        },
      ],
    },
  ],
};
