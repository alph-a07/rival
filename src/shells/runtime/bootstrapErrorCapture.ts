import { reportError } from "@/domain/errors/reporter";

/** Install global error capture. */
export function installGlobalErrorCapture(): () => void {
  const onError = (event: ErrorEvent) => {
    reportError(event.error ?? event.message, { source: "window.onerror" });
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    reportError(event.reason, { source: "unhandledrejection" });
  };

  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
