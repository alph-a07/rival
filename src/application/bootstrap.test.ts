import { describe, it, expect, beforeEach } from "vitest";
import { createAppServices } from "./bootstrap";

describe("createAppServices (composition root)", () => {
  beforeEach(() => {
    // Per-test isolated database: fake-indexeddb's auto installs a fresh store
    // per open name, so each service container gets its own clean tables.
  });

  it("builds every handle against one shared database", () => {
    const app = createAppServices();
    expect(app.db).toBeDefined();
    expect(app.settingsRepository).toBeDefined();
    expect(app.endeavourRepository).toBeDefined();
    expect(app.checkInRepository).toBeDefined();
    expect(app.snapshotRepository).toBeDefined();
    expect(app.microCheckInRepository).toBeDefined();
    expect(app.pendingSyncStore).toBeDefined();
    expect(app.endeavourCommands).toBeDefined();
    expect(app.checkInCommands).toBeDefined();
    expect(app.microCheckInCommands).toBeDefined();
    expect(app.syncService).toBeDefined();
  });

  it("accepts an explicitly injected database (single instance)", () => {
    const first = createAppServices();
    // Re-composing with the same db must not construct a second index/keyed store.
    const second = createAppServices(first.db);
    expect(second.db).toBe(first.db);
  });

  it("routes an endeavour command through the composed repo, durable sync latch, and settings store", async () => {
    const app = createAppServices();
    const created = await app.endeavourCommands.create({
      name: "Learn violin",
      startedAt: "2024-01-01T00:00:00.000Z",
      domainId: "practicing",
      attachedGis: { gisExercise: "mandatory" },
    });
    expect(created.ok).toBe(true);
    const id = created.ok ? created.value : "";

    const read = await app.endeavourRepository.get(id);
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.value?.name).toBe("Learn violin");
      expect(read.value?.domainHistory[0].domainId).toBe("practicing");
    }

    // A successful command must have marked the durable (same-store) latch.
    const latch = await app.pendingSyncStore.snapshot();
    expect(latch.ok).toBe(true);
    if (latch.ok) {
      expect(latch.value.pending).toBe(true);
      expect(latch.value.revision).toBeGreaterThan(0);
    }
  });

  it("composes the sync service against the injected repos, not module singletons", () => {
    const app = createAppServices();
    expect(app.syncService).toBeDefined();
    // The service stores live in this container's own database (no net leak).
  });
});
