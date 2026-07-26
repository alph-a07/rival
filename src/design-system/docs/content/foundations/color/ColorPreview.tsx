import { useState } from "react";
import generatedTokens from "@/design-system/generated-tokens.json";
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

  return (
    <div className={styles.foundationContainer}>
      <SwatchGroup title="Brand Roles" tokens={generatedTokens.brandRoles} />
      <SwatchGroup title="Domain Palette" tokens={generatedTokens.domainRoles} />
      <SwatchGroup title="Surfaces" tokens={generatedTokens.surfaces} />
      <SwatchGroup title="Text & Content" tokens={generatedTokens.text} />
      <SwatchGroup title="Borders" tokens={generatedTokens.borders} />
    </div>
  );
};
