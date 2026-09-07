import { beforeEach, expect, test, describe } from "vitest";
import { AppDatabase } from "@/data/db";
import {
  createMicroCheckInRepository,
  type MicroCheckInRepository,
} from "./MicroCheckInRepository";
import { unwrap } from "@/domain/errors/Result";

describe("MicroCheckInRepository", () => {
  let db: AppDatabase;
  let repo: MicroCheckInRepository;

  beforeEach(async () => {
    db = new AppDatabase();
    await Promise.all(db.tables.map((t) => t.clear()));
    repo = createMicroCheckInRepository(db);
  });

  test("logs a mood and returns an id", async () => {
    const id = unwrap(await repo.create("good", "2026-01-10T09:00:00.000Z"));
    expect(typeof id).toBe("string");
    const today = unwrap(await repo.getForDay("2026-01-10"));
    expect(today?.mood).toBe("good");
  });

  test("enforces the once-a-day cap", async () => {
    await repo.create("rough", "2026-01-10T08:00:00.000Z");
    const second = await repo.create("good", "2026-01-10T20:00:00.000Z");
    expect(second.ok).toBe(false);
  });

  test("allows a mood on a different day", async () => {
    await repo.create("rough", "2026-01-10T08:00:00.000Z");
    const id = unwrap(await repo.create("great", "2026-01-11T08:00:00.000Z"));
    expect(typeof id).toBe("string");
  });

  test("loggedToday reflects the current-day cap", async () => {
    expect(unwrap(await repo.loggedToday("2026-01-10T12:00:00.000Z"))).toBe(false);
    await repo.create("okay", "2026-01-10T09:00:00.000Z");
    expect(unwrap(await repo.loggedToday("2026-01-10T18:00:00.000Z"))).toBe(true);
  });

  test("getRecent returns newest-first", async () => {
    await repo.create("rough", "2026-01-09T09:00:00.000Z");
    await repo.create("good", "2026-01-10T09:00:00.000Z");
    const recent = unwrap(await repo.getRecent());
    expect(recent.map((r) => r.mood)).toEqual(["good", "rough"]);
  });
});
