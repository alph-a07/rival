import React, { forwardRef, useRef, useState, useEffect, useId } from "react";
import styles from "./Input.module.css";
import { cx } from "@/components/utils";
import { IconButton } from "@/components/icon-button/IconButton";

export type StepperSize = "sm" | "md" | "lg";
export type StepperShape = "rounded" | "pill";

export interface StepperProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size" | "type"
> {
  size?: StepperSize;
  shape?: StepperShape;
  label?: string;
  error?: boolean;
  success?: boolean;
  errorMessage?: string;
  successMessage?: string;
  helperText?: string;
  fullWidth?: boolean;
  incrementDisabled?: boolean;
  decrementDisabled?: boolean;
  containerClassName?: string;
  inputClassName?: string;
}

export const Stepper = forwardRef<HTMLInputElement, StepperProps>(
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
      fullWidth = false,
      disabled = false,
      incrementDisabled = false,
      decrementDisabled = false,
      className,
      containerClassName,
      inputClassName,
      step = 1,
      min,
      max,
      onKeyDown,
      onChange,
      id,
      ...props
    },
    ref,
  ) => {
    const innerRef = useRef<HTMLInputElement>(null);
    const inputId = id || useId();

    const sizeModifier = size.charAt(0).toUpperCase() + size.slice(1);
    const shapeModifier = shape.charAt(0).toUpperCase() + shape.slice(1);

    const setRefs = (node: HTMLInputElement) => {
      innerRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as React.RefObject<HTMLInputElement>).current = node;
      }
    };

    const [internalVal, setInternalVal] = useState<string>(
      props.value?.toString() ?? props.defaultValue?.toString() ?? "",
    );

    useEffect(() => {
      if (props.value !== undefined) {
        setInternalVal(props.value.toString());
      }
    }, [props.value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalVal(e.target.value);
      onChange?.(e);
    };

    const numVal = parseFloat(internalVal);
    const hasValue = internalVal.trim() !== "" && !isNaN(numVal);

    // Auto-detect boundary violations
    const isOutOfRange =
      hasValue &&
      ((min !== undefined && numVal < Number(min)) || (max !== undefined && numVal > Number(max)));

    let rangeMessage = "";
    if (min !== undefined && max !== undefined) {
      rangeMessage = `Must be between ${min} and ${max}`;
    } else if (min !== undefined) {
      rangeMessage = `Must be at least ${min}`;
    } else if (max !== undefined) {
      rangeMessage = `Cannot exceed ${max}`;
    }

    const effectiveError = error || isOutOfRange;
    const effectiveErrorMessage = isOutOfRange ? rangeMessage : errorMessage;

    const showErrorMessage = Boolean(effectiveError && effectiveErrorMessage);
    const showSuccessMessage = Boolean(success && successMessage && !effectiveError);
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
        (showErrorMessage
          ? effectiveErrorMessage
          : showSuccessMessage
            ? successMessage
            : helperText) || "\u00A0",
      type: activeMessageType,
    });

    if (activeMessageType !== null) {
      lastActiveMessage.current = {
        text:
          (activeMessageType === "error"
            ? effectiveErrorMessage
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
          ? effectiveErrorMessage
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

    const handleStep = (direction: 1 | -1) => {
      if (disabled) {
        return;
      }

      const input = innerRef.current;
      if (!input) {
        return;
      }

      let currentVal = parseFloat(input.value);

      if (isNaN(currentVal)) {
        currentVal = parseFloat(input.placeholder);
        if (isNaN(currentVal)) {
          currentVal = 0;
        }
      }

      const stepVal = parseFloat(step.toString()) || 1;
      let nextVal = currentVal + stepVal * direction;

      const maxVal = max !== undefined ? parseFloat(max.toString()) : undefined;
      const minVal = min !== undefined ? parseFloat(min.toString()) : undefined;

      if (maxVal !== undefined && !isNaN(maxVal)) {
        nextVal = Math.min(nextVal, maxVal);
      }
      if (minVal !== undefined && !isNaN(minVal)) {
        nextVal = Math.max(nextVal, minVal);
      }

      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeSetter?.call(input, nextVal.toString());
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event);
      if (disabled || event.defaultPrevented) {
        return;
      }

      if (["e", "E", "+"].includes(event.key)) {
        event.preventDefault();
      }

      if (event.key === "ArrowUp" && !incrementDisabled) {
        event.preventDefault();
        handleStep(1);
      } else if (event.key === "ArrowDown" && !decrementDisabled) {
        event.preventDefault();
        handleStep(-1);
      }
    };

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
            styles.stepperContainer,
            styles[`size${sizeModifier}`],
            styles[`shape${shapeModifier}`],
            effectiveError && styles.error,
            success && !effectiveError && styles.success,
            disabled && styles.disabled,
            containerClassName,
          )}
        >
          <IconButton
            variant="ghost"
            size={size}
            icon="minus"
            aria-label="Decrease value"
            onClick={(e) => {
              e.preventDefault();
              handleStep(-1);
            }}
            disabled={
              disabled ||
              decrementDisabled ||
              (min !== undefined && hasValue && numVal <= Number(min))
            }
            tabIndex={-1}
            className={styles.stepperBtn}
          />

          <input
            ref={setRefs}
            id={inputId}
            type="number"
            disabled={disabled}
            className={cx(styles.inputElement, styles.stepperInput, inputClassName)}
            aria-invalid={effectiveError}
            aria-describedby={describedBy}
            inputMode="decimal"
            step={step}
            min={min}
            max={max}
            {...props}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
          />

          <IconButton
            variant="ghost"
            size={size}
            icon="add"
            aria-label="Increase value"
            onClick={(e) => {
              e.preventDefault();
              handleStep(1);
            }}
            disabled={
              disabled ||
              incrementDisabled ||
              (max !== undefined && hasValue && numVal >= Number(max))
            }
            tabIndex={-1}
            className={styles.stepperBtn}
          />
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

Stepper.displayName = "Stepper";
