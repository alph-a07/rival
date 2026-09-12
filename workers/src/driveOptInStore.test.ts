import { describe, expect, test } from "vitest";
import { readDriveOptIn, upsertDriveOptIn, deleteDriveOptIn } from "./driveOptInStore";
import { testEnv } from "./test/mockD1";

describe("driveOptInStore", () => {
  test("readDriveOptIn reads a stored 1/0 as boolean", async () => {
    const { env, db } = testEnv();
    db.pushFirst({ drive_opt_in: 1 });
    expect(await readDriveOptIn(env, "u")).toBe(true);
    const [stmt] = db.prepRecords.slice(-1);
    expect(stmt.sql).toContain("WHERE sub = ?1");
    expect(stmt.bound).toContain("u");
  });

  test("readDriveOptIn returns null when row absent", async () => {
    const { env } = testEnv();
    expect(await readDriveOptIn(env, "u")).toBeNull();
  });

  test("upsertDriveOptIn binds 1/0 and updates on conflict(sub)", async () => {
    const { env, db } = testEnv();
    await upsertDriveOptIn(env, "u", true, "2026-01-01T00:00:00.000Z");
    const stmt = db.prepRecords[db.prepRecords.length - 1];
    expect(stmt.sql).toContain("ON CONFLICT(sub) DO UPDATE SET");
    expect(stmt.bound).toEqual(["u", 1, "2026-01-01T00:00:00.000Z"]);
  });

  test("deleteDriveOptIn deletes the row for a sub", async () => {
    const { env, db } = testEnv();
    await deleteDriveOptIn(env, "u");
    const stmt = db.prepRecords[db.prepRecords.length - 1];
    expect(stmt.sql).toContain("DELETE FROM user_settings WHERE sub = ?1");
  });
});
