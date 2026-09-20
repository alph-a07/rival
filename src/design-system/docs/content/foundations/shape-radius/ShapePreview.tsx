import { createTokenCatalog } from "@/design-system/docs/tokens/tokenCatalog";
import styles from "./ShapePreview.module.css";

export const ShapePreview = () => {
  const tokens = createTokenCatalog();

  return (
    <div className={styles.swatchGrid}>
      {tokens.radii.map((radius) => (
        <div key={radius} className={styles.shapeCard}>
          <div className={styles.shapeBox} style={{ borderRadius: `var(${radius})` }} />
          <code className={styles.shapeLabel}>{radius}</code>
        </div>
      ))}
    </div>
  );
};
