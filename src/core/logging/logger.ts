import { CATEGORIES } from "./categories";
import type { CategoryDefinition } from "./categories";
import { activeConfig, isLevelEnabled } from "./config";
import type { LogLevel } from "./config";

type LogFn = (...args: unknown[]) => void;

/** Maps a level to the underlying console method (or null for OFF). */
const CONSOLE_FN: Record<LogLevel, LogFn | null> = {
  TRACE: console.debug.bind(console),
  DEBUG: console.debug.bind(console),
  INFO: console.info.bind(console),
  WARN: console.warn.bind(console),
  ERROR: console.error.bind(console),
  OFF: null,
};

function prefixFor(def: CategoryDefinition): string {
  return def.icon ? `[${def.icon} ${def.tag}]` : `[${def.tag}]`;
}

/** Scoped logger used inside a `group(...)`; emits bare lines (no re-prefix). */
export class GroupLogger {
  private readonly def: CategoryDefinition;

  constructor(def: CategoryDefinition) {
    this.def = def;
  }

  private emit(level: LogLevel, args: unknown[]): void {
    if (!isLevelEnabled(this.def.minLevel ?? activeConfig.minLevel, level)) {
      return;
    }
    CONSOLE_FN[level]?.(...args);
  }

  trace(...args: unknown[]): void {
    this.emit("TRACE", args);
  }
  debug(...args: unknown[]): void {
    this.emit("DEBUG", args);
  }
  info(...args: unknown[]): void {
    this.emit("INFO", args);
  }
  warn(...args: unknown[]): void {
    this.emit("WARN", args);
  }
  error(...args: unknown[]): void {
    this.emit("ERROR", args);
  }
}

export class CategoryLogger {
  public readonly def: CategoryDefinition;

  constructor(def: CategoryDefinition) {
    this.def = def;
  }

  private emit(level: LogLevel, args: unknown[]): void {
    if (!isLevelEnabled(this.def.minLevel ?? activeConfig.minLevel, level)) {
      return;
    }
    CONSOLE_FN[level]?.(prefixFor(this.def), ...args);
  }

  /**
   * Whether this category will emit the given level under the active config.
   * Lets callers cheaply skip expensive string construction when a level is
   * disabled (e.g. INFO summaries in production).
   */
  isEnabled(level: LogLevel): boolean {
    return isLevelEnabled(this.def.minLevel ?? activeConfig.minLevel, level);
  }

  trace(...args: unknown[]): void {
    this.emit("TRACE", args);
  }
  debug(...args: unknown[]): void {
    this.emit("DEBUG", args);
  }
  info(...args: unknown[]): void {
    this.emit("INFO", args);
  }
  warn(...args: unknown[]): void {
    this.emit("WARN", args);
  }
  error(...args: unknown[]): void {
    this.emit("ERROR", args);
  }

  /**
   * Opens a collapsed group, runs `body` (which emits bare lines via a scoped
   * logger), then closes it. Groups related decisions so the stream reads as a
   * narrative rather than a flat dump.
   *
   * @param level gate level; defaults to INFO. Use "DEBUG" for behavioral
   *   reasoning groups so they stay out of production.
   */
  group(title: string, body: (g: GroupLogger) => void, level: LogLevel = "INFO"): void {
    if (!isLevelEnabled(this.def.minLevel ?? activeConfig.minLevel, level)) {
      return;
    }
    console.groupCollapsed(prefixFor(this.def), title);
    try {
      body(new GroupLogger(this.def));
    } finally {
      console.groupEnd();
    }
  }
}

/**
 * Performance wrapper over `performance.mark` / `performance.measure`, with a
 * convenience `timed(name, fn)` for timing an operation and logging its
 * duration. Everything is a no-op when performance logging is disabled.
 */
export class PerformanceLogger {
  private get enabled(): boolean {
    return isLevelEnabled(activeConfig.minLevel, "INFO");
  }

  mark(name: string): void {
    if (this.enabled) {
      performance.mark(`rival:${name}`);
    }
  }

  measure(name: string, startMark: string, endMark?: string): void {
    if (!this.enabled) {
      return;
    }
    const start = `rival:${startMark}`;
    if (endMark) {
      performance.measure(`rival:${name}`, start, `rival:${endMark}`);
    } else {
      performance.measure(`rival:${name}`, start);
    }
    const duration = performance.getEntriesByName(`rival:${name}`).at(-1)?.duration;
    console.info(
      prefixFor(CATEGORIES.performance),
      name,
      duration != null ? `${duration.toFixed(2)}ms` : "",
    );
  }

  /** Times `fn`, logging the duration. Returns `fn`'s value. */
  timed<T>(name: string, fn: () => T): T {
    if (!this.enabled) {
      return fn();
    }
    const start = `rival:${name}:start`;
    const end = `rival:${name}:end`;
    performance.mark(start);
    try {
      return fn();
    } finally {
      performance.mark(end);
      performance.measure(`rival:${name}`, start, end);
      const duration = performance.getEntriesByName(`rival:${name}`).at(-1)?.duration;
      console.info(
        prefixFor(CATEGORIES.performance),
        name,
        duration != null ? `${duration.toFixed(2)}ms` : "",
      );
    }
  }
}

/** The package-wide logger. Category-specific loggers mirror `CATEGORIES`. */
export const Logger = {
  behavior: new CategoryLogger(CATEGORIES.behavior),
  checkIn: new CategoryLogger(CATEGORIES.checkIn),
  sync: new CategoryLogger(CATEGORIES.sync),
  storage: new CategoryLogger(CATEGORIES.storage),
  network: new CategoryLogger(CATEGORIES.network),
  auth: new CategoryLogger(CATEGORIES.auth),
  ui: new CategoryLogger(CATEGORIES.ui),
  navigation: new CategoryLogger(CATEGORIES.navigation),
  analytics: new CategoryLogger(CATEGORIES.analytics),
  performance: new PerformanceLogger(),
};
