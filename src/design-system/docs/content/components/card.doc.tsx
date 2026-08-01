import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { Card } from "@/components/card/Card";

interface CardState {
  variant: "elevated" | "outlined" | "filled" | "glow";
  padding: "none" | "sm" | "md" | "lg";
  radius: "sm" | "md" | "lg" | "xl";
  interactive: boolean;
  content: string;
}

export const cardDoc: RegistryEntry = {
  id: "card",
  title: "Card",
  category: "Components",
  description:
    "The fundamental surface component. Used to contain distinct groupings of information, from domain summaries to dialog containers, ensuring consistent radii, backgrounds, and shadows across the app.",
  sections: [
    {
      type: "playground",
      title: "Playground",
      playground: {
        controls: [
          {
            name: "variant",
            type: "select",
            options: ["elevated", "outlined", "filled", "glow"],
            defaultValue: "outlined",
          },
          {
            name: "padding",
            type: "radio",
            options: ["none", "sm", "md", "lg"],
            defaultValue: "md",
          },
          {
            name: "radius",
            type: "select",
            options: ["sm", "md", "lg", "xl"],
            defaultValue: "lg",
          },
          { name: "interactive", type: "boolean", defaultValue: false },
          { name: "content", type: "text", defaultValue: "Surface content goes here." },
        ] as DocControl<CardState>[],
        render: (state: CardState) => (
          <div style={{ width: "100%", maxWidth: "400px" }}>
            <Card
              variant={state.variant}
              padding={state.padding}
              radius={state.radius}
              interactive={state.interactive}
            >
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem" }}>Card Title</h3>
              <p style={{ margin: 0, color: "var(--text-muted)" }}>{state.content}</p>
            </Card>
          </div>
        ),
        code: (state: CardState) => {
          const props = [
            state.variant !== "outlined" && `variant="${state.variant}"`,
            state.padding !== "md" && `padding="${state.padding}"`,
            state.radius !== "lg" && `radius="${state.radius}"`,
            state.interactive && `interactive`,
          ]
            .filter(Boolean)
            .join(" ");

          return `<Card ${props}>\n  <h3>Card Title</h3>\n  <p>${state.content}</p>\n</Card>`;
        },
      },
    },
    {
      type: "props",
      title: "Props",
      propsList: [
        {
          name: "as",
          type: "div · article · section · aside · main",
          default: "div",
          notes: "Polymorphic prop for semantic HTML rendering.",
        },
        {
          name: "variant",
          type: "elevated · outlined · filled · glow",
          default: "outlined",
          notes: "Determines the border, shadow, and background mapping to tokens.",
        },
        {
          name: "padding",
          type: "none · sm · md · lg",
          default: "md",
          notes: "Standardized internal spacing.",
        },
        {
          name: "radius",
          type: "sm · md · lg · xl",
          default: "lg",
          notes: "Maps to global radius tokens.",
        },
        {
          name: "interactive",
          type: "boolean",
          default: "false",
          notes: "Adds hover elevation and pointer cursor for clickable cards.",
        },
      ],
    },
  ],
};
