import { describe, expect, it } from "vitest";

import {
  buildOrthoRectangleFoundationStripRingEntity,
  foundationStripOrthoRingFootprintContoursMm,
  foundationStripSegmentFootprintQuadMm,
  mergeCollinearFoundationStripSegments,
} from "./foundationStripGeometry";

describe("foundationStripGeometry", () => {
  it("footprint quad: смещение наружу/внутрь перпендикулярно оси", () => {
    const q = foundationStripSegmentFootprintQuadMm({ x: 0, y: 0 }, { x: 1000, y: 0 }, 0, -1, 50, 250);
    expect(q[0]).toEqual({ x: 0, y: -50 });
    expect(q[1]).toEqual({ x: 1000, y: -50 });
    expect(q[2]).toEqual({ x: 1000, y: 250 });
    expect(q[3]).toEqual({ x: 0, y: 250 });
  });

  it("mergeCollinear: два сегмента в одну линию с общим узлом сливаются", () => {
    const a = {
      kind: "segment" as const,
      id: "a",
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
      id: "b",
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
    const m = mergeCollinearFoundationStripSegments([a, b]);
    expect(m).toHaveLength(1);
    const seg0 = m[0];
    expect(seg0?.kind).toBe("segment");
    if (seg0?.kind === "segment") {
      expect(seg0.axisStart.x).toBe(0);
      expect(seg0.axisEnd.x).toBe(2000);
    }
  });

  it("ortho ring: одна сущность и контуры без четырёх перекрывающихся полос", () => {
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
      newId: () => "ring1",
    });
    expect(ring.kind).toBe("ortho_ring");
    expect(ring.id).toBe("ring1");
    const { outer, inner } = foundationStripOrthoRingFootprintContoursMm(0, 1000, 0, 500, 50, 250);
    expect(outer[0]).toEqual({ x: -50, y: -50 });
    expect(outer[1]).toEqual({ x: 1050, y: -50 });
    expect(inner[0]).toEqual({ x: 250, y: 250 });
    expect(inner[3]).toEqual({ x: 750, y: 250 });
  });

  it("mergeCollinear: ortho_ring в списке не ломает слияние сегментов", () => {
    const a = {
      kind: "segment" as const,
      id: "a",
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
      id: "b",
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
    const ring = buildOrthoRectangleFoundationStripRingEntity({
      layerId: "L",
      xmin: 0,
      xmax: 100,
      ymin: 0,
      ymax: 100,
      depthMm: 400,
      sideOutMm: 50,
      sideInMm: 250,
      createdAt: "t",
      newId: () => "r",
    });
    const m = mergeCollinearFoundationStripSegments([a, ring, b]);
    expect(m.filter((x) => x.kind === "segment")).toHaveLength(1);
    expect(m.find((x) => x.kind === "ortho_ring")).toBeTruthy();
  });
});
