import React from "react";
import styles from "./Typography.module.css";
import { cx } from "@/components/utils";

export type TextSize = "xs" | "sm" | "md" | "lg";
export type TextColor = "main" | "muted" | "primary" | "danger" | "success" | "info" | "warning";

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5;
  weight?: "reading" | "bold";
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p";
}

export const Heading = ({
  level = 2,
  weight = "bold",
  as,
  className,
  children,
  ...props
}: HeadingProps) => {
  const Component = as || (`h${level}` as any);
  return (
    <Component
      className={cx(
        styles.base,
        styles.heading,
        styles[`h${level}`],
        styles[`weightClash${weight.charAt(0).toUpperCase() + weight.slice(1)}`],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  as?: "p" | "span" | "div";
  size?: TextSize;
  weight?: "reading" | "medium" | "bold";
  color?: TextColor;
}

export const Text = ({
  as: Component = "p",
  size = "md",
  weight = "reading",
  color = "main",
  className,
  children,
  ...props
}: TextProps) => {
  return (
    <Component
      className={cx(
        styles.base,
        styles.text,
        styles[`text${size.charAt(0).toUpperCase() + size.slice(1)}`],
        styles[`weightSatoshi${weight.charAt(0).toUpperCase() + weight.slice(1)}`],
        styles[`color${color.charAt(0).toUpperCase() + color.slice(1)}`],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

export interface MonoProps extends React.HTMLAttributes<HTMLSpanElement> {
  as?: "span" | "div" | "p";
  size?: TextSize;
  weight?: "reading" | "medium"; // Maps to 400, 500
  color?: TextColor;
}

export const Mono = ({
  as: Component = "span",
  size = "sm",
  weight = "reading",
  color = "main",
  className,
  children,
  ...props
}: MonoProps) => {
  return (
    <Component
      className={cx(
        styles.base,
        styles.mono,
        styles[`text${size.charAt(0).toUpperCase() + size.slice(1)}`],
        styles[`weightMono${weight.charAt(0).toUpperCase() + weight.slice(1)}`],
        styles[`color${color.charAt(0).toUpperCase() + color.slice(1)}`],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  muted?: boolean;
}

export const Label = ({ muted = false, className, children, ...props }: LabelProps) => {
  return (
    <label
      className={cx(
        styles.base,
        styles.label,
        muted ? styles.labelMuted : styles.labelMain,
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
};
