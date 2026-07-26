import { useState } from "react";
import styles from "./TokenBadge.module.css";

export const TokenBadge = ({ token }: { token: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`var(${token})`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button className={styles.tokenBadge} onClick={handleCopy} title="Copy token">
      {copied ? "✓ Copied" : token}
    </button>
  );
};
