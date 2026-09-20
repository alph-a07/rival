import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { Heading, Text, Mono, Label } from "@/components/typography/Typography";

interface TypographyState {
  // Heading
  level: 1 | 2 | 3 | 4 | 5;
  headingWeight: "reading" | "bold";
  headingText: string;
  // Text/Mono
  textSize: "xs" | "sm" | "md" | "lg";
  textWeight: "reading" | "medium" | "bold";
  monoWeight: "reading" | "medium";
  textColor: "main" | "muted" | "primary" | "danger" | "success" | "info" | "warning";
  bodyText: string;
  monoText: string;
  // Label
  mutedLabel: boolean;
  labelText: string;
}

export const headingDoc: RegistryEntry = {
  id: "heading",
  title: "Heading",
  category: "Foundations",
  parent: "typography",
  description: "Semantic headings using the Clash Display font family.",
  sections: [
    {
      type: "playground",
      title: "Heading (Clash Display)",
      playground: {
        controls: [
          { name: "level", type: "select", options: [1, 2, 3, 4, 5], defaultValue: 2 },
          {
            name: "headingWeight",
            type: "select",
            options: ["reading", "bold"],
            defaultValue: "bold",
          },
          { name: "headingText", type: "text", defaultValue: "The quick brown fox" },
        ] as DocControl<TypographyState>[],
        render: (state) => (
          <Heading level={state.level} weight={state.headingWeight}>
            {state.headingText}
          </Heading>
        ),
        code: (state) =>
          `<Heading level={${state.level}} weight="${state.headingWeight}">\n  ${state.headingText}\n</Heading>`,
      },
    },
    {
      type: "props",
      propsList: [
        {
          name: "as",
          type: "string",
          default: "—",
          notes: 'Overrides the default HTML tag (e.g., as="div").',
        },
        {
          name: "level",
          type: "1 | 2 | 3 | 4 | 5",
          default: "2",
          notes: "Determines the font size and default HTML tag (h1-h5).",
        },
        {
          name: "weight",
          type: "reading · bold",
          default: "bold",
          notes: "Maps to Clash Display weights: 400, 600.",
        },
      ],
    },
  ],
};

export const textDoc: RegistryEntry = {
  id: "text",
  title: "Text",
  category: "Foundations",
  parent: "typography",
  description: "Semantic body text using the Satoshi font family.",
  sections: [
    {
      type: "playground",
      title: "Text (Satoshi)",
      playground: {
        controls: [
          {
            name: "textSize",
            type: "select",
            options: ["xs", "sm", "md", "lg"],
            defaultValue: "md",
          },
          {
            name: "textWeight",
            type: "select",
            options: ["reading", "medium", "bold"],
            defaultValue: "reading",
          },
          {
            name: "textColor",
            type: "select",
            options: ["main", "muted", "primary", "danger", "success", "info", "warning"],
            defaultValue: "main",
          },
          { name: "bodyText", type: "text", defaultValue: "Jumps over the lazy dog." },
        ] as DocControl<TypographyState>[],
        render: (state) => (
          <Text size={state.textSize} weight={state.textWeight} color={state.textColor}>
            {state.bodyText}
          </Text>
        ),
        code: (state) =>
          `<Text size="${state.textSize}" weight="${state.textWeight}" color="${state.textColor}">\n  ${state.bodyText}\n</Text>`,
      },
    },
    {
      type: "props",
      propsList: [
        {
          name: "as",
          type: "string",
          default: "p",
          notes: 'Overrides the default HTML tag (e.g., as="span").',
        },
        {
          name: "size",
          type: "xs · sm · md · lg",
          default: "md",
          notes: "Standardized font sizes.",
        },
        {
          name: "weight",
          type: "reading · medium · bold",
          default: "reading",
          notes: "Maps to Satoshi weights: 400, 500, 700.",
        },
        {
          name: "color",
          type: "string",
          default: "main",
          notes: "Accepts highly saturated semantic and structural color tokens.",
        },
      ],
    },
  ],
};

export const monoDoc: RegistryEntry = {
  id: "mono",
  title: "Mono",
  category: "Foundations",
  parent: "typography",
  description: "Monospace text using the JetBrains Mono font family.",
  sections: [
    {
      type: "playground",
      title: "Mono (JetBrains Mono)",
      playground: {
        controls: [
          {
            name: "textSize",
            type: "select",
            options: ["xs", "sm", "md", "lg"],
            defaultValue: "sm",
          },
          {
            name: "monoWeight",
            type: "select",
            options: ["reading", "medium"],
            defaultValue: "reading",
          },
          {
            name: "textColor",
            type: "select",
            options: ["main", "muted", "primary", "danger", "success", "info", "warning"],
            defaultValue: "main",
          },
          { name: "monoText", type: "text", defaultValue: "npm install @app/core" },
        ] as DocControl<TypographyState>[],
        render: (state) => (
          <Mono size={state.textSize} weight={state.monoWeight} color={state.textColor}>
            {state.monoText}
          </Mono>
        ),
        code: (state) =>
          `<Mono size="${state.textSize}" weight="${state.monoWeight}" color="${state.textColor}">\n  ${state.monoText}\n</Mono>`,
      },
    },
    {
      type: "props",
      propsList: [
        { name: "as", type: "string", default: "span", notes: "Overrides the default HTML tag." },
        {
          name: "size",
          type: "xs · sm · md · lg",
          default: "sm",
          notes: "Standardized font sizes.",
        },
        {
          name: "weight",
          type: "reading · medium",
          default: "reading",
          notes: "Maps to JetBrains Mono weights: 400, 500.",
        },
        {
          name: "color",
          type: "string",
          default: "main",
          notes: "Accepts semantic and structural color tokens.",
        },
      ],
    },
  ],
};

export const labelDoc: RegistryEntry = {
  id: "label",
  title: "Label",
  category: "Foundations",
  parent: "typography",
  description: "Form labels styled with the design system's body typography.",
  sections: [
    {
      type: "playground",
      title: "Label",
      playground: {
        controls: [
          { name: "mutedLabel", type: "boolean", defaultValue: false },
          { name: "labelText", type: "text", defaultValue: "Email Address" },
        ] as DocControl<TypographyState>[],
        render: (state) => <Label muted={state.mutedLabel}>{state.labelText}</Label>,
        code: (state) =>
          state.mutedLabel
            ? `<Label muted>\n  ${state.labelText}\n</Label>`
            : `<Label>\n  ${state.labelText}\n</Label>`,
      },
    },
    {
      type: "props",
      propsList: [
        {
          name: "muted",
          type: "boolean",
          default: "false",
          notes: "Dims the label color to text-muted.",
        },
      ],
    },
  ],
};
