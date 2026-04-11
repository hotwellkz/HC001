import { describe, expect, it } from "vitest";

import type { FoundationPileEntity } from "./foundationPile";
import type { FoundationStripOrthoRingEntity } from "./foundationStrip";
import {
  computeAutoFoundationPileLayout,
  defaultFoundationStripAutoPileSettings,
  foundationStripCenterPolylinesMm,
  interiorSpacingsAlongLengthMm,
  removeFoundationPilesWithUnreferencedAutoBatchOnLayer,
} from "./foundationStripAutoPiles";
import { foundationStripOrthoRingMaterialCenterLoopMm } from "./foundationStripGeometry";

describe("interiorSpacingsAlongLengthMm", () => {
  it("6300 мм и maxStep 3000 → равномерно 3 промежутка, 2 промежуточные сваи (2100, 4200)", () => {
    const s = interiorSpacingsAlongLengthMm(6300, 3000, true);
    expect(s).toHaveLength(2);
    expect(s[0]).toBeCloseTo(2100, 5);
    expect(s[1]).toBeCloseTo(4200, 5);
  });

  it("3000 и maxStep 3000 → без промежуточных", () => {
    expect(interiorSpacingsAlongLengthMm(3000, 3000, true)).toHaveLength(0);
  });
});

const pile = (p: Partial<FoundationPileEntity> & Pick<FoundationPileEntity, "id" | "layerId">): FoundationPileEntity => ({
  pileKind: "reinforcedConcrete",
  centerX: 0,
  centerY: 0,
  sizeMm: 400,
  capSizeMm: 400,
  heightMm: 1000,
  levelMm: 0,
  createdAt: "t",
  updatedAt: "t",
  ...p,
});

describe("removeFoundationPilesWithUnreferencedAutoBatchOnLayer", () => {
  it("удаляет авто-сваи на слое, если batchId нигде не указан в лентах", () => {
    const piles: FoundationPileEntity[] = [
      pile({ id: "a", layerId: "L", autoPileBatchId: "ghost" }),
      pile({ id: "b", layerId: "L" }),
      pile({ id: "c", layerId: "L2", autoPileBatchId: "ghost" }),
    ];
    const strips: FoundationStripOrthoRingEntity[] = [];
    const out = removeFoundationPilesWithUnreferencedAutoBatchOnLayer(piles, strips, "L");
    expect(out.map((p) => p.id).sort()).toEqual(["b", "c"]);
  });

  it("сохраняет авто-сваи, если strip на том же слое ссылается на batchId", () => {
    const piles: FoundationPileEntity[] = [pile({ id: "a", layerId: "L", autoPileBatchId: "b1" })];
    const strips: FoundationStripOrthoRingEntity[] = [
      {
        kind: "ortho_ring",
        id: "r1",
        layerId: "L",
        axisXminMm: 0,
        axisXmaxMm: 1000,
        axisYminMm: 0,
        axisYmaxMm: 1000,
        depthMm: 400,
        sideOutMm: 50,
        sideInMm: 250,
        createdAt: "t",
        autoPile: { batchId: "b1", settings: defaultFoundationStripAutoPileSettings() },
      },
    ];
    const out = removeFoundationPilesWithUnreferencedAutoBatchOnLayer(piles, strips, "L");
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe("a");
  });
});

describe("computeAutoFoundationPileLayout ortho_ring", () => {
  const orthoRing = (): FoundationStripOrthoRingEntity => ({
    kind: "ortho_ring",
    id: "r1",
    layerId: "L",
    axisXminMm: 0,
    axisXmaxMm: 10_000,
    axisYminMm: 0,
    axisYmaxMm: 5000,
    depthMm: 400,
    sideOutMm: 50,
    sideInMm: 250,
    createdAt: "t",
  });

  /** Углы осевого прямоугольника на полилинии центра ленты. */
  const axisCorners = [
    { x: 0, y: 0 },
    { x: 10_000, y: 0 },
    { x: 10_000, y: 5000 },
    { x: 0, y: 5000 },
  ];

  function minDistToCorners(piles: readonly { x: number; y: number }[]): number {
    let m = Infinity;
    for (const p of piles) {
      for (const c of axisCorners) {
        m = Math.min(m, Math.hypot(p.x - c.x, p.y - c.y));
      }
    }
    return m;
  }

  function minDistToRefPoints(piles: readonly { x: number; y: number }[], refs: readonly { x: number; y: number }[]) {
    let m = Infinity;
    for (const p of piles) {
      for (const c of refs) {
        m = Math.min(m, Math.hypot(p.x - c.x, p.y - c.y));
      }
    }
    return m;
  }

  it("прямоугольная ось: углы и равномерные промежуточные на длинной стороне", () => {
    const settings = { ...defaultFoundationStripAutoPileSettings(), maxStepMm: 3000 };
    const layout = computeAutoFoundationPileLayout([orthoRing()], settings);
    expect(layout).not.toBeNull();
    expect(layout!.levelMm).toBe(-400);
    expect(layout!.heightMm).toBe(1000);
    expect(layout!.pileCentersMm.length).toBeGreaterThanOrEqual(8);
  });

  it("оба чекбокса выключены — нет свай в углах оси (только по шагу вдоль рёбер)", () => {
    const settings = {
      ...defaultFoundationStripAutoPileSettings(),
      maxStepMm: 3000,
      placeAtCorners: false,
      placeAtJoints: false,
    };
    const layout = computeAutoFoundationPileLayout([orthoRing()], settings);
    expect(layout).not.toBeNull();
    expect(layout!.pileCentersMm.length).toBeGreaterThan(0);
    expect(minDistToCorners(layout!.pileCentersMm)).toBeGreaterThan(80);
  });

  it("только углы — есть сваи у углов линии центра сечения (не опорной оси)", () => {
    const ring = orthoRing();
    const settings = {
      ...defaultFoundationStripAutoPileSettings(),
      maxStepMm: 8000,
      placeAtCorners: true,
      placeAtJoints: false,
    };
    const layout = computeAutoFoundationPileLayout([ring], settings);
    expect(layout).not.toBeNull();
    const materialCorners = foundationStripOrthoRingMaterialCenterLoopMm(ring).slice(0, -1);
    expect(minDistToRefPoints(layout!.pileCentersMm, materialCorners)).toBeLessThan(15);
  });

  it("асимметричная лента 50/250: полилиния авто-свай смещена от опорной оси на (250−50)/2", () => {
    const ring = orthoRing();
    const loops = foundationStripCenterPolylinesMm(ring);
    expect(loops).toHaveLength(1);
    const loop = loops[0]!;
    const d = (ring.sideInMm - ring.sideOutMm) / 2;
    expect(loop[0]!.y).toBeCloseTo(ring.axisYminMm + d, 5);
    expect(loop[0]!.x).toBeCloseTo(ring.axisXminMm + d, 5);
  });

  it("симметричное сечение 150/150: линия центра совпадает с опорной осью", () => {
    const ring: FoundationStripOrthoRingEntity = {
      ...orthoRing(),
      sideOutMm: 150,
      sideInMm: 150,
    };
    const loop = foundationStripOrthoRingMaterialCenterLoopMm(ring);
    expect(loop[0]!.x).toBeCloseTo(ring.axisXminMm, 5);
    expect(loop[0]!.y).toBeCloseTo(ring.axisYminMm, 5);
  });
});
