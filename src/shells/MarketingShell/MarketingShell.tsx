import { Outlet } from "react-router-dom";
import { MarketingNav } from "./MarketingNav";
import styles from "./MarketingShell.module.css";

export const MarketingShell = () => {
  return (
    <div className={styles.layout}>
      <MarketingNav />
      <main className={styles.mainContent}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        © {new Date().getFullYear()} Cosmic Rival
      </footer>
    </div>
  );
};
