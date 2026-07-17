import { Link } from "react-router-dom";
import styles from "./AppNav.module.css";

export const AppNav = () => {
  return (
    <nav className={styles.navRail}>
      <h2 className={styles.title}>App Menu</h2>
      <Link to="/app">Dashboard</Link>
      <Link to="/flow/onboarding">Trigger Flow</Link>

      <div className={styles.bottomLink}>
        <Link to="/">← Back to Site</Link>
      </div>
    </nav>
  );
};
