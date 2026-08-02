import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { Logo } from "@/components/logo/Logo";

interface LogoState {
  variant: "colored" | "monochrome";
  size: string;
  hasBackground: boolean;
}

export const logoDoc: RegistryEntry = {
  id: "logo",
  title: "Logo",
  category: "Components",
  description:
    "The core brand mark. Supports both colorful gradient modes and solid adaptive monochromes. Seamlessly adapts to light and dark theme context.",
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
          { name: "size", type: "range", min: 16, max: 256, step: 8, defaultValue: 96 },
          { name: "hasBackground", type: "boolean", defaultValue: false },
        ] as DocControl<LogoState>[],
        render: (state: LogoState) => (
          <Logo
            variant={state.variant}
            size={Number(state.size)}
            hasBackground={state.hasBackground}
          />
        ),
        code: (state: LogoState) => {
          const props = [
            state.variant !== "colored" && `variant="${state.variant}"`,
            `size={${state.size}}`,
            state.hasBackground && `hasBackground`,
          ]
            .filter(Boolean)
            .join(" ");

          return `<Logo ${props} />`;
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
          notes: "Toggles between brand gradients and a solid fill matching current text color.",
        },
        {
          name: "size",
          type: "number | string",
          default: "32",
          notes: "Applies to both width and height properties.",
        },
        {
          name: "hasBackground",
          type: "boolean",
          default: "false",
          notes:
            "Injects an elevated squircle background utilizing CSS padding to proportionally shrink the SVG.",
        },
      ],
    },
  ],
};
