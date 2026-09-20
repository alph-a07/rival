import { Icon } from "@/components/icon/Icon";
import type { IconName } from "@/design-system/icons";
import { createTokenCatalog } from "@/design-system/docs/tokens/tokenCatalog";
import styles from "./IconTokensPreview.module.css";

/** A representative icon per tint so the swatch shows the token on real artwork. */
const SAMPLE_ICON_BY_TINT: Record<string, IconName> = {
  "icon-default": "info",
  "icon-strong": "check",
  "icon-on-brand": "circle_star",
  "icon-disabled": "close",
  "icon-brand-primary": "dashboard",
  "icon-brand-accent": "add",
  "icon-brand-danger": "warning",
  "icon-domain-building": "building",
  "icon-domain-learning": "structured_learning",
  "icon-domain-exploring": "exploring",
  "icon-domain-practicing": "practicing",
  "icon-domain-habit": "habit",
  "icon-domain-maintaining": "maintaining",
};

const sampleIconFor = (token: string): IconName =>
  SAMPLE_ICON_BY_TINT[token.replace(/^--/, "")] ?? "info";

export const IconTokensPreview = () => {
  const tokens = createTokenCatalog();

  return (
    <div className={styles.foundationContainer}>
      <div>
        <h3 className={styles.groupTitle}>Tints</h3>
        <div className={styles.tokenGrid}>
          {tokens.icons.map((token) => (
            <div key={token} className={styles.tokenCard}>
              <span className={styles.glyph} style={{ color: `var(${token})` }}>
                <Icon name={sampleIconFor(token)} size="var(--icon-size-lg)" tint="inherit" />
              </span>
              <code className={styles.tokenLabel}>{token}</code>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className={styles.groupTitle}>Sizes</h3>
        <div className={styles.tokenGrid}>
          {tokens.iconSizes.map((token) => (
            <div key={token} className={styles.tokenCard}>
              <span className={styles.glyph} style={{ color: "var(--text-main)" }}>
                <Icon name="circle_star" size={`var(${token})`} tint="inherit" />
              </span>
              <code className={styles.tokenLabel}>{token}</code>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className={styles.groupTitle}>Stroke</h3>
        <div className={styles.tokenGrid}>
          {tokens.iconStrokes.map((token) => (
            <div key={token} className={styles.tokenCard}>
              <span className={styles.glyph} style={{ color: "var(--text-main)" }}>
                <svg
                  viewBox="0 0 24 24"
                  width="var(--icon-size-xl)"
                  height="var(--icon-size-xl)"
                  fill="none"
                  stroke="currentcolor"
                  strokeWidth={`var(${token})`}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4l3 2" />
                </svg>
              </span>
              <code className={styles.tokenLabel}>{token}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
