import Prism from "prismjs";
import "prismjs/components/prism-typescript";
import styles from "./DocTypesList.module.css";

export interface TypeDefinition {
  name: string;
  definition: string;
  notes?: string;
}

export const DocTypesList = ({ typesList }: { typesList: TypeDefinition[] }) => (
  <div className={styles.typesList}>
    {typesList.map((t) => {
      const highlightedCode = Prism.highlight(
        t.definition,
        Prism.languages.typescript,
        "typescript",
      );

      return (
        <div key={t.name} id={`type-${t.name.toLowerCase()}`} className={styles.typeBlock}>
          <h3 className={styles.typeName}>{t.name}</h3>

          <div className={styles.typeDef}>
            <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
          </div>

          {t.notes && <p className={styles.typeNotes}>{t.notes}</p>}
        </div>
      );
    })}
  </div>
);
