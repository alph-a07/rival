// Test setup: provides an in-memory IndexedDB so Dexie-backed repositories can
// be exercised in vitest's default `node` environment. Imported once before
// every test run via the vitest `setupFiles` config.
import "fake-indexeddb/auto";
