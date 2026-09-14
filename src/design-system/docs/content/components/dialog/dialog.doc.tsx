import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { Dialog } from "@/components/dialog/Dialog";
import { Button } from "@/components/button/Button";
import { useState } from "react";

interface DialogState {
  size: "sm" | "md" | "lg";
  hideHeader: boolean;
  title: string;
}

const DialogPlaygroundDemo = ({ state }: { state: DialogState }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Dialog</Button>
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size={state.size}
        title={state.title}
        hideHeader={state.hideHeader}
      >
        <div style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>
          This is the internal content slot of the dialog. Higher level features (like the
          SwitchDomain form) are passed in here as children. It naturally scrolls if the content
          exceeds the viewport height.
        </div>
        <div
          style={{
            marginTop: "2rem",
            display: "flex",
            justifyContent: "flex-end",
            gap: "1rem",
          }}
        >
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setIsOpen(false)}>Confirm Action</Button>
        </div>
      </Dialog>
    </>
  );
};

export const dialogDoc: RegistryEntry = {
  id: "dialog",
  title: "Dialog",
  category: "Components",
  description:
    "A foundational modal overlay that utilizes the Card component for its surface. It handles body scroll locking, Escape key dismissal, and portaling out-of-the-box.",
  sections: [
    {
      type: "playground",
      title: "Playground",
      playground: {
        controls: [
          { name: "size", type: "radio", options: ["sm", "md", "lg"], defaultValue: "md" },
          { name: "hideHeader", type: "boolean", defaultValue: false },
          { name: "title", type: "text", defaultValue: "Switch Domain" },
        ] as DocControl<DialogState>[],
        render: (state: DialogState) => <DialogPlaygroundDemo state={state} />,
        code: (state: DialogState) => {
          const props = [
            `isOpen={isOpen}`,
            `onClose={() => setIsOpen(false)}`,
            state.size !== "md" && `size="${state.size}"`,
            state.title && `title="${state.title}"`,
            state.hideHeader && `hideHeader`,
          ]
            .filter(Boolean)
            .join("\n  ");

          return `<Dialog\n  ${props}\n>\n  <SwitchDomainForm />\n</Dialog>`;
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
          notes: "Triggered on backdrop click, Escape key press, or X button click.",
        },
        {
          name: "size",
          type: "sm · md · lg",
          default: "md",
          notes: "Constrains the maximum width of the dialog container.",
        },
        {
          name: "title",
          type: "ReactNode",
          default: "—",
          notes: "Renders as an h2 in the header if provided.",
        },
        {
          name: "hideHeader",
          type: "boolean",
          default: "false",
          notes: "Removes the default title and close button header for custom full-bleed content.",
        },
      ],
    },
  ],
};
