import { describe, expect, it } from "vitest";

import { computeAnchoredPopoverPosition } from "./computeAnchoredPopoverPosition";

describe("computeAnchoredPopoverPosition", () => {
  it("размещает меню ниже якоря и выравнивает по правому краю", () => {
    const anchor = { right: 200, bottom: 50, top: 10, left: 160, width: 40, height: 40, x: 160, y: 10 } as DOMRect;
    const { left, top } = computeAnchoredPopoverPosition(anchor, 180, 100, 400, 300);
    expect(left).toBe(200 - 180);
    expect(top).toBe(50 + 6);
  });

  it("переносит вверх, если снизу не хватает места", () => {
    const anchor = { right: 200, bottom: 280, top: 240, left: 160, width: 40, height: 40, x: 160, y: 240 } as DOMRect;
    const { top } = computeAnchoredPopoverPosition(anchor, 180, 100, 400, 300);
    expect(top).toBe(240 - 6 - 100);
  });
});
