import React from "react";
import base from "./ButtonBase.module.css";
import styles from "./Button.module.css";
import { cx } from "@/components/utils";
import { Icon, type IconWeight } from "@/components/icon/Icon";
import type { IconName } from "@/design-system/icons";

type ButtonVariant = "hero" | "primary" | "secondary" | "danger" | "ghost";

type ButtonSize = "sm" | "md" | "lg";
type ButtonShape = "rounded" | "pill";

const variantClass: Record<ButtonVariant, string> = {
  hero: styles.btnHero,
  primary: base.btnPrimary,
  secondary: base.btnSecondary,
  danger: base.btnDanger,
  ghost: base.btnGhost,
};

const sizeClass: Record<ButtonSize, string> = {
  sm: styles.btnSm,
  md: styles.btnMd,
  lg: styles.btnLg,
};

const iconSizeBySize: Record<ButtonSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: React.Ref<HTMLButtonElement>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  iconWeight?: IconWeight;
}

export const Button = ({
  variant = "primary",
  size = "md",
  shape = "rounded",
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  iconWeight = "regular",
  disabled,
  type = "button",
  className = "",
  children,
  ref,
  ...props
}: ButtonProps) => {
  const isDisabled = disabled || loading;
  const iconSize = iconSizeBySize[size];

  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        base.btn,
        variantClass[variant],
        sizeClass[size],
        shape === "pill" && base.btnPill,
        fullWidth && base.btnFullWidth,
        className,
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {variant === "hero" && <span className={styles.btnHeroStars} aria-hidden="true" />}

      {loading ? (
        <span className={base.btnSpinner} aria-hidden="true" />
      ) : (
        leftIcon && <Icon name={leftIcon} size={iconSize} weight={iconWeight} />
      )}
      <span className={base.btnContent}>{children}</span>
      {!loading && rightIcon && <Icon name={rightIcon} size={iconSize} weight={iconWeight} />}
    </button>
  );
};
