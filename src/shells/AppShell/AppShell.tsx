import { Outlet } from "react-router-dom";
import { AppNav } from "./AppNav";
import styles from "./AppShell.module.css";

export const AppShell = () => {
  return (
    <div className={styles.layout}>
      <AppNav />
      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
};
