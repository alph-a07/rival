import React, { useCallback, useEffect, useState } from "react";
import styles from "./Toast.module.css";
import { cx } from "@/components/utils";
import { IconButton } from "@/components/icon-button/IconButton";
import { Icon } from "@/components/icon/Icon";
import type { IconName } from "@/design-system/icons";

export type ToastVariant = "info" | "warning" | "error" | "success";

export interface ToastProps {
  id: string;
  variant?: ToastVariant;
  title?: string;
  message: string;
  icon?: IconName;
  duration?: number;
  onClose: (id: string) => void;
}

const defaultIcons: Record<ToastVariant, IconName> = {
  info: "info",
  warning: "warning",
  error: "error",
  success: "success",
};

export const Toast = ({
  id,
  variant = "info",
  title,
  message,
  icon,
  duration = 4000,
  onClose,
}: ToastProps) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Wait for the exit animation to finish before unmounting from DOM
    setTimeout(() => {
      onClose(id);
    }, 150); // Matches var(--duration-hover)
  }, [id, onClose]);

  // Handle auto-dismiss
  useEffect(() => {
    if (duration === Infinity) {
      return;
    }

    const timer = setTimeout(() => {
      handleClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, handleClose]);

  return (
    <div
      className={cx(
        styles.toast,
        styles[`variant${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
        isClosing && styles.toastClosing,
      )}
      role="status"
      aria-live="polite"
    >
      <div className={styles.iconWrapper} aria-hidden="true">
        {/* We reuse the tint logic from the Icon component itself */}
        <Icon name={icon || defaultIcons[variant]} size={18} tint={variant} />
      </div>

      <div className={styles.content}>
        {title && <h4 className={styles.title}>{title}</h4>}
        <p className={styles.message}>{message}</p>
      </div>

      <div className={styles.closeButtonWrapper}>
        <IconButton
          icon="close"
          size="sm"
          variant="ghost"
          aria-label="Dismiss notification"
          onClick={handleClose}
        />
      </div>
    </div>
  );
};

// Exported purely for documentation/layout structuring
export const ToastContainer = ({ children }: { children: React.ReactNode }) => (
  <div className={styles.toastContainer} aria-live="polite">
    {children}
  </div>
);
