import generatedTokens from "@/design-system/generated-tokens.json";
import styles from "./ShadowGlowPreview.module.css";

export const ShadowGlowPreview = () => (
  <div className={styles.swatchGrid}>
    {generatedTokens.shadowsGlows.map((effect) => {
      const bgToken =
        effect.includes("glow") || effect.includes("ring")
          ? "var(--bg-background)"
          : "var(--bg-surface)";
      return (
        <div key={effect} className={styles.effectCard} style={{ background: bgToken }}>
          <div className={styles.effectBox} style={{ boxShadow: `var(${effect})` }} />
          <code className={styles.effectLabel}>{effect}</code>
        </div>
      );
    })}
  </div>
);
