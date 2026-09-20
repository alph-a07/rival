import { useState } from "react";
import { createTokenCatalog } from "@/design-system/docs/tokens/tokenCatalog";
import styles from "./ColorPreview.module.css";
import { TokenBadge } from "@/design-system/docs/ui/TokenBadge";

const ColorSwatch = ({ token }: { token: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyValue = () => {
    navigator.clipboard.writeText(`var(${token})`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.swatchCard}>
      <div
        className={styles.swatchColor}
        style={{ background: `var(${token})` }}
        onClick={handleCopyValue}
        title={`Copy var(${token})`}
      >
        {copied && <span className={styles.hexLabel}>Copied!</span>}
      </div>
      <TokenBadge token={token} />
    </div>
  );
};

export const ColorPreview = () => {
  const SwatchGroup = ({ title, tokens }: { title: string; tokens: string[] }) => {
    if (!tokens || tokens.length === 0) {
      return null;
    }
    return (
      <div className={styles.swatchGroup}>
        <h3 className={styles.groupTitle}>{title}</h3>
        <div className={styles.swatchGrid}>
          {tokens.map((token) => (
            <ColorSwatch key={token} token={token} />
          ))}
        </div>
      </div>
    );
  };

  const tokens = createTokenCatalog();

  return (
    <div className={styles.foundationContainer}>
      <SwatchGroup title="Brand Roles" tokens={tokens.brandRoles} />
      <SwatchGroup title="Domain Palette" tokens={tokens.domainRoles} />
      <SwatchGroup title="Consistency Palette" tokens={tokens.consistencyRoles} />
      <SwatchGroup title="Surfaces" tokens={tokens.surfaces} />
      <SwatchGroup title="Text & Content" tokens={tokens.text} />
      <SwatchGroup title="Borders" tokens={tokens.borders} />
      <SwatchGroup title="Scrims" tokens={tokens.scrims} />
    </div>
  );
};
