import React from "react";
import { iconRegistry, type IconName } from "@/design-system/icons";
import { cx } from "@/components/utils";
import styles from "./Icon.module.css";

export type IconWeight = "thin" | "regular" | "bold";
export type IconTint =
  | "main"
  | "muted"
  | "primary"
  | "accent"
  | "danger"
  | "building"
  | "exploring"
  | "practicing";

export type IconVariant = "standard" | "secondary-filled";

const strokeWidthByWeight: Record<IconWeight, number> = {
  thin: 1.5,
  regular: 2,
  bold: 2.5,
};

const tintClass: Record<IconTint, string> = {
  main: styles.tintMain,
  muted: styles.tintMuted,
  primary: styles.tintPrimary,
  accent: styles.tintAccent,
  danger: styles.tintDanger,
  building: styles.tintBuilding,
  exploring: styles.tintExploring,
  practicing: styles.tintPracticing,
};

const variantClass: Record<IconVariant, string> = {
  standard: styles.variantStandard,
  "secondary-filled": styles.variantSecondaryFilled,
};

export interface IconProps extends Omit<React.SVGAttributes<SVGSVGElement>, "name" | "color"> {
  name: IconName;
  size?: number | string;
  weight?: IconWeight;
  tint?: IconTint;
  variant?: IconVariant;
}

export const Icon = ({
  name,
  size = "1.25rem",
  weight = "regular",
  tint = "main",
  variant = "standard",
  className,
  ...props
}: IconProps) => {
  const RenderedIcon = iconRegistry[name];

  return (
    <span className={cx(styles.iconWrapper, variantClass[variant], tintClass[tint], className)}>
      <RenderedIcon
        size={size}
        strokeWidth={strokeWidthByWeight[weight]}
        aria-hidden="true"
        {...props}
      />
    </span>
  );
};

export type { IconName };
