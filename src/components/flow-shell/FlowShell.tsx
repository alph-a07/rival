import React from "react";
import styles from "./FlowShell.module.css";
import { cx } from "@/components/utils";
import { IconButton } from "@/components/icon-button/IconButton";

export interface FlowShellProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  backAriaLabel?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const FlowShell = ({
  title,
  subtitle,
  onBack,
  backAriaLabel = "Go back",
  action,
  children,
  className,
}: FlowShellProps) => {
  return (
    <div className={cx(styles.shell, className)}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {onBack && (
            <IconButton
              icon="chevronLeft"
              aria-label={backAriaLabel}
              variant="ghost"
              size="md"
              onClick={onBack}
            />
          )}
        </div>

        {(title || subtitle) && (
          <div className={styles.titleContainer}>
            {title && <h1 className={styles.title}>{title}</h1>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
        )}

        <div className={styles.headerRight}>{action}</div>
      </header>

      <main className={styles.body}>{children}</main>
    </div>
  );
};
