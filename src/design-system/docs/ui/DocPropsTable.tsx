import styles from "./DocPropsTable.module.css";

export const DocPropsTable = ({ propsList }: { propsList: any[] }) => (
  <div className={styles.tableWrapper}>
    <table className={styles.propsTable}>
      <thead>
        <tr>
          <th>PROP</th>
          <th>TYPE</th>
          <th>DEFAULT</th>
          <th>NOTES</th>
        </tr>
      </thead>
      <tbody>
        {propsList.map((prop) => {
          const typeOptions = prop.type.split("·").map((opt: string) => opt.trim());

          return (
            <tr key={prop.name}>
              <td className={styles.propName} data-label="Prop">
                {prop.name}
              </td>
              <td data-label="Type">
                <div className={styles.propType}>
                  {typeOptions.map((opt: string) => (
                    <code key={opt} className={styles.typeChip}>
                      {opt}
                    </code>
                  ))}
                </div>
              </td>
              <td className={styles.propDefault} data-label="Default">
                {prop.default}
              </td>
              <td className={styles.propNotes} data-label="Notes">
                {prop.notes}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
