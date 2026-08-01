import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./Dialog.module.css";
import { cx } from "@/components/utils";
import { Card } from "@/components/card/Card";
import { IconButton } from "@/components/icon-button/IconButton";

export type DialogSize = "sm" | "md" | "lg";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  size?: DialogSize;
  hideHeader?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Dialog = ({
  isOpen,
  onClose,
  title,
  size = "md",
  hideHeader = false,
  children,
  className,
}: DialogProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handle clicking outside the dialog card
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const dialogContent = (
    <div
      ref={overlayRef}
      className={styles.overlay}
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <div
        className={cx(
          styles.dialogWrapper,
          styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`],
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "dialog-title" : undefined}
      >
        <Card as="section" variant="elevated" padding="none" radius="xl">
          {!hideHeader && (
            <header className={styles.header}>
              {title ? (
                <h2 id="dialog-title" className={styles.title}>
                  {title}
                </h2>
              ) : (
                <div />
              )}
              <IconButton
                icon="close"
                aria-label="Close dialog"
                variant="ghost"
                size="sm"
                onClick={onClose}
              />
            </header>
          )}
          <div className={styles.body}>{children}</div>
        </Card>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};
