import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./Sheet.module.css";
import { cx } from "@/components/utils";
import { IconButton } from "@/components/icon-button/IconButton";

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  preventOutsideClick?: boolean;
}

export const Sheet = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  preventOutsideClick = false,
}: SheetProps) => {
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (preventOutsideClick) {
      return;
    }
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const sheetContent = (
    <div
      ref={overlayRef}
      className={styles.overlay}
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <div
        className={cx(styles.sheet, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "sheet-title" : undefined}
      >
        {/* Touch Affordance Drag Handle */}
        <div className={styles.dragHandleContainer} aria-hidden="true">
          <div className={styles.dragHandle} />
        </div>

        <header className={styles.header}>
          {title ? (
            <h2 id="sheet-title" className={styles.title}>
              {title}
            </h2>
          ) : (
            <div />
          )}

          {/* Ensure close button meets 44px min-target on touch devices */}
          <IconButton
            icon="close"
            aria-label="Close sheet"
            variant="ghost"
            size="md"
            onClick={onClose}
          />
        </header>

        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );

  return createPortal(sheetContent, document.body);
};
