import { describe, it, expect } from "vitest";
import { snapshotToRow, rowToSnapshot, type SnapshotRow } from "./SnapshotRow";
import type { Snapshot } from "@/domain/models/Snapshot";

function makeSnapshot(): Snapshot {
  return {
    id: "s1",
    endeavourId: "e1",
    checkInId: "c1",
    timestamp: "2024-01-02T00:00:00.000Z",
    domainId: "learning",
    segmentStartDate: "2024-01-01T00:00:00.000Z",
    n: 1,
    raw: 62,
    forecast: 60,
    residual: 2,
    level: 61,
    trend: 1.2,
    consistencyStatus: "dialed_in",
  };
}

describe("Snapshot row mapping", () => {
  it("maps a domain Snapshot losslessly to its stored row", () => {
    const row = snapshotToRow(makeSnapshot());
    const expected: SnapshotRow = { ...makeSnapshot() };
    expect(row).toEqual(expected);
  });

  it("round-trips row -> domain -> row without loss", () => {
    const subject = makeSnapshot();
    expect(rowToSnapshot(snapshotToRow(subject))).toEqual(subject);
  });

  it("preserves null forecast/residual through the seam", () => {
    const subject = { ...makeSnapshot(), forecast: null, residual: null };
    expect(snapshotToRow(subject)).toMatchObject({ forecast: null, residual: null });
  });
});
