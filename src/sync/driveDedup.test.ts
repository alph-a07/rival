import { describe, it, expect } from "vitest";
import { pickAuthoritative, isCleanSet, type BackupCandidate } from "./driveDedup";

const c = (id: string, createdAt: string): BackupCandidate => ({ id, createdAt });

describe("pickAuthoritative", () => {
  it("returns null for an empty candidate set", () => {
    expect(pickAuthoritative([])).toBeNull();
  });

  it("keeps the sole candidate and trashes nothing", () => {
    const survivor = pickAuthoritative([c("a", "2024-01-01T00:00:00Z")]);
    expect(survivor).toEqual({ id: "a", trashed: [] });
  });

  it("keeps the earliest-created file and flags the rest for trash", () => {
    const survivor = pickAuthoritative([
      c("newer", "2024-03-01T00:00:00Z"),
      c("older", "2024-01-01T00:00:00Z"),
      c("middle", "2024-02-01T00:00:00Z"),
    ]);
    expect(survivor).toEqual({
      id: "older",
      trashed: ["newer", "middle"],
    });
  });

  it("breaks createdTime ties deterministically on the smallest id", () => {
    const survivor = pickAuthoritative([
      c("zfile", "2024-01-01T00:00:00Z"),
      c("afile", "2024-01-01T00:00:00Z"),
    ]);
    expect(survivor).toEqual({ id: "afile", trashed: ["zfile"] });
  });

  it("is stable regardless of candidate order", () => {
    const unordered = pickAuthoritative([
      c("b", "2024-02-01T00:00:00Z"),
      c("a", "2024-01-01T00:00:00Z"),
    ]);
    const ordered = pickAuthoritative([
      c("a", "2024-01-01T00:00:00Z"),
      c("b", "2024-02-01T00:00:00Z"),
    ]);
    expect(unordered).toEqual(ordered);
  });
});

describe("isCleanSet", () => {
  it("is clean for zero or one files", () => {
    expect(isCleanSet([])).toBe(true);
    expect(isCleanSet([c("a", "2024-01-01T00:00:00Z")])).toBe(true);
  });

  it("is dirty once a duplicate exists", () => {
    expect(isCleanSet([c("a", "2024-01-01T00:00:00Z"), c("b", "2024-01-01T00:00:00Z")])).toBe(
      false,
    );
  });
});
