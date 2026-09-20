import { createTokenCatalog } from "@/design-system/docs/tokens/tokenCatalog";
import styles from "./ShadowGlowPreview.module.css";

const getEffectClassName = (effect: string) => {
  if (effect.startsWith("--glow-")) {
    return styles.glow;
  }

  if (effect.includes("elevation")) {
    return styles.elevation;
  }

  return styles.shadow;
};

export const ShadowGlowPreview = () => {
  const tokens = createTokenCatalog();

  return (
    <div className={styles.swatchGrid}>
      {tokens.shadowsGlows.map((effect) => {
        const effectClassName = getEffectClassName(effect);

        return (
          <div key={effect} className={`${styles.effectCard} ${effectClassName}`}>
            <div className={styles.stage}>
              <div className={styles.effectBox} style={{ boxShadow: `var(${effect})` }} />
            </div>
            <code className={styles.effectLabel}>{effect}</code>
          </div>
        );
      })}
    </div>
  );
};
