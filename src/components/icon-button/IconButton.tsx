import React from "react";
import base from "@/components/button/ButtonBase.module.css";
import styles from "./IconButton.module.css";
import { cx } from "@/components/utils";
import { Icon, type IconName, type IconWeight } from "@/components/icon/Icon";

export type IconButtonVariant = "primary" | "secondary" | "filled" | "danger" | "ghost";
type IconButtonSize = "sm" | "md" | "lg";
type IconButtonShape = "circle" | "rounded";

const variantClass: Record<IconButtonVariant, string> = {
  primary: base.btnPrimary,
  secondary: base.btnSecondary,
  filled: styles.btnSecondaryFilled,
  danger: base.btnDanger,
  ghost: base.btnGhost,
};

const sizeClass: Record<IconButtonSize, string> = {
  sm: styles.iconBtnSm,
  md: styles.iconBtnMd,
  lg: styles.iconBtnLg,
};

const iconSizeBySize: Record<IconButtonSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
};

export interface IconButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  ref?: React.Ref<HTMLButtonElement>;
  icon: IconName;
  "aria-label": string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  shape?: IconButtonShape;
  weight?: IconWeight;
  loading?: boolean;
}

export const IconButton = ({
  icon,
  variant = "ghost",
  size = "md",
  shape = "circle",
  weight = "regular",
  loading = false,
  disabled,
  type = "button",
  className = "",
  ref,
  ...props
}: IconButtonProps) => {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        base.btn,
        variantClass[variant],
        sizeClass[size],
        shape === "circle" && base.btnPill,
        className,
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      <span className={base.btnContent}>
        {loading ? (
          <span className={base.btnSpinner} aria-hidden="true" />
        ) : (
          <Icon name={icon} size={iconSizeBySize[size]} weight={weight} />
        )}
      </span>
    </button>
  );
};
