import React from "react";
import styles from "./Alert.module.css";
import { cx } from "@/components/utils";
import { Icon } from "@/components/icon/Icon";
import type { IconName } from "@/design-system/icons";

export type AlertVariant = "info" | "warning" | "error" | "success";

/** Presentation type for the alert.
 * - `inline`: The alert is displayed inline with the content.
 * - `banner`: The alert is displayed as a banner at the top of the page for mobile devices, and inline for wider viewports.
 */
export type AlertPresentation = "inline" | "banner";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  icon?: IconName;
  action?: React.ReactNode;
  presentation?: AlertPresentation;
}

const defaultIcons: Record<AlertVariant, IconName> = {
  info: "info",
  warning: "warning",
  error: "error",
  success: "success",
};

export const Alert = ({
  variant = "info",
  title,
  children,
  icon,
  action,
  presentation = "inline",
  className,
  ...props
}: AlertProps) => {
  const isError = variant === "error";

  return (
    <div
      className={cx(
        styles.alert,
        styles[`variant${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
        presentation === "banner" && styles.banner,
        className,
      )}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      {...props}
    >
      <div className={styles.icon} aria-hidden="true">
        <Icon name={icon || defaultIcons[variant]} size={20} tint={variant} />
      </div>
      <div className={styles.content}>
        <div className={styles.textBlock}>
          {title && <h4 className={styles.title}>{title}</h4>}
          <div className={styles.message}>{children}</div>
        </div>
        {action && <div className={styles.action}>{action}</div>}
      </div>
    </div>
  );
};
