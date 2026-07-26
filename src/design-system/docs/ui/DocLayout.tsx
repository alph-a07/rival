import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { cx } from "@/components/utils";
import { useTheme } from "@/theme/ThemeContext";
import { designSystemRegistry } from "@/design-system/docs/registry";
import type { RegistryCategory } from "@/design-system/docs/types/registry.types";
import styles from "./DocLayout.module.css";

const categoryOrder: RegistryCategory[] = ["Start", "Foundations", "Components", "Reference"];

export const DocLayout = () => {
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className={styles.layout}>
      <header className={styles.mobileHeader}>
        <h2 className={styles.brand}>System</h2>
        <div className={styles.mobileActions}>
          <button className={styles.themeToggle} onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button className={styles.hamburgerBtn} onClick={toggleSidebar} aria-label="Toggle Menu">
            ☰
          </button>
        </div>
      </header>

      <div
        className={cx(styles.overlay, isSidebarOpen && styles.overlayOpen)}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside className={cx(styles.sidebar, isSidebarOpen && styles.sidebarOpen)}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.brand}>System</h2>
          <button className={styles.themeToggle} onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>

        <nav className={styles.navContainer}>
          {categoryOrder.map((category) => {
            const items = designSystemRegistry.filter((item) => item.category === category);
            if (items.length === 0) {
              return null;
            }

            return (
              <div key={category} className={styles.navGroup}>
                <h4 className={styles.navHeading}>{category}</h4>
                <div className={styles.navItems}>
                  {items.map((item) => (
                    <NavLink
                      key={item.id}
                      to={`/design-system/${item.id}`}
                      onClick={closeSidebar}
                      className={({ isActive }) =>
                        cx(styles.navLink, isActive && styles.navLinkActive)
                      }
                    >
                      {item.title}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
};
