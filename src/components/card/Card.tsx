import React, { forwardRef } from "react";
import styles from "./Card.module.css";
import { cx } from "@/components/utils";

export type CardVariant = "elevated" | "outlined" | "filled" | "glow";
export type CardPadding = "none" | "sm" | "md" | "lg";
export type CardRadius = "sm" | "md" | "lg" | "xl";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: "div" | "article" | "section" | "aside" | "main";
  variant?: CardVariant;
  padding?: CardPadding;
  radius?: CardRadius;
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      as: Component = "div",
      variant = "outlined",
      padding = "md",
      radius = "lg",
      interactive = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <Component
        ref={ref as any}
        className={cx(
          styles.card,
          styles[`variant${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
          styles[`padding${padding.charAt(0).toUpperCase() + padding.slice(1)}`],
          styles[`radius${radius.charAt(0).toUpperCase() + radius.slice(1)}`],
          interactive && styles.interactive,
          className,
        )}
        {...props}
      >
        {children}
      </Component>
    );
  },
);

Card.displayName = "Card";
