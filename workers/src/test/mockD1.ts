import type {
  D1Database,
  D1PreparedStatement,
  D1Result,
  D1ExecResult,
} from "@cloudflare/workers-types";
// oxlint-disable-next-line no-restricted-imports
import type { Env } from "../types";

export interface Row {
  [key: string]: unknown;
}

interface PreparedRecord {
  sql: string;
  bound: unknown[];
  runs: D1Result[];
}

export class MockD1 {
  prepRecords: PreparedRecord[] = [];
  private firstQueue: Row[] = [];

  /** Enqueues a row the next `first()` call will return (FIFO). */
  pushFirst(row: Row): void {
    this.firstQueue.push(row);
  }

  prepare(sql: string): D1PreparedStatement {
    const rec: PreparedRecord = { sql, bound: [], runs: [] };
    this.prepRecords.push(rec);

    const stmt = {
      bind: (...values: unknown[]): D1PreparedStatement => {
        rec.bound = values;
        return stmt;
      },
      first: async (): Promise<Row | null> => {
        return this.firstQueue.shift() ?? null;
      },
      run: async (): Promise<D1Result> => {
        const result: D1Result = {
          success: true,
          meta: { changes: 1 } as D1Result["meta"],
          results: [],
        };
        rec.runs.push(result);
        return result;
      },
      raw: async (): Promise<unknown[]> => [],
      all: async (): Promise<{ results: Row[]; success: boolean }> => ({
        results: [],
        success: true,
      }),
    } as unknown as D1PreparedStatement;

    return stmt;
  }

  batch<T = unknown>(): Promise<D1Result<T>[]> {
    return Promise.resolve([]);
  }
  exec(): Promise<D1ExecResult> {
    return Promise.resolve({ count: 0, duration: 0, success: true, results: [] });
  }
  dump(): Promise<ArrayBuffer> {
    return Promise.resolve(new ArrayBuffer(0));
  }
}

/** Builds a ready-to-use `Env` for tests, exposing the mock handle. */
export function testEnv(): { env: Env; db: MockD1 } {
  const db = new MockD1();
  const env: Env = {
    DRIVE_TOKENS: db as unknown as D1Database,
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-secret",
    ENVIRONMENT: "development",
  };
  return { env, db };
}
