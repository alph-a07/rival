import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "@/domain/errors/reporter";

interface Props {
  children: ReactNode;
  fallback: (retry: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
}

/** Last-resort net for render-crashing bugs. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, {
      source: "render",
      context: { componentStack: info.componentStack ?? undefined },
    });
  }

  private retry = () => this.setState({ hasError: false });

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback(this.retry);
    }
    return this.props.children;
  }
}
