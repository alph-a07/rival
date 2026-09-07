import { describe, it, expect } from "vitest";
import { buildSnapshotFromCheckIn, CURRENT_CALC_VERSION } from "./checkInProcessor";
import { isInRawScoreRange, isInLevelRange } from "./rawScore";
import type { CheckIn } from "@/domain/models/CheckIn";
import type { DomainSegment } from "@/domain/models/Endeavour";

const segment: DomainSegment = {
  domainId: "learning",
  startDate: "2024-01-01T00:00:00.000Z",
  endDate: null,
  attachedGis: {},
};

const checkIn: CheckIn = {
  id: "c1",
  endeavourId: "e1",
  timestamp: "2024-01-02T00:00:00.000Z",
  responses: [],
  rawScore: 0,
};

describe("Snapshot derivation invariant", () => {
  it("always yields a finite raw/level inside the 0-100 score band", () => {
    const snapshot = buildSnapshotFromCheckIn(checkIn, segment, new Map(), null, []);
    expect(isInRawScoreRange(snapshot.raw)).toBe(true);
    expect(isInLevelRange(snapshot.level)).toBe(true);
  });

  it("stamps the current calculation provenance on every derived record", () => {
    const snapshot = buildSnapshotFromCheckIn(checkIn, segment, new Map(), null, []);
    expect(snapshot.calcVersion).toBe(CURRENT_CALC_VERSION);
  });
});
