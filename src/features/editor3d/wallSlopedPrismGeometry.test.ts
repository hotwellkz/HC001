import { describe, expect, it } from "vitest";

import { buildWallSlopedProfilePrismGeometry } from "./wallSlopedPrismGeometry";

describe("buildWallSlopedProfilePrismGeometry", () => {
  it("после финализации — неиндексированная геометрия с нормалями (без общих вершин между гранями)", () => {
    const width = 0.174;
    const depth = 4;
    const z = [-2, -1, 0, 1, 2];
    const h = [2.5, 2.4, 2.2, 2.35, 2.5].map((y) => y * 0.001);
    const geo = buildWallSlopedProfilePrismGeometry(width, depth, z, h);
    expect(geo.getIndex()).toBeNull();
    expect(geo.getAttribute("normal")).toBeTruthy();
    expect(geo.getAttribute("position")!.count).toBeGreaterThan(24);
    geo.dispose();
  });
});
