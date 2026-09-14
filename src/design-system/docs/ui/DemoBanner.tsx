import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Alert, type AlertVariant } from "@/components/alert/Alert";
import { Button } from "@/components/button/Button";
import { cx } from "@/components/utils";
import styles from "./DemoBanner.module.css";

export interface BannerOptions {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
}

interface DemoBannerContextValue {
  banner: BannerOptions | null;
  show: (opts: BannerOptions) => void;
  dismiss: () => void;
}

const DemoBannerContext = createContext<DemoBannerContextValue | null>(null);

/** Provides a doc-scoped full-bleed banner trigger for component demos. */
export const DemoBannerProvider = ({ children }: { children: ReactNode }) => {
  const [banner, setBanner] = useState<BannerOptions | null>(null);
  const { pathname } = useLocation();

  const dismiss = () => setBanner(null);

  // A demo is single-page: never carry it onto the next component.
  useEffect(() => {
    dismiss();
  }, [pathname]);

  const value = useMemo<DemoBannerContextValue>(
    () => ({
      banner,
      show: (opts) => setBanner(opts),
      dismiss,
    }),
    [banner],
  );

  return <DemoBannerContext.Provider value={value}>{children}</DemoBannerContext.Provider>;
};

/** In-flow host placed as the first node of the docs layout, above the nav. */
export const DemoBannerSlot = () => {
  const ctx = useContext(DemoBannerContext);
  if (!ctx?.banner) {
    return null;
  }
  const { banner, dismiss } = ctx;
  return <BannerReveal banner={banner} dismiss={dismiss} />;
};

const BannerReveal = ({ banner, dismiss }: { banner: BannerOptions; dismiss: () => void }) => {
  const [open, setOpen] = useState(false);

  // One frame later so the browser can start from the collapsed row.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={cx(styles.wrap, open && styles.wrapOpen)}>
      <div className={styles.inner}>
        <Alert
          variant={banner.variant}
          title={banner.title}
          presentation="banner"
          style={{ animation: "none" }}
          action={
            <Button size="sm" variant="secondary" onClick={dismiss}>
              Got it
            </Button>
          }
        >
          {banner.children}
        </Alert>
      </div>
    </div>
  );
};

export function useDemoBanner(): Pick<DemoBannerContextValue, "banner" | "show" | "dismiss"> {
  const ctx = useContext(DemoBannerContext);
  if (!ctx) {
    throw new Error("useDemoBanner must be used within <DemoBannerProvider>");
  }
  return ctx;
}
