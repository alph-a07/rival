import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { Input } from "@/components/input/Input";
import { iconRegistry, type IconName } from "@/design-system/icons";

const iconNames = Object.keys(iconRegistry) as IconName[];

interface InputState {
  label: string;
  placeholder: string;
  size: "sm" | "md" | "lg";
  shape: "rounded" | "pill";
  leftIcon: IconName | "none";
  rightIcon: IconName | "none";
  error: boolean;
  errorMessage: string;
  success: boolean;
  successMessage: string;
  helperText: string;
}

export const inputDoc: RegistryEntry = {
  id: "input",
  title: "Input",
  category: "Components",
  description:
    "Standard text and numerical input field with optional adornments and validation states.",
  sections: [
    {
      type: "playground",
      title: "Playground",
      playground: {
        controls: [
          { name: "label", type: "text", defaultValue: "Email Address" },
          { name: "placeholder", type: "text", defaultValue: "hello@example.com" },
          { name: "size", type: "radio", options: ["sm", "md", "lg"], defaultValue: "md" },
          { name: "shape", type: "radio", options: ["rounded", "pill"], defaultValue: "rounded" },
          {
            name: "leftIcon",
            type: "select",
            options: ["none", ...iconNames],
            defaultValue: "none",
          },
          {
            name: "rightIcon",
            type: "select",
            options: ["none", ...iconNames],
            defaultValue: "none",
          },

          { name: "error", type: "boolean", defaultValue: false },
          { name: "errorMessage", type: "text", defaultValue: "Invalid email format" },

          { name: "success", type: "boolean", defaultValue: false },
          { name: "successMessage", type: "text", defaultValue: "Email is available!" },

          { name: "helperText", type: "text", defaultValue: "We'll never share your email." },
        ] as DocControl<InputState>[],
        render: (state: InputState) => (
          <Input
            label={state.label}
            placeholder={state.placeholder}
            size={state.size}
            shape={state.shape}
            leftIcon={state.leftIcon !== "none" ? state.leftIcon : undefined}
            rightIcon={state.rightIcon !== "none" ? state.rightIcon : undefined}
            error={state.error}
            errorMessage={state.errorMessage}
            success={state.success}
            successMessage={state.successMessage}
            helperText={state.helperText}
          />
        ),
        code: (state: InputState) =>
          `<Input label="${state.label}" placeholder="${state.placeholder}" size="${state.size}" />`,
      },
    },
    {
      type: "props",
      title: "Props",
      propsList: [
        {
          name: "size",
          type: "[InputSize](/design-system/input#type-inputsize)",
          default: "md",
          notes: "Scales the height, padding, and font-size",
        },
        {
          name: "shape",
          type: "[InputShape](/design-system/input#type-inputshape)",
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
          name: "leftIcon / rightIcon",
          type: "IconName",
          default: "—",
          notes: "Check available icons in the [Icon Library](/design-system/icons)",
        },
        {
          name: "iconSize",
          type: "number",
          default: "—",
          notes: "Overrides the default icon scale derived from the size prop",
        },
        {
          name: "error",
          type: "boolean",
          default: "false",
          notes: "Triggers the danger border and shadow states",
        },
        {
          name: "errorMessage",
          type: "string",
          default: "—",
          notes: "Displays below the input. Takes precedence over success and helper text.",
        },
        {
          name: "success",
          type: "boolean",
          default: "false",
          notes: "Triggers the positive border and shadow states",
        },
        {
          name: "successMessage",
          type: "string",
          default: "—",
          notes: "Displays below the input when success is true and error is false.",
        },
        {
          name: "helperText",
          type: "string",
          default: "—",
          notes:
            "Neutral hint text. Automatically suppressed if an error or success message is active.",
        },
        {
          name: "fullWidth",
          type: "boolean",
          default: "false",
          notes: "Forces the wrapper to 100% width of its container",
        },
      ],
    },
    {
      type: "types",
      title: "Custom Types",
      typesList: [
        {
          name: "InputSize",
          definition: `type InputSize = "sm" | "md" | "lg";`,
        },
        {
          name: "InputShape",
          definition: `type InputShape = "rounded" | "pill";`,
        },
      ],
    },
  ],
};
