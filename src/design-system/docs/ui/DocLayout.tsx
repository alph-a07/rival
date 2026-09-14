import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { DemoBannerProvider, DemoBannerSlot } from "@/design-system/docs/ui/DemoBanner";
import { Sun, Moon, Menu, ChevronRight, ChevronDown } from "lucide-react";
import { cx } from "@/components/utils";
import { useTheme } from "@/theme/ThemeContext";
import { designSystemRegistry } from "@/design-system/docs/registry";
import type { RegistryCategory, RegistryEntry } from "@/design-system/docs/types/registry.types";
import styles from "./DocLayout.module.css";

const categoryOrder: RegistryCategory[] = ["Start", "Foundations", "Components", "Reference"];

interface NavItemProps {
  item: RegistryEntry;
  subItems: RegistryEntry[];
  onCloseSidebar: () => void;
}

const NavItem = ({ item, subItems, onCloseSidebar }: NavItemProps) => {
  const location = useLocation();
  const hasChildren = subItems.length > 0;

  // Auto-expand if current route matches this parent or any of its children
  const isParentActive = location.pathname === `/design-system/${item.id}`;
  const isChildActive = subItems.some(
    (child) => location.pathname === `/design-system/${child.id}`,
  );

  const [isOpen, setIsOpen] = useState(isParentActive || isChildActive);

  return (
    <div className={styles.navItemContainer}>
      <div className={styles.navLinkRow}>
        <NavLink
          to={`/design-system/${item.id}`}
          onClick={onCloseSidebar}
          className={({ isActive }) =>
            cx(styles.navLink, (isActive || isChildActive) && styles.navLinkActive)
          }
        >
          <span>{item.title}</span>
          {hasChildren && (
            <button
              type="button"
              className={styles.expandBtn}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen((prev) => !prev);
              }}
              aria-label={isOpen ? `Collapse ${item.title}` : `Expand ${item.title}`}
            >
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
        </NavLink>
      </div>

      {hasChildren && isOpen && (
        <div className={styles.navSubList}>
          {subItems.map((child) => (
            <NavLink
              key={child.id}
              to={`/design-system/${child.id}`}
              onClick={onCloseSidebar}
              className={({ isActive }) =>
                cx(styles.navSubLink, isActive && styles.navSubLinkActive)
              }
            >
              {child.title}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

export const DocLayout = () => {
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <DemoBannerProvider>
      <div className={styles.layout}>
        <DemoBannerSlot />
        <header className={styles.mobileHeader}>
          <h2 className={styles.brand}>System</h2>
          <div className={styles.mobileActions}>
            <button
              type="button"
              className={styles.themeToggle}
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              type="button"
              className={styles.hamburgerBtn}
              onClick={toggleSidebar}
              aria-label="Toggle Menu"
            >
              <Menu size={20} />
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
            <h2 className={styles.brand}>Design System</h2>
            <button
              type="button"
              className={styles.themeToggle}
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <nav className={styles.navContainer}>
            {categoryOrder.map((category) => {
              const allCategoryItems = designSystemRegistry.filter(
                (item) => item.category === category,
              );
              // Only map through items that DO NOT have a parent
              const topLevelItems = allCategoryItems.filter((item) => !item.parent);

              if (topLevelItems.length === 0) {
                return null;
              }

              return (
                <div key={category} className={styles.navGroup}>
                  <h4 className={styles.navHeading}>{category}</h4>
                  <div className={styles.navItems}>
                    {topLevelItems.map((item) => {
                      // Find any items that declare this item as their parent
                      const subItems = allCategoryItems.filter((sub) => sub.parent === item.id);

                      return (
                        <NavItem
                          key={item.id}
                          item={item}
                          subItems={subItems}
                          onCloseSidebar={closeSidebar}
                        />
                      );
                    })}
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
    </DemoBannerProvider>
  );
};
