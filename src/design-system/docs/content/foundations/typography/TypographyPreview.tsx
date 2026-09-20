import { createTokenCatalog } from "@/design-system/docs/tokens/tokenCatalog";
import styles from "./TypographyPreview.module.css";

export const TypographyPreview = () => {
  const tokens = createTokenCatalog();

  return (
    <div className={styles.foundationContainer}>
      <h3 className={styles.groupTitle}>Font Families</h3>
      {tokens.fonts.map((font) => (
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
      {tokens.weights.map((weight) => (
        <div key={weight} className={styles.typeRow}>
          <div className={styles.typeSpecimen} style={{ fontWeight: `var(${weight})` }}>
            The quick brown fox jumps over the lazy dog
          </div>
          <code className={styles.typeLabel}>{weight}</code>
        </div>
      ))}
      <h3 className={styles.groupTitle} style={{ marginTop: "24px" }}>
        Font Sizes
      </h3>
      {tokens.fontSizes.map((size) => (
        <div key={size} className={styles.typeRow}>
          <div className={styles.typeSpecimen} style={{ fontSize: `var(${size})` }}>
            You vs. Yesterday
          </div>
          <code className={styles.typeLabel}>{size}</code>
        </div>
      ))}
      <h3 className={styles.groupTitle} style={{ marginTop: "24px" }}>
        Line Heights
      </h3>
      {tokens.lineHeights.map((lineHeight) => (
        <div key={lineHeight} className={styles.typeRow}>
          <div className={styles.typeSpecimen} style={{ lineHeight: `var(${lineHeight})` }}>
            The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.
          </div>
          <code className={styles.typeLabel}>{lineHeight}</code>
        </div>
      ))}
    </div>
  );
};
