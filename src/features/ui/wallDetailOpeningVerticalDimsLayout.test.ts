import { describe, expect, it } from "vitest";

import {
  computeInsideOpeningVerticalDimPlacementMm,
  seamCentersInOpeningSpanMm,
  sipPanelMarkRectsSheetMm,
  WALL_DETAIL_OPENING_V_DIM_INSET_MM,
} from "@/features/ui/wallDetailOpeningVerticalDimsLayout";
import {
  DIMENSION_FONT_SIZE_WALL_DETAIL_VERTICAL_OPENING_PX,
  DIMENSION_V_LABEL_GAP_OPENING_INTERIOR_PX,
} from "@/shared/dimensionStyle";

const labelGap = DIMENSION_V_LABEL_GAP_OPENING_INTERIOR_PX;
const fontPx = DIMENSION_FONT_SIZE_WALL_DETAIL_VERTICAL_OPENING_PX;

describe("computeInsideOpeningVerticalDimPlacementMm", () => {
  it("ставит ось внутри проёма у правого края при пустых препятствиях", () => {
    const pl = computeInsideOpeningVerticalDimPlacementMm(
      {
        openingId: "o1",
        x0: 1000,
        x1: 2250,
        segments: [
          { y0Mm: 2400, y1Mm: 2800, text: "900" },
          { y0Mm: 1100, y1Mm: 2400, text: "1300" },
        ],
      },
      [],
      [],
      [],
      0.12,
      labelGap,
      fontPx,
    );
    expect(pl.isOutsideOpening).toBe(false);
    expect(pl.xLineMm).toBeGreaterThan(1000 + WALL_DETAIL_OPENING_V_DIM_INSET_MM);
    expect(pl.xLineMm).toBeLessThanOrEqual(2250 - WALL_DETAIL_OPENING_V_DIM_INSET_MM + 0.5);
    expect(pl.labelSide).toBe("left");
  });

  it("сдвигает ось, если на правом краю каркас", () => {
    const pl = computeInsideOpeningVerticalDimPlacementMm(
      {
        openingId: "o1",
        x0: 0,
        x1: 2000,
        segments: [{ y0Mm: 500, y1Mm: 2500, text: "1300" }],
      },
      [{ x0: 1920, x1: 2000, y0: 400, y1: 2600 }],
      [],
      [],
      0.12,
      labelGap,
      fontPx,
    );
    expect(pl.xLineMm).toBeLessThan(1920 - 8);
  });

  it("избегает подписи панели в полосе сегмента", () => {
    const pl = computeInsideOpeningVerticalDimPlacementMm(
      {
        openingId: "o1",
        x0: 500,
        x1: 2500,
        segments: [{ y0Mm: 1200, y1Mm: 2200, text: "1300" }],
      },
      [],
      [{ x0: 2100, x1: 2480, y0: 1500, y1: 1900 }],
      [],
      0.12,
      labelGap,
      fontPx,
    );
    expect(pl.xLineMm).toBeLessThan(2080);
  });

  it("при невозможности внутри — выносит наружу", () => {
    const lumber = [{ x0: 15, x1: 1985, y0: 0, y1: 3000 }];
    const pl = computeInsideOpeningVerticalDimPlacementMm(
      {
        openingId: "o1",
        x0: 0,
        x1: 2000,
        segments: [{ y0Mm: 500, y1Mm: 2500, text: "1300" }],
      },
      lumber,
      [],
      [],
      0.12,
      labelGap,
      fontPx,
    );
    expect(pl.isOutsideOpening).toBe(true);
    expect(pl.xLineMm).toBeGreaterThan(2000);
  });
});

describe("seamCentersInOpeningSpanMm", () => {
  it("фильтрует стыки по интервалу проёма", () => {
    expect(seamCentersInOpeningSpanMm([100, 500, 900, 1200], 400, 1000)).toEqual([500, 900]);
  });
});

describe("sipPanelMarkRectsSheetMm", () => {
  it("строит bbox вокруг центра полосы", () => {
    const r = sipPanelMarkRectsSheetMm([{ drawX0: 0, drawX1: 100, drawY0: 200, drawY1: 400 }]);
    expect(r[0]!.x0).toBeLessThan(50);
    expect(r[0]!.x1).toBeGreaterThan(50);
    expect(r[0]!.y0).toBeLessThan(300);
    expect(r[0]!.y1).toBeGreaterThan(300);
  });
});
