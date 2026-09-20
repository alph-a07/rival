import React, { forwardRef } from "react";
import type { IconSize } from "@/components/icon/Icon";
import styles from "./Logo.module.css";
import { cx } from "@/components/utils";
import { useTheme } from "@/theme/ThemeContext";

import darkLogo from "@/assets/brand/logo/dark/foreground.svg";
import lightLogo from "@/assets/brand/logo/light/foreground.svg";
import monoWhite from "@/assets/brand/logo/mono/white.svg";
import monoBlack from "@/assets/brand/logo/mono/black.svg";

export interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "colored" | "monochrome";
  size?: IconSize;
  hasBackground?: boolean;
}

export const Logo = forwardRef<HTMLDivElement, LogoProps>(
  ({ variant = "colored", size = "xl", hasBackground = false, className, ...props }, ref) => {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    let src = lightLogo;
    if (variant === "colored") {
      src = isDark ? darkLogo : lightLogo;
    } else {
      src = isDark ? monoWhite : monoBlack;
    }

    return (
      <div
        ref={ref}
        style={{ width: `var(--icon-size-${size})`, height: `var(--icon-size-${size})` }}
        className={cx(styles.logo, hasBackground && styles.hasBackground, className)}
        {...props}
      >
        <img
          src={src}
          alt="Company Logo"
          className={cx(styles.image, variant === "monochrome" && styles.monochrome)}
        />
      </div>
    );
  },
);

Logo.displayName = "Logo";
