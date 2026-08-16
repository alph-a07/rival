import React from "react";
import styles from "./Alert.module.css";
import { cx } from "@/components/utils";
import { Icon } from "@/components/icon/Icon";
import type { IconName } from "@/design-system/icons";

export type AlertVariant = "info" | "warning" | "error" | "success";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  icon?: IconName;
  action?: React.ReactNode;
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
  className,
  ...props
}: AlertProps) => {
  const isError = variant === "error";

  return (
    <div
      className={cx(
        styles.alert,
        styles[`variant${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
        className,
      )}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      {...props}
    >
      <div className={styles.icon} aria-hidden="true">
        <Icon name={icon || defaultIcons[variant]} size={20} />
      </div>
      <div className={styles.content}>
        {title && <h4 className={styles.title}>{title}</h4>}
        <div className={styles.message}>{children}</div>
        {action && <div className={styles.action}>{action}</div>}
      </div>
    </div>
  );
};
