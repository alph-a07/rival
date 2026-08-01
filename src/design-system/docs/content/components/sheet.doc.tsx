import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { Sheet } from "@/components/sheet/Sheet";
import { Button } from "@/components/button/Button";
import { useState } from "react";

interface SheetState {
  title: string;
  preventOutsideClick: boolean;
}

const SheetPlaygroundDemo = ({ state }: { state: SheetState }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Sheet</Button>
      <Sheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={state.title}
        preventOutsideClick={state.preventOutsideClick}
      >
        <div style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>
          <p>
            This component conditionally hides its drag handle if it detects the user is strictly
            operating via a precise pointer (mouse), but reveals it for touch devices (coarse
            pointer).
          </p>
          <p style={{ marginTop: "1rem" }}>
            It also utilizes <code>env(safe-area-inset-bottom)</code> to ensure contents do not
            collide with the iOS home indicator.
          </p>
        </div>
        <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
          <Button variant="ghost" fullWidth onClick={() => setIsOpen(false)}>
            Clear
          </Button>
          <Button fullWidth onClick={() => setIsOpen(false)}>
            Apply
          </Button>
        </div>
      </Sheet>
    </>
  );
};

export const sheetDoc: RegistryEntry = {
  id: "sheet",
  title: "Sheet",
  category: "Components",
  description:
    "A bottom-docked modal variant. Highly adaptive: uses touch drag-handles and safe-area insets on mobile, while centering and constraining its width on landscape tablets to avoid awkward stretching.",
  sections: [
    {
      type: "playground",
      title: "Playground",
      playground: {
        controls: [
          { name: "title", type: "text", defaultValue: "Filters" },
          { name: "preventOutsideClick", type: "boolean", defaultValue: false },
        ] as DocControl<SheetState>[],
        render: (state: SheetState) => <SheetPlaygroundDemo state={state} />,
        code: (state: SheetState) => {
          const props = [
            `isOpen={isOpen}`,
            `onClose={() => setIsOpen(false)}`,
            state.title && `title="${state.title}"`,
            state.preventOutsideClick && `preventOutsideClick`,
          ]
            .filter(Boolean)
            .join("\n  ");

          return `<Sheet\n  ${props}\n>\n  <FilterControls />\n</Sheet>`;
        },
      },
    },
    {
      type: "props",
      title: "Props",
      propsList: [
        {
          name: "isOpen",
          type: "boolean",
          default: "false",
          notes: "Controlled state determining visibility.",
        },
        {
          name: "onClose",
          type: "function",
          default: "—",
          notes: "Triggered on close affordances.",
        },
        {
          name: "title",
          type: "ReactNode",
          default: "—",
          notes: "Renders in the sticky top header.",
        },
        {
          name: "preventOutsideClick",
          type: "boolean",
          default: "false",
          notes: "Forces the user to interact with the sheet's explicit actions to dismiss.",
        },
      ],
    },
  ],
};
