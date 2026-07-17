import { Outlet, useNavigate } from "react-router-dom";
import styles from "./FlowShell.module.css";

export const FlowShell = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.overlay}>
      <header className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.closeButton}>
          Close ✕
        </button>
      </header>
      <main className={styles.mainContent}>
        <div className={styles.container}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
