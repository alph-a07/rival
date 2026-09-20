import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** A provider for managing a full-page loading state. Rarely used for app-wide blocking states. */
export function PageLoaderProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<Map<string, string | undefined>>(new Map());
  const counterRef = useRef(0);

  const show = useCallback((label?: string) => {
    const token = `pl-${++counterRef.current}`;
    setTokens((prev) => new Map(prev).set(token, label));
    return token;
  }, []);

  const hide = useCallback((token: string) => {
    setTokens((prev) => {
      if (!prev.has(token)) {
        return prev;
      }

      const next = new Map(prev);
      next.delete(token);
      return next;
    });
  }, []);

  const withLoader = useCallback(
    async <T,>(fn: () => Promise<T>, label?: string): Promise<T> => {
      const token = show(label);

      try {
        return await fn();
      } finally {
        hide(token);
      }
    },
    [hide, show],
  );

  const value = useMemo<Context>(() => {
    const labels = Array.from(tokens.values()).filter((l): l is string => !!l);
    return {
      isLoading: tokens.size > 0,
      label: labels[labels.length - 1],
      show,
      hide,
      withLoader,
    };
  }, [tokens, show, hide, withLoader]);

  return <PageLoaderContext.Provider value={value}>{children}</PageLoaderContext.Provider>;
}

export function usePageLoader(): Context {
  const ctx = useContext(PageLoaderContext);
  if (!ctx) {
    throw new Error("usePageLoader must be used within PageLoaderProvider");
  }
  return ctx;
}

interface Context {
  isLoading: boolean;
  label: string | undefined;
  show: (label?: string) => string;
  hide: (token: string) => void;
  withLoader: <T>(fn: () => Promise<T>, label?: string) => Promise<T>;
}

const PageLoaderContext = createContext<Context | null>(null);
