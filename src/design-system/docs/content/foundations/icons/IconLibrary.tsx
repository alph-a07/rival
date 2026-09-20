import { useState } from "react";
import type { RegistryEntry } from "@/design-system/docs/types/registry.types";
import { Icon } from "@/components/icon/Icon";
import { iconRegistry, type IconName } from "@/design-system/icons";
import styles from "./IconLibrary.module.css";

const iconNames = Object.keys(iconRegistry) as IconName[];

const IconGrid = () => {
  const [copiedIcon, setCopiedIcon] = useState<string | null>(null);

  const handleCopy = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopiedIcon(name);
    setTimeout(() => setCopiedIcon(null), 1500);
  };

  return (
    <div className={styles.grid}>
      {iconNames.map((name) => (
        <button
          key={name}
          className={styles.iconCard}
          onClick={() => handleCopy(name)}
          title={`Copy "${name}" to clipboard`}
        >
          {copiedIcon === name && <span className={styles.copiedMessage}>Copied!</span>}
          <Icon name={name} size="lg" tint="main" />
          <span className={styles.iconLabel}>{name}</span>
        </button>
      ))}
    </div>
  );
};

export const iconLibraryDoc: RegistryEntry = {
  id: "icon-library",
  title: "Icon Library",
  category: "Foundations",
  description:
    "The official icon set for the application, powered by Lucide. Click any icon to copy its string name to your clipboard.",
  sections: [
    {
      type: "custom",
      customRender: () => <IconGrid />,
    },
  ],
};
