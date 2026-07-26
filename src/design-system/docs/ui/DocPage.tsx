import { useParams } from "react-router-dom";
import { DocPlayground } from "./DocPlayground";
import { DocPropsTable } from "./DocPropsTable";
import styles from "./DocPage.module.css";
import { designSystemRegistry } from "@/design-system/docs/registry";

export const DocPage = () => {
  const { componentId } = useParams<{ componentId: string }>();
  const componentData = designSystemRegistry.find((c) => c.id === componentId);

  if (!componentData) {
    return (
      <div className={styles.pageWrapper}>
        <h1 className={styles.pageTitle}>Component not found</h1>
        <p className={styles.pageDescription}>No registry entry exists for "{componentId}".</p>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{componentData.title}</h1>
        {componentData.description && (
          <p className={styles.pageDescription}>{componentData.description}</p>
        )}
      </header>

      <div className={styles.sectionsLayout}>
        {componentData.sections.map((section, idx) => (
          <section key={`${componentData.id}-${idx}`} className={styles.sectionBlock}>
            {section.title && <h2 className={styles.sectionTitle}>{section.title}</h2>}
            {section.type === "custom" && section.customRender && section.customRender()}
            {section.type === "playground" && section.playground && (
              <DocPlayground config={section.playground} />
            )}
            {section.type === "props" && section.propsList && (
              <DocPropsTable propsList={section.propsList} />
            )}
          </section>
        ))}
      </div>
    </div>
  );
};
