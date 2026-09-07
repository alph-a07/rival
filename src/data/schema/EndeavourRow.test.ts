import { describe, it, expect } from "vitest";
import { endeavourToRow, rowToEndeavour, type EndeavourRow } from "./EndeavourRow";
import type { Endeavour } from "@/domain/models/Endeavour";

function makeEndeavour(): Endeavour {
  return {
    id: "e1",
    name: "Learn piano",
    domainHistory: [
      {
        domainId: "practicing",
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: null,
        attachedGis: { gis1: "mandatory", gis2: "optional" },
      },
      {
        domainId: "learning",
        startDate: "2023-06-01T00:00:00.000Z",
        endDate: "2023-12-31T00:00:00.000Z",
        attachedGis: {},
      },
    ],
  };
}

describe("Endeavour row mapping", () => {
  it("maps domain history and attached GIS tiers to a row", () => {
    const row = endeavourToRow(makeEndeavour());
    const expected: EndeavourRow = makeEndeavour();
    expect(row).toEqual(expected);
  });

  it("round-trips row -> domain -> row without loss", () => {
    const subject = makeEndeavour();
    expect(rowToEndeavour(endeavourToRow(subject))).toEqual(subject);
  });

  it("preserves an empty attachedGis set on a closed segment", () => {
    const row = endeavourToRow(makeEndeavour());
    expect(row.domainHistory[1].attachedGis).toEqual({});
  });
});
