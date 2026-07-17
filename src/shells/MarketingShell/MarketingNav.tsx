import { Link } from "react-router-dom";
import styles from "./MarketingNav.module.css";

export const MarketingNav = () => {
  return (
    <nav className={styles.navBar}>
      <div className={styles.brand}>Cosmic Rival</div>
      <div className={styles.links}>
        <Link to="/">Home</Link>
        <Link to="/app" style={{ color: "var(--color-accent)" }}>
          Open App →
        </Link>
      </div>
    </nav>
  );
};
