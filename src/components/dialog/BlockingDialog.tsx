import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./BlockingDialog.module.css";
import { cx } from "@/components/utils";
import { Card } from "@/components/card/Card";
import { Button } from "@/components/button/Button";
import { Logger } from "@/core/logging/logger";

export type BlockingDialogSize = "sm" | "md" | "lg";

export interface BlockingDialogAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
  loading?: boolean;
  disabled?: boolean;
}

export interface BlockingDialogProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  /** 1–2 actions. There's no other way out of this modal, so keep it real. */
  actions: BlockingDialogAction[];
  size?: BlockingDialogSize;
  className?: string;
  /** id of the app's mount root to make inert + aria-hidden while this is up. */
  appRootId?: string;
}

export const BlockingDialog = ({
  title,
  children,
  actions,
  size = "sm",
  className,
  appRootId = "root",
}: BlockingDialogProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  if (actions.length < 1 || actions.length > 2) {
    Logger.ui.warn(`BlockingDialog: expected 1–2 actions, got ${actions.length}.`);
  }

  useEffect(() => {
    const appRoot = document.getElementById(appRootId);
    const originalOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    document.body.style.overflow = "hidden";
    appRoot?.setAttribute("inert", "");
    appRoot?.setAttribute("aria-hidden", "true");
    wrapperRef.current?.querySelector<HTMLButtonElement>("button")?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
      appRoot?.removeAttribute("inert");
      appRoot?.removeAttribute("aria-hidden");
      previouslyFocused?.focus?.();
    };
  }, [appRootId]);

  if (typeof document === "undefined") {
    return null;
  }

  const modalContent = (
    <div className={styles.overlay} role="presentation">
      <div
        ref={wrapperRef}
        className={cx(
          styles.modalWrapper,
          styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`],
          className,
        )}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={title ? "blocking-modal-title" : undefined}
      >
        <Card as="section" variant="elevated" padding="none" radius="xl">
          {title && (
            <header className={styles.header}>
              <h2 id="blocking-modal-title" className={styles.title}>
                {title}
              </h2>
            </header>
          )}
          <div className={styles.body}>{children}</div>
          <footer className={styles.footer}>
            {actions.map((action, i) => (
              <Button
                key={action.label}
                variant={action.variant ?? (i === actions.length - 1 ? "primary" : "secondary")}
                loading={action.loading}
                disabled={action.disabled}
                onClick={action.onClick}
                className={styles.actionButton}
              >
                {action.label}
              </Button>
            ))}
          </footer>
        </Card>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
