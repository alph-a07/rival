import React, { forwardRef, useRef, useId } from "react";
import styles from "./Input.module.css";
import { cx } from "@/components/utils";
import { Icon, type IconSize } from "@/components/icon/Icon";
import type { IconName } from "@/design-system/icons";

export type InputSize = "sm" | "md" | "lg";
export type InputShape = "rounded" | "pill";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: InputSize;
  shape?: InputShape;
  label?: string;
  error?: boolean;
  success?: boolean;
  errorMessage?: string;
  successMessage?: string;
  helperText?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  iconSize?: IconSize;
  fullWidth?: boolean;
  containerClassName?: string;
  inputClassName?: string;
}

const iconSizeBySize: Record<InputSize, IconSize> = {
  sm: "xs",
  md: "sm",
  lg: "md",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = "md",
      shape = "rounded",
      label,
      error = false,
      success = false,
      errorMessage,
      successMessage,
      helperText,
      leftIcon,
      rightIcon,
      iconSize,
      fullWidth = false,
      disabled = false,
      className,
      containerClassName,
      inputClassName,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id || useId();
    const resolvedIconSize = iconSize ?? iconSizeBySize[size];

    // Abstract modifiers for cleaner JSX
    const sizeModifier = size.charAt(0).toUpperCase() + size.slice(1);
    const shapeModifier = shape.charAt(0).toUpperCase() + shape.slice(1);

    const showErrorMessage = Boolean(error && errorMessage);
    const showSuccessMessage = Boolean(success && successMessage && !error);
    const showHelperText = Boolean(helperText && !showErrorMessage && !showSuccessMessage);

    const activeMessageType = showErrorMessage
      ? "error"
      : showSuccessMessage
        ? "success"
        : showHelperText
          ? "helper"
          : null;

    const lastActiveMessage = useRef({
      text:
        (showErrorMessage ? errorMessage : showSuccessMessage ? successMessage : helperText) ||
        "\u00A0",
      type: activeMessageType,
    });

    if (activeMessageType !== null) {
      lastActiveMessage.current = {
        text:
          (activeMessageType === "error"
            ? errorMessage
            : activeMessageType === "success"
              ? successMessage
              : helperText) || "\u00A0",
        type: activeMessageType,
      };
    }

    const displayType =
      activeMessageType !== null ? activeMessageType : lastActiveMessage.current.type;
    const displayText =
      activeMessageType !== null
        ? activeMessageType === "error"
          ? errorMessage
          : activeMessageType === "success"
            ? successMessage
            : helperText
        : lastActiveMessage.current.text;

    const errorId = `${inputId}-error`;
    const successId = `${inputId}-success`;
    const helperId = `${inputId}-helper`;

    const describedBy =
      [showErrorMessage && errorId, showSuccessMessage && successId, showHelperText && helperId]
        .filter(Boolean)
        .join(" ") || undefined;

    return (
      <div className={cx(styles.wrapper, fullWidth && styles.fullWidth, className)}>
        {label && (
          <label htmlFor={inputId} className={cx(styles.label, styles[`label${sizeModifier}`])}>
            {label}
          </label>
        )}

        <div
          className={cx(
            styles.inputContainer,
            styles[`size${sizeModifier}`],
            styles[`shape${shapeModifier}`],
            error && styles.error,
            success && !error && styles.success,
            disabled && styles.disabled,
            containerClassName,
          )}
        >
          {leftIcon && (
            <span className={styles.adornment} aria-hidden="true">
              <Icon name={leftIcon} size={resolvedIconSize} tint="muted" />
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            type={props.type || "text"}
            disabled={disabled}
            className={cx(styles.inputElement, inputClassName)}
            aria-invalid={error}
            aria-describedby={describedBy}
            {...props}
          />

          {rightIcon && (
            <span className={styles.adornment} aria-hidden="true">
              <Icon name={rightIcon} size={resolvedIconSize} tint="muted" />
            </span>
          )}
        </div>

        <div className={cx(styles.messageWrapper, activeMessageType !== null && styles.hasMessage)}>
          <div className={styles.messageInner}>
            <span
              id={
                displayType === "error" ? errorId : displayType === "success" ? successId : helperId
              }
              className={cx(
                styles.message,
                styles[`message${sizeModifier}`],
                activeMessageType !== null && styles.messageVisible,
                displayType === "error" && styles.messageError,
                displayType === "success" && styles.messageSuccess,
                displayType === "helper" && styles.messageHelper,
              )}
              role={
                displayType === "error" ? "alert" : displayType === "success" ? "status" : undefined
              }
            >
              {displayText || "\u00A0"}
            </span>
          </div>
        </div>
      </div>
    );
  },
);

Input.displayName = "Input";
