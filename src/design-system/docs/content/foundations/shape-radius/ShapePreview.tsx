import generatedTokens from "@/design-system/generated-tokens.json";
import styles from "./ShapePreview.module.css";

export const ShapePreview = () => (
  <div className={styles.swatchGrid}>
    {generatedTokens.radii.map((radius) => (
      <div key={radius} className={styles.shapeCard}>
        <div className={styles.shapeBox} style={{ borderRadius: `var(${radius})` }} />
        <code className={styles.shapeLabel}>{radius}</code>
      </div>
    ))}
  </div>
);
