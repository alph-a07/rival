import styles from "./ProgressDots.module.css";
import { cx } from "@/components/utils";

export interface ProgressDotsProps {
  total: number;
  current: number;
  className?: string;
}

export const ProgressDots = ({ total, current, className }: ProgressDotsProps) => {
  return (
    <div
      className={cx(styles.container, className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total - 1}
      aria-valuenow={current}
    >
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={cx(styles.dot, index === current && styles.dotActive)}
          aria-hidden="true"
        />
      ))}
    </div>
  );
};
