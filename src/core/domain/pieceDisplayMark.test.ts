import { describe, expect, it } from "vitest";

import type { LumberPiece } from "./wallCalculation";
import {
  lumberGroupKeySectionAndLength,
  lumberGroupedPositionIndexByPieceId,
  lumberPiecesSortedForDisplay,
} from "./pieceDisplayMark";

function piece(partial: Partial<LumberPiece> & Pick<LumberPiece, "id">): LumberPiece {
  return {
    wallId: "w1",
    wallMark: "C_3",
    calculationId: "c1",
    role: "joint_board",
    sequenceNumber: 1,
    pieceMark: "x",
    sectionThicknessMm: 45,
    sectionDepthMm: 145,
    startOffsetMm: 0,
    endOffsetMm: 100,
    lengthMm: 2410,
    orientation: "across_wall",
    materialType: "wood",
    sortKey: 0,
    displayOrder: 0,
    ...partial,
  };
}

describe("lumberGroupedPositionIndexByPieceId", () => {
  it("одинаковое сечение и длина — один номер позиции", () => {
    const a = piece({ id: "a", displayOrder: 0, sortKey: 0, lengthMm: 2410 });
    const b = piece({ id: "b", displayOrder: 1, sortKey: 0, lengthMm: 2410 });
    const c = piece({ id: "c", displayOrder: 2, sortKey: 0, lengthMm: 1800 });
    const m = lumberGroupedPositionIndexByPieceId([a, b, c]);
    expect(m.get("a")).toBe(1);
    expect(m.get("b")).toBe(1);
    expect(m.get("c")).toBe(2);
    expect(lumberGroupKeySectionAndLength(a)).toBe(lumberGroupKeySectionAndLength(b));
    expect(lumberGroupKeySectionAndLength(a)).not.toBe(lumberGroupKeySectionAndLength(c));
  });

  it("порядок позиций по первому вхождению в lumberPiecesSortedForDisplay", () => {
    const longFirst = piece({ id: "long", displayOrder: 0, lengthMm: 3000 });
    const shortLater = piece({ id: "short", displayOrder: 1, lengthMm: 2000 });
    const longDup = piece({ id: "long2", displayOrder: 2, lengthMm: 3000 });
    const sorted = lumberPiecesSortedForDisplay([longFirst, shortLater, longDup]);
    expect(sorted.map((p) => p.id)).toEqual(["long", "short", "long2"]);
    const m = lumberGroupedPositionIndexByPieceId([longFirst, shortLater, longDup]);
    expect(m.get("long")).toBe(1);
    expect(m.get("short")).toBe(2);
    expect(m.get("long2")).toBe(1);
  });
});
