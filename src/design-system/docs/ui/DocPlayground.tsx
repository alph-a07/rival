import { useState } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-jsx";
import styles from "./DocPlayground.module.css";
import { cx } from "@/components/utils";
import type { PlaygroundConfig } from "@/design-system/docs/types/registry.types";

export const DocPlayground = ({ config }: { config: PlaygroundConfig }) => {
  const [state, setState] = useState<Record<string, any>>(() =>
    config.controls.reduce(
      (acc, ctrl) => ({ ...acc, [ctrl.name]: ctrl.defaultValue }),
      {} as Record<string, any>,
    ),
  );
  const [copied, setCopied] = useState(false);

  const updateState = (name: string, value: any) => setState((s) => ({ ...s, [name]: value }));

  const handleCopy = () => {
    navigator.clipboard.writeText(config.code(state));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightedCode = Prism.highlight(config.code(state), Prism.languages.jsx, "jsx");

  return (
    <div className={styles.playgroundContainer}>
      <div className={styles.previewBox}>{config.render(state)}</div>

      <div className={styles.controlsSidebar}>
        {config.controls.map((ctrl) => (
          <div key={ctrl.name} className={styles.controlGroup}>
            {ctrl.type !== "boolean" && (
              <label className={styles.controlLabel}>{ctrl.label || ctrl.name}</label>
            )}

            {ctrl.type === "text" && (
              <input
                type="text"
                className={styles.textInput}
                value={state[ctrl.name]}
                onChange={(e) => updateState(ctrl.name, e.target.value)}
              />
            )}

            {ctrl.type === "select" && (
              <select
                className={styles.select}
                value={state[ctrl.name]}
                onChange={(e) => updateState(ctrl.name, e.target.value)}
              >
                {ctrl.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {ctrl.type === "range" && (
              <div className={styles.rangeControl}>
                <input
                  type="range"
                  min={ctrl.min}
                  max={ctrl.max}
                  step={ctrl.step}
                  value={state[ctrl.name]}
                  onChange={(e) => updateState(ctrl.name, Number(e.target.value))}
                  className={styles.rangeInput}
                />
                <span className={styles.rangeValue}>{state[ctrl.name]}</span>
              </div>
            )}

            {ctrl.type === "radio" && (
              <div className={styles.radioGroup}>
                {ctrl.options?.map((opt) => {
                  const isActive = state[ctrl.name] === opt;
                  return (
                    <label key={opt} className={cx(styles.radio, isActive && styles.radioActive)}>
                      <input
                        type="radio"
                        checked={isActive}
                        onChange={() => updateState(ctrl.name, opt)}
                      />
                      {isActive && <span className={styles.radioCircle} />}
                      {opt}
                    </label>
                  );
                })}
              </div>
            )}

            {ctrl.type === "boolean" && (
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={state[ctrl.name]}
                  onChange={(e) => updateState(ctrl.name, e.target.checked)}
                />
                <span className={styles.checkboxMark} />
                Toggle {ctrl.name}
              </label>
            )}
          </div>
        ))}
      </div>

      <div className={styles.codeSnippet}>
        <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        <button className={styles.copyBtn} onClick={handleCopy}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
};
