import { describe, expect, it } from "vitest";

import {
  buildOrthoRectangleFoundationStripRingEntity,
  mergeCollinearFoundationStripSegments,
} from "./foundationStripGeometry";
import { mergeTouchingFoundationStripBands, pointInFootprintPolyEntityMm } from "./foundationStripMerge";

function idGen() {
  let n = 0;
  return () => `e${n++}`;
}

describe("mergeTouchingFoundationStripBands", () => {
  it("1: две линейные под 90° с общим узлом дают один footprint_poly", () => {
    const newId = idGen();
    const a = {
      kind: "segment" as const,
      id: newId(),
      layerId: "L",
      axisStart: { x: 0, y: 0 },
      axisEnd: { x: 1000, y: 0 },
      outwardNormalX: 0,
      outwardNormalY: -1,
      depthMm: 400,
      sideOutMm: 50,
      sideInMm: 250,
      createdAt: "t",
    };
    const b = {
      kind: "segment" as const,
      id: newId(),
      layerId: "L",
      axisStart: { x: 1000, y: 0 },
      axisEnd: { x: 1000, y: 500 },
      outwardNormalX: 1,
      outwardNormalY: 0,
      depthMm: 400,
      sideOutMm: 50,
      sideInMm: 250,
      createdAt: "t",
    };
    const m = mergeTouchingFoundationStripBands([a, b], { newId });
    expect(m).toHaveLength(1);
    expect(m[0]?.kind).toBe("footprint_poly");
  });

  it("2: две коллинеарные на одной линии сливаются в один объект (collinear и/или band)", () => {
    const newId = idGen();
    const gap = 1;
    const a = {
      kind: "segment" as const,
      id: newId(),
      layerId: "L",
      axisStart: { x: 0, y: 0 },
      axisEnd: { x: 1000 - gap, y: 0 },
      outwardNormalX: 0,
      outwardNormalY: -1,
      depthMm: 400,
      sideOutMm: 50,
      sideInMm: 250,
      createdAt: "t",
    };
    const b = {
      kind: "segment" as const,
      id: newId(),
      layerId: "L",
      axisStart: { x: 1000, y: 0 },
      axisEnd: { x: 2000, y: 0 },
      outwardNormalX: 0,
      outwardNormalY: -1,
      depthMm: 400,
      sideOutMm: 50,
      sideInMm: 250,
      createdAt: "t",
    };
    const col = mergeCollinearFoundationStripSegments([a, b]);
    const m = mergeTouchingFoundationStripBands(col, { newId });
    expect(m).toHaveLength(1);
    expect(m[0]?.kind === "segment" || m[0]?.kind === "footprint_poly").toBe(true);
  });

  it("3: частичное перекрытие двух параллельных лент — один контур", () => {
    const newId = idGen();
    const a = {
      kind: "segment" as const,
      id: newId(),
      layerId: "L",
      axisStart: { x: 0, y: 0 },
      axisEnd: { x: 1200, y: 0 },
      outwardNormalX: 0,
      outwardNormalY: -1,
      depthMm: 400,
      sideOutMm: 50,
      sideInMm: 250,
      createdAt: "t",
    };
    const b = {
      kind: "segment" as const,
      id: newId(),
      layerId: "L",
      axisStart: { x: 800, y: 0 },
      axisEnd: { x: 2000, y: 0 },
      outwardNormalX: 0,
      outwardNormalY: -1,
      depthMm: 400,
      sideOutMm: 50,
      sideInMm: 250,
      createdAt: "t",
    };
    const m = mergeTouchingFoundationStripBands([a, b], { newId });
    expect(m).toHaveLength(1);
  });

  it("4: линейная лента, примыкающая к ortho_ring, объединяется", () => {
    const newId = idGen();
    const ring = buildOrthoRectangleFoundationStripRingEntity({
      layerId: "L",
      xmin: 0,
      xmax: 1000,
      ymin: 0,
      ymax: 500,
      depthMm: 400,
      sideOutMm: 50,
      sideInMm: 250,
      createdAt: "t",
      newId,
    });
    const seg = {
      kind: "segment" as const,
      id: newId(),
      layerId: "L",
      axisStart: { x: 1000, y: 0 },
      axisEnd: { x: 2000, y: 0 },
      outwardNormalX: 0,
      outwardNormalY: -1,
      depthMm: 400,
      sideOutMm: 50,
      sideInMm: 250,
      createdAt: "t",
    };
    const m = mergeTouchingFoundationStripBands([ring, seg], { newId });
    expect(m.length).toBeGreaterThanOrEqual(1);
    const fp = m.find((x) => x.kind === "footprint_poly");
    expect(fp?.kind).toBe("footprint_poly");
    if (fp?.kind === "footprint_poly") {
      expect(pointInFootprintPolyEntityMm({ x: 500, y: 0 }, fp)).toBe(true);
      expect(pointInFootprintPolyEntityMm({ x: 1500, y: 0 }, fp)).toBe(true);
    }
  });

  it("5: разные sideOut/sideIn при пересечении — один контур (не зависит от compat по ширине)", () => {
    const newId = idGen();
    const a = {
      kind: "segment" as const,
      id: newId(),
      layerId: "L",
      axisStart: { x: 0, y: 0 },
      axisEnd: { x: 2000, y: 0 },
      outwardNormalX: 0,
      outwardNormalY: -1,
      depthMm: 400,
      sideOutMm: 50,
      sideInMm: 250,
      createdAt: "2020-01-01T00:00:00.000Z",
    };
    const b = {
      kind: "segment" as const,
      id: newId(),
      layerId: "L",
      axisStart: { x: 1000, y: 0 },
      axisEnd: { x: 1000, y: 500 },
      outwardNormalX: 1,
      outwardNormalY: 0,
      depthMm: 400,
      sideOutMm: 150,
      sideInMm: 150,
      createdAt: "2020-01-02T00:00:00.000Z",
    };
    const m = mergeTouchingFoundationStripBands([a, b], { newId });
    expect(m).toHaveLength(1);
    const u = m[0]!;
    expect(u.depthMm).toBe(400);
    expect(u.sideOutMm).toBe(150);
    expect(u.sideInMm).toBe(150);
    if (u.kind === "footprint_poly") {
      expect(pointInFootprintPolyEntityMm({ x: 1000, y: 0 }, u)).toBe(true);
    }
  });
});
