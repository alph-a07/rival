import React from "react";
import { Link } from "react-router-dom";
import { cx } from "@/components/utils";
import styles from "./DocPropsTable.module.css";

const parseLink = (text: string) => {
  const match = text.match(/^\[(.*?)\]\((.*?)\)$/);

  if (!match) {
    return null;
  }

  return {
    label: match[1],
    to: match[2],
  };
};

const parseNotes = (text: string) => {
  if (!text) {
    return null;
  }

  const parts = text.split(/(\[.*?\]\(.*?\))/g);

  return parts.map((part, index) => {
    const link = parseLink(part);

    if (link) {
      return (
        <Link key={index} to={link.to} className={styles.noteLink}>
          {link.label}
        </Link>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

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
                  {typeOptions.map((opt: string) => {
                    const link = parseLink(opt);

                    if (link) {
                      return (
                        <Link
                          key={opt}
                          to={link.to}
                          className={cx(styles.typeChip, styles.typeLink)}
                        >
                          {link.label}
                        </Link>
                      );
                    }

                    return (
                      <code key={opt} className={styles.typeChip}>
                        {opt}
                      </code>
                    );
                  })}
                </div>
              </td>
              <td className={styles.propDefault} data-label="Default">
                {prop.default}
              </td>
              <td className={styles.propNotes} data-label="Notes">
                {parseNotes(prop.notes)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
