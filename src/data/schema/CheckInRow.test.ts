import { describe, it, expect } from "vitest";
import { checkInToRow, rowToCheckIn, type CheckInRow } from "./CheckInRow";
import type { CheckIn } from "@/domain/models/CheckIn";

function makeCheckIn(): CheckIn {
  return {
    id: "c1",
    endeavourId: "e1",
    timestamp: "2024-01-02T09:00:00.000Z",
    rawScore: 62,
    responses: [
      { gisId: "g1", questionId: "q1", optionIds: ["a", "b"] },
      { gisId: "g1", questionId: "q2", optionIds: [] },
    ],
  };
}

describe("CheckIn row mapping", () => {
  it("maps a domain CheckIn to its stored/exported row", () => {
    const subject = makeCheckIn();
    const row = checkInToRow(subject);
    const expected: CheckInRow = {
      ...subject,
      responses: subject.responses.map((r) => ({ ...r })),
    };
    expect(row).toEqual(expected);
  });

  it("round-trips row -> domain without mutation", () => {
    const subject = makeCheckIn();
    expect(rowToCheckIn(checkInToRow(subject))).toEqual(subject);
  });

  it("returns deep copies so row mutation never touches the source", () => {
    const subject = makeCheckIn();
    const row = checkInToRow(subject);
    row.responses[0].optionIds.push("x");
    expect(subject.responses[0].optionIds).toEqual(["a", "b"]);
  });
});
