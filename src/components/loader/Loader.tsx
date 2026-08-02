import React, { forwardRef, useEffect, useRef } from "react";
import styles from "./Loader.module.css";
import { cx } from "@/components/utils";
import { useTheme } from "@/theme/ThemeContext";

export interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "colored" | "monochrome";
  size?: number | string;
  speed?: "slow" | "normal" | "fast";
}

const SPEED_MULTIPLIERS = {
  slow: 0.6,
  normal: 1.0,
  fast: 1.6,
};

export const Loader = forwardRef<HTMLDivElement, LoaderProps>(
  ({ variant = "colored", size = 32, speed = "normal", className, ...props }, forwardedRef) => {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const isColored = variant === "colored";

    const containerRef = useRef<HTMLDivElement>(null);

    // Refs for physics engine
    const speedRef = useRef(SPEED_MULTIPLIERS[speed] ?? 1.0);
    const isDarkRef = useRef(isDark);

    const flutter = useRef({ current: 0, target: 0, nextUpdate: 0 });
    const lick = useRef({ current: 1, target: 1, nextUpdate: 0 });

    const setRefs = (node: HTMLDivElement) => {
      containerRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    };

    // Keep refs in sync with props
    useEffect(() => {
      speedRef.current = SPEED_MULTIPLIERS[speed] ?? 1.0;
      isDarkRef.current = isDark;
    }, [speed, isDark]);

    useEffect(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      let animationFrame: number;
      let isActive = true;

      const loop = (time: number) => {
        if (!isActive) {
          return;
        }

        const currentSpeed = speedRef.current;
        const scaledTime = time * currentSpeed;

        if (time > flutter.current.nextUpdate) {
          const maxAngle = 1.2;
          flutter.current.target = (Math.random() * 2 - 1) * maxAngle;
          const interval = (40 + Math.random() * 80) / currentSpeed;
          flutter.current.nextUpdate = time + interval;
        }

        if (time > lick.current.nextUpdate) {
          const maxStretch = 1.015;
          lick.current.target = 1 + Math.random() * (maxStretch - 1);
          const interval = (30 + Math.random() * 60) / currentSpeed;
          lick.current.nextUpdate = time + interval;
        }

        const snapRate = Math.min(0.12 * currentSpeed, 1);

        flutter.current.current += (flutter.current.target - flutter.current.current) * snapRate;
        lick.current.current += (lick.current.target - lick.current.current) * snapRate;

        const ambientTremor = Math.sin(scaledTime * 0.012) * 0.4;

        const flutterSecondary = flutter.current.current + ambientTremor;
        const flutterPrimary = flutter.current.current * 1.3 - ambientTremor * 1.1;

        const lickSecondary = lick.current.current;
        const lickPrimary = 1 + (lick.current.current - 1) * 1.5;

        const squashSecondary = lickSecondary * Math.cos((flutterSecondary * Math.PI) / 180);
        const squashPrimary = lickPrimary * Math.cos((flutterPrimary * Math.PI) / 180);

        const pulse = Math.sin(scaledTime * 0.004);

        const basePrimaryOpacity = 0.95;
        const baseSecondaryOpacity = isDarkRef.current ? 0.9 : 0.7;

        const opacityPrimary = basePrimaryOpacity + pulse * 0.05;
        const opacitySecondary = baseSecondaryOpacity + pulse * 0.03;

        const glow = 0.05 + Math.abs(Math.sin(scaledTime * 0.005)) * 0.2;

        if (containerRef.current) {
          containerRef.current.style.setProperty("--flutter-secondary", `${flutterSecondary}deg`);
          containerRef.current.style.setProperty("--squash-secondary", `${squashSecondary}`);
          containerRef.current.style.setProperty("--opacity-secondary", `${opacitySecondary}`);

          containerRef.current.style.setProperty("--flutter-primary", `${flutterPrimary}deg`);
          containerRef.current.style.setProperty("--squash-primary", `${squashPrimary}`);
          containerRef.current.style.setProperty("--opacity-primary", `${opacityPrimary}`);

          containerRef.current.style.setProperty("--glow", `${glow}`);
        }

        animationFrame = requestAnimationFrame(loop);
      };

      animationFrame = requestAnimationFrame(loop);

      return () => {
        isActive = false;
        cancelAnimationFrame(animationFrame);
      };
    }, []);

    const sizeWithUnits = typeof size === "number" ? `${size}px` : size;

    return (
      <div
        ref={setRefs}
        style={{
          width: size,
          height: size,
          fontSize: sizeWithUnits,
        }}
        className={cx(styles.loader, className)}
        {...props}
      >
        <svg
          className={styles.svgRoot}
          viewBox="0 0 1024 1024"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isColored && (
            <defs>
              <linearGradient
                id="loader-secondary-light"
                x1="666.235"
                y1="871.349"
                x2="828"
                y2="253"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#EB7C47" />
                <stop offset="0.35" stopColor="#D94B26" />
                <stop offset="0.566341" stopColor="#E1BDB8" />
                <stop offset="0.756349" stopColor="#F5F2FB" stopOpacity="0" />
              </linearGradient>
              <linearGradient
                id="loader-secondary-dark"
                x1="666.235"
                y1="871.349"
                x2="995.222"
                y2="461.188"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#E64A00" />
                <stop offset="0.35" stopColor="#9C2000" />
                <stop offset="0.65" stopColor="#3D0700" />
                <stop offset="0.8125" stopColor="#0A0714" stopOpacity="0" />
              </linearGradient>
              <linearGradient
                id="loader-primary-colored"
                x1="273.402"
                y1="810.431"
                x2="589.003"
                y2="318.992"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#4B12C4" />
                <stop offset="0.4" stopColor="#803DFF" />
                <stop offset="0.75" stopColor="#B282FF" />
                <stop offset="1" stopColor="#E2D1FF" />
              </linearGradient>
            </defs>
          )}

          {/* Secondary Flame (Background / Dimmed Layer) */}
          <g className={styles.physicsWrapperSecondary}>
            <path
              className={cx(
                styles.flameSecondary,
                isColored
                  ? isDark
                    ? styles.fillSecondaryDark
                    : styles.fillSecondaryLight
                  : styles.fillMonochromeSecondary,
              )}
              d="M807.146 753.052C780.65 806.635 739.765 843.349 683.109 861.899C656.644 870.564 629.44 873.111 601.739 870.193C600.1 870.02 598.445 869.781 596.848 868.597C597.973 865.778 600.693 864.552 602.777 862.828C645.72 827.281 674.012 782.377 688.842 728.768C696.029 702.791 699.848 676.369 699.622 649.432C699.236 603.207 687.536 559.96 664.89 519.657C656.702 505.084 647.05 491.493 636.645 478.484C618.623 455.957 614.021 430.616 619.1 402.762C621.879 387.52 626.415 372.711 629.373 357.515C636.019 323.367 632.765 290.27 619.785 258.062C619.173 256.545 618.606 255.011 618.032 253.522C619.869 252.159 620.754 253.627 621.649 254.376C643.337 272.519 661.967 293.184 674.207 318.991C681.98 335.381 684.852 352.9 685.178 370.863C685.387 382.353 685.248 393.839 686.957 405.249C689.584 422.782 698.82 436.786 710.326 449.664C724.886 465.959 738.81 482.735 749.454 501.983C763.335 527.085 771.941 553.755 774.495 582.413C776.117 600.621 775.149 618.668 772.644 636.697C772.394 638.499 771.893 640.332 774.081 642.537C796.239 628.64 805.263 606.83 810.542 582.415C834.498 639.776 834.584 696.496 807.146 753.052Z"
            />
          </g>

          {/* Primary Purple Flame (Foreground / Main Dominant Layer) */}
          <g className={styles.physicsWrapperPrimary}>
            <path
              className={cx(
                styles.flamePrimary,
                isColored ? styles.fillPrimaryColored : styles.fillMonochromePrimary,
              )}
              d="M401.512 878.575C348.071 858.212 305.496 824.582 274.744 776.902C243.342 728.213 227.859 674.492 229.047 616.431C229.589 589.988 234.643 564.169 243.939 539.296C244.751 537.123 245.816 535.04 246.84 532.952C247.025 532.576 247.582 532.382 249.038 531.333C258.085 559.735 270.604 585.814 292.674 608.052C292.878 600.427 291.236 594.499 290.423 588.538C283.058 534.538 294.326 484.297 320.578 437.004C337.886 405.822 360.517 378.893 386.065 354.201C405.707 335.217 425.549 316.396 441.449 293.931C459.438 268.513 472.13 240.82 476.367 209.855C479.922 183.874 478.399 157.998 471.257 132.609C470.762 130.848 470.329 129.068 469.913 127.287C469.846 126.999 470.02 126.655 470.096 126.266C471.574 125.143 472.591 126.424 473.531 127.149C520.178 163.124 552.737 208.539 566.404 266.468C576.105 307.586 570.893 347.817 558.855 387.641C552.207 409.63 543.519 430.959 537.852 453.264C533.333 471.049 531.141 488.952 535.358 507.081C537.598 516.71 541.556 525.677 547.105 533.949C549.305 537.227 551.5 537.803 554.985 535.995C573.212 526.536 584.137 511.18 590.761 492.262C593.444 484.599 594.551 476.542 596.359 468.237C599.862 469.343 601.612 471.871 603.521 474.008C623.453 496.317 639.121 521.394 651.152 548.717C661.27 571.698 667.942 595.762 671.071 620.644C676.053 660.258 672.237 699.174 658.737 736.788C633.023 808.432 583.973 856.806 512.041 881.806C505.666 884.021 499.143 886.113 491.936 886.499C491.714 883.283 493.767 881.369 495.058 879.229C508.005 857.76 517.178 834.965 520.834 809.977C524.819 782.74 520.879 756.597 511.168 731.134C499.638 700.901 480.885 675.355 459.194 651.755C456.375 648.688 453.533 645.641 450.628 642.656C449.055 641.039 447.52 639.27 445.167 638.716C443.457 640.936 444.134 643.184 444.155 645.251C444.322 662.211 442.198 678.761 436.143 694.73C431.646 706.59 424.116 716.568 416.879 726.744C399.272 751.498 391.376 778.996 394.469 809.247C397.083 834.816 407.073 857.744 421.396 878.895C422.235 880.134 423.055 881.391 423.787 882.694C423.998 883.069 423.868 883.635 423.934 884.837C416.157 883.673 408.968 881.392 401.512 878.575Z"
            />
          </g>
        </svg>
      </div>
    );
  },
);

Loader.displayName = "Loader";
