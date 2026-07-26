import generatedTokens from "@/design-system/generated-tokens.json";
import styles from "./TypographyPreview.module.css";

export const TypographyPreview = () => (
  <div className={styles.foundationContainer}>
    <h3 className={styles.groupTitle}>Font Families</h3>
    {generatedTokens.fonts.map((font) => (
      <div key={font} className={styles.typeRow}>
        <div className={styles.typeSpecimen} style={{ fontFamily: `var(${font})` }}>
          You vs. Yesterday
        </div>
        <code className={styles.typeLabel}>{font}</code>
      </div>
    ))}
    <h3 className={styles.groupTitle} style={{ marginTop: "24px" }}>
      Font Weights
    </h3>
    {generatedTokens.weights.map((weight) => (
      <div key={weight} className={styles.typeRow}>
        <div className={styles.typeSpecimen} style={{ fontWeight: `var(${weight})` }}>
          The quick brown fox jumps over the lazy dog
        </div>
        <code className={styles.typeLabel}>{weight}</code>
      </div>
    ))}
  </div>
);
