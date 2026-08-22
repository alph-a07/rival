import { beforeEach, expect, test, describe } from "vitest";
import { AppDatabase } from "@/data/db";
import { DEFAULT_SETTINGS, SettingsRepository } from "./SettingsRepository";

describe("SettingsRepository", () => {
  let db: AppDatabase;
  let repo: SettingsRepository;

  beforeEach(async () => {
    db = new AppDatabase();
    await Promise.all(db.tables.map((t) => t.clear()));
    repo = new SettingsRepository(db);
  });

  test("returns defaults when nothing is persisted", async () => {
    expect(await repo.get()).toEqual(DEFAULT_SETTINGS);
  });

  test("persists email nudges", async () => {
    await repo.setEmailNudgesEnabled(false);
    expect((await repo.get()).emailNudgesEnabled).toBe(false);
  });

  test("persists sync status", async () => {
    await repo.setSyncStatus("error");
    expect((await repo.get()).syncStatus).toBe("error");
  });

  test("keeps independent keys without clobbering", async () => {
    await repo.setEmailNudgesEnabled(false);
    await repo.setSyncStatus("connected");
    const settings = await repo.get();
    expect(settings.emailNudgesEnabled).toBe(false);
    expect(settings.syncStatus).toBe("connected");
  });

  test("persists theme", async () => {
    await repo.setTheme("light");
    expect((await repo.get()).theme).toBe("light");
    await repo.setTheme("dark");
    expect((await repo.get()).theme).toBe("dark");
  });

  test("persists synchronizing status", async () => {
    await repo.setSyncStatus("syncing");
    expect((await repo.get()).syncStatus).toBe("syncing");
  });

  test("rejects unknown sync status on read, falling back to default", async () => {
    await repo.setSyncStatus("whatever" as never);
    expect((await repo.get()).syncStatus).toBe(DEFAULT_SETTINGS.syncStatus);
  });

  test("rejects unknown theme on read, falling back to default", async () => {
    await repo.setTheme("sepia" as never);
    expect((await repo.get()).theme).toBe(DEFAULT_SETTINGS.theme);
  });
});
