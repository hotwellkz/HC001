import { describe, expect, it } from "vitest";

import { cssHexToPixiNumber } from "./cssColor";

describe("cssHexToPixiNumber", () => {
  it("парсит #RRGGBB", () => {
    expect(cssHexToPixiNumber("#14171b")).toBe(0x14171b);
  });

  it("парсит #RGB", () => {
    expect(cssHexToPixiNumber("#abc")).toBe(0xaabbcc);
  });
});
