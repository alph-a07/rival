import React from "react";
import styles from "./Divider.module.css";
import { cx } from "@/components/utils";

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export const Divider = ({ label, className, ...props }: DividerProps) => {
  if (!label) {
    return <hr className={cx(styles.line, className)} {...props} />;
  }

  return (
    <div className={cx(styles.divider, className)} role="separator" {...props}>
      <div className={styles.line} />
      <span className={styles.label}>{label}</span>
      <div className={styles.line} />
    </div>
  );
};
