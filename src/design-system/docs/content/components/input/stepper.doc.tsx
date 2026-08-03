import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { Stepper } from "@/components/input/Stepper";

interface StepperState {
  label: string;
  placeholder: string;
  step: string; // Passed as string from inputs, casted in render
  min: string;
  max: string;
  size: "sm" | "md" | "lg";
  shape: "rounded" | "pill";
  error: boolean;
  errorMessage: string;
  success: boolean;
  successMessage: string;
}

export const stepperDoc: RegistryEntry = {
  id: "stepper",
  title: "Stepper",
  parent: "input",
  category: "Components",
  description:
    "Numeric input with step-up and step-down controls. Automatically assumes placeholder value if starting from empty.",
  sections: [
    {
      type: "playground",
      title: "Playground",
      playground: {
        controls: [
          { name: "label", type: "text", defaultValue: "Target Reps" },
          { name: "placeholder", type: "text", defaultValue: "10" },
          { name: "step", type: "text", defaultValue: "5" },
          { name: "min", type: "text", defaultValue: "0" },
          { name: "max", type: "text", defaultValue: "100" },
          { name: "size", type: "radio", options: ["sm", "md", "lg"], defaultValue: "lg" },
          { name: "shape", type: "radio", options: ["rounded", "pill"], defaultValue: "rounded" },

          { name: "error", type: "boolean", defaultValue: false },
          { name: "errorMessage", type: "text", defaultValue: "Reps must be above 0" },

          { name: "success", type: "boolean", defaultValue: false },
          { name: "successMessage", type: "text", defaultValue: "Target saved successfully!" },
        ] as DocControl<StepperState>[],
        render: (state: StepperState) => (
          <Stepper
            label={state.label}
            placeholder={state.placeholder}
            step={Number(state.step)}
            min={Number(state.min)}
            max={Number(state.max)}
            size={state.size}
            shape={state.shape}
            error={state.error}
            errorMessage={state.errorMessage}
            success={state.success}
            successMessage={state.successMessage}
          />
        ),
        code: (state: StepperState) =>
          `<Stepper label="${state.label}" placeholder="${state.placeholder}" step={${state.step}} />`,
      },
    },
    {
      type: "props",
      title: "Props",
      propsList: [
        {
          name: "size",
          type: "[StepperSize](/design-system/stepper#type-steppersize)",
          default: "md",
          notes: "Scales the height, padding, and font-size",
        },
        {
          name: "shape",
          type: "[StepperShape](/design-system/stepper#type-steppershape)",
          default: "rounded",
          notes: "Border radius structure",
        },
        {
          name: "label",
          type: "string",
          default: "—",
          notes: "Renders a native accessible label element above the input",
        },
        {
          name: "step",
          type: "number",
          default: "1",
          notes: "Amount to increment/decrement per button click or arrow key press",
        },
        {
          name: "min / max",
          type: "number",
          default: "—",
          notes:
            "Automatically clamps values and disables the corresponding +/- button when limits are reached",
        },
        {
          name: "error",
          type: "boolean",
          default: "false",
          notes:
            "Triggers the danger states. Note: Stepper forces an error state automatically if typed values exceed min/max bounds.",
        },
        {
          name: "success",
          type: "boolean",
          default: "false",
          notes: "Triggers the positive border and shadow states",
        },
        {
          name: "errorMessage / successMessage",
          type: "string",
          default: "—",
          notes: "Displays below the input to explain the active validation state",
        },
        {
          name: "helperText",
          type: "string",
          default: "—",
          notes: "Neutral hint text. Suppressed if an error or success message is active.",
        },
        {
          name: "incrementDisabled",
          type: "boolean",
          default: "false",
          notes: "Force-disables the add button regardless of max limit logic",
        },
        {
          name: "decrementDisabled",
          type: "boolean",
          default: "false",
          notes: "Force-disables the minus button regardless of min limit logic",
        },
      ],
    },
    {
      type: "types",
      title: "Custom Types",
      typesList: [
        {
          name: "StepperSize",
          definition: `type StepperSize = "sm" | "md" | "lg";`,
        },
        {
          name: "StepperShape",
          definition: `type StepperShape = "rounded" | "pill";`,
        },
      ],
    },
  ],
};
