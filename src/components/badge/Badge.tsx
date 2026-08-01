import React, { forwardRef } from "react";
import styles from "./Badge.module.css";
import { cx } from "@/components/utils";
import { Icon, type IconName } from "@/components/icon/Icon";

export type BadgeColor =
  | "primary"
  | "accent"
  | "danger"
  | "building"
  | "learning"
  | "exploring"
  | "practicing"
  | "habit"
  | "maintaining"
  | "muted";

export type BadgeVariant = "solid" | "soft" | "outlined";
export type BadgeSize = "sm" | "md";
export type BadgeFont = "body" | "mono";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
  variant?: BadgeVariant;
  size?: BadgeSize;
  font?: BadgeFont;
  icon?: IconName;
}

const iconSizeBySize: Record<BadgeSize, number> = {
  sm: 12,
  md: 14,
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      color = "primary",
      variant = "soft",
      size = "sm",
      font = "body",
      icon,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <span
        ref={ref}
        className={cx(
          styles.badge,
          styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`],
          styles[`color${color.charAt(0).toUpperCase() + color.slice(1)}`],
          styles[`variant${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
          styles[`font${font.charAt(0).toUpperCase() + font.slice(1)}`],
          className,
        )}
        {...props}
      >
        {icon && <Icon name={icon} size={iconSizeBySize[size]} />}
        <span>{children}</span>
      </span>
    );
  },
);

Badge.displayName = "Badge";
