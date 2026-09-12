import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // @cloudflare/workers-types types (D1Database, Request) don't conflict at
    // runtime in node, but keep tests isolated from any wrangler globals.
    globals: false,
  },
});
