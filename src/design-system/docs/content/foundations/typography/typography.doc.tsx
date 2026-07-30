import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { TypographyPreview } from "./TypographyPreview";

interface TypographyState {
  text: string;
  family: "var(--font-display)" | "var(--font-body)" | "var(--font-mono)";
  weight:
    | "var(--weight-reading)"
    | "var(--weight-medium)"
    | "var(--weight-bold-display)"
    | "var(--weight-bold)";
  size: number;
}

export const typographyDoc: RegistryEntry = {
  id: "typography",
  title: "Typography",
  category: "Foundations",
  description: "Display, body, and monospace stacks utilizing predefined standard weights.",
  sections: [
    { type: "custom", customRender: () => <TypographyPreview /> },
    {
      type: "playground",
      title: "Typography Playground",
      playground: {
        controls: [
          { name: "text", type: "text", defaultValue: "You vs. Yesterday" },
          {
            name: "family",
            type: "select",
            options: ["var(--font-display)", "var(--font-body)", "var(--font-mono)"],
            defaultValue: "var(--font-display)",
          },
          {
            name: "weight",
            type: "select",
            options: [
              "var(--weight-reading)",
              "var(--weight-medium)",
              "var(--weight-bold-display)",
              "var(--weight-bold)",
            ],
            defaultValue: "var(--weight-bold-display)",
          },
          { name: "size", type: "range", min: 12, max: 120, step: 2, defaultValue: 48 },
        ] as DocControl<TypographyState>[],
        render: (state: TypographyState) => (
          <div
            style={{
              fontFamily: state.family,
              fontWeight: state.weight,
              fontSize: `min(${state.size}px, 18vw)`,
              textAlign: "center",
              color: "var(--text-main)",
              lineHeight: 1.1,
              maxWidth: "100%",
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}
          >
            {state.text}
          </div>
        ),
        code: (state: TypographyState) =>
          `<div style={{ fontFamily: "${state.family}", fontWeight: "${state.weight}", fontSize: "${state.size}px" }}>\n  ${state.text}\n</div>`,
      },
    },
  ],
};
