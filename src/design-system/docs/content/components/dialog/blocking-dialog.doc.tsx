import type { DocControl, RegistryEntry } from "@/design-system/docs/types/registry.types";
import { Button } from "@/components/button/Button";
import { useState } from "react";
import { BlockingDialog, type BlockingDialogAction } from "@/components/dialog/BlockingDialog";

interface BlockingDialogState {
  size: "sm" | "md" | "lg";
  title: string;
  actionCount: "1" | "2";
}

const BlockingDialogPlaygroundDemo = ({ state }: { state: BlockingDialogState }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return <Button onClick={() => setIsOpen(true)}>Trigger Blocking Dialog</Button>;
  }

  const actions: BlockingDialogAction[] =
    state.actionCount === "2"
      ? [
          { label: "Cancel", variant: "secondary", onClick: () => setIsOpen(false) },
          { label: "Confirm", variant: "primary", onClick: () => setIsOpen(false) },
        ]
      : [{ label: "Got it", variant: "primary", onClick: () => setIsOpen(false) }];

  return (
    <BlockingDialog title={state.title} size={state.size} actions={actions}>
      This dialog can't be dismissed by clicking outside, pressing Escape, or tabbing into the app
      behind it — only by choosing one of the actions below.
    </BlockingDialog>
  );
};

export const blockingDialogDoc: RegistryEntry = {
  id: "blocking-dialog",
  title: "Blocking Dialog",
  parent: "dialog",
  category: "Components",
  description:
    "An unskippable dialog for state the user must resolve before doing anything else (forced update, expired session). No close button, no backdrop or Escape dismissal, and the app behind it is made inert — not just visually blurred.",
  sections: [
    {
      type: "playground",
      title: "Playground",
      playground: {
        controls: [
          { name: "size", type: "radio", options: ["sm", "md", "lg"], defaultValue: "sm" },
          { name: "title", type: "text", defaultValue: "Update required" },
          { name: "actionCount", type: "radio", options: ["1", "2"], defaultValue: "2" },
        ] as DocControl<BlockingDialogState>[],
        render: (state: BlockingDialogState) => <BlockingDialogPlaygroundDemo state={state} />,
        code: (state: BlockingDialogState) => {
          const actions =
            state.actionCount === "2"
              ? `[\n    { label: "Cancel", variant: "secondary", onClick: handleCancel },\n    { label: "Confirm", variant: "primary", onClick: handleConfirm },\n  ]`
              : `[{ label: "Got it", variant: "primary", onClick: handleConfirm }]`;
          return `<BlockingDialog\n  title="${state.title}"\n  size="${state.size}"\n  actions={${actions}}\n>\n  This dialog requires a choice before the user can continue.\n</BlockingDialog>`;
        },
      },
    },
    {
      type: "props",
      title: "Props",
      propsList: [
        {
          name: "title",
          type: "ReactNode",
          default: "—",
          notes: "Optional heading; omit for a body-only dialog.",
        },
        {
          name: "actions",
          type: "BlockingDialogAction[]",
          default: "—",
          notes: "1–2 actions, rendered as equal-weight filled buttons — there's no other way out.",
        },
        {
          name: "size",
          type: "sm · md · lg",
          default: "sm",
          notes: "Constrains the maximum width.",
        },
        {
          name: "appRootId",
          type: "string",
          default: '"root"',
          notes: "id of the app mount node made inert + aria-hidden while open.",
        },
      ],
    },
  ],
};
