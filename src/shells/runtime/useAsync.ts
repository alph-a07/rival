import { useCallback, useEffect, useRef, useState } from "react";
import type { Result } from "@/domain/errors/Result";
import type { AppError } from "@/domain/errors/AppError";
import { reportError } from "@/domain/errors/reporter";

type Status = "idle" | "loading" | "success" | "error";

/**
 * A hook for managing all asynchronous operations in the app returning a `Result`.
 * Auto-reports errors to the error reporter if `onError` is set to "auto".
 */
export function useAsync<T>(
  fn: () => Promise<Result<T>>,
  options: UseAsyncOptions = {},
): AsyncResult<T> {
  const { onError = "auto", immediate = true, deps = [], source = "useAsync" } = options;

  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<T>();
  const [error, setError] = useState<AppError>();

  const fnRef = useRef(fn);
  fnRef.current = fn;

  const runRef = useRef<() => Promise<void> | null>(null);

  const run = useCallback(async () => {
    setStatus("loading");
    setError(undefined);

    const result = await fnRef.current();

    if (result.ok) {
      setData(result.value);
      setStatus("success");
    } else {
      setError(result.error);
      setStatus("error");
      if (onError === "auto") {
        reportError(result.error, { source, retry: () => runRef.current?.() });
      }
    }
  }, [onError, source]);

  runRef.current = run;

  useEffect(() => {
    if (immediate) {
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { status, data, error, run, retry: run };
}

interface UseAsyncOptions {
  onError?: "auto" | "manual";
  immediate?: boolean;
  deps?: unknown[];
  source?: string;
}

interface AsyncResult<T> {
  status: Status;
  data: T | undefined;
  error: AppError | undefined;
  run: () => Promise<void>;
  retry: () => Promise<void>;
}
