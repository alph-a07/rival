import { useState } from "react";
import generatedTokens from "@/design-system/generated-tokens.json";
import { cx } from "@/components/utils";
import styles from "./MotionPreview.module.css";
import { TokenBadge } from "@/design-system/docs/ui/TokenBadge";

export const MotionPreview = () => {
  const [activeToken, setActiveToken] = useState<string | null>(null);

  const triggerAnimation = (token: string) => {
    setActiveToken(null);
    setTimeout(() => setActiveToken(token), 10);
  };

  return (
    <div className={styles.foundationContainer}>
      <h3 className={styles.groupTitle}>Durations</h3>
      <div className={styles.motionList}>
        {generatedTokens.durations.map((token) => (
          <div key={token} className={styles.motionRow}>
            <div className={styles.motionInfo}>
              <TokenBadge token={token} />
            </div>
            <div className={styles.motionTrack}>
              <div
                className={cx(styles.motionDot, activeToken === token && styles.animateDot)}
                style={{ animationDuration: `var(${token})` }}
                onAnimationEnd={() => setActiveToken(null)}
              />
            </div>
            <button className={styles.playBtn} onClick={() => triggerAnimation(token)}>
              Play
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
