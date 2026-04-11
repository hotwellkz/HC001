import { describe, expect, it } from "vitest";

import { cssColorToPixiNumber, cssHexToPixiNumber } from "./cssColor";

describe("cssHexToPixiNumber", () => {
  it("парсит #RRGGBB", () => {
    expect(cssHexToPixiNumber("#14171b")).toBe(0x14171b);
  });

  it("парсит #RGB", () => {
    expect(cssHexToPixiNumber("#abc")).toBe(0xaabbcc);
  });
});

describe("cssColorToPixiNumber", () => {
  it("парсит hex как cssHexToPixiNumber", () => {
    expect(cssColorToPixiNumber("#aabbcc")).toBe(0xaabbcc);
  });

  it("парсит rgb()", () => {
    expect(cssColorToPixiNumber("rgb(10, 20, 30)")).toBe(0x0a141e);
  });

  it("парсит rgba() (игнорируя альфу для Pixi)", () => {
    expect(cssColorToPixiNumber("rgba(255, 128, 64, 0.5)")).toBe(0xff8040);
  });

  it("обрезает пробелы", () => {
    expect(cssColorToPixiNumber("  #112233  ")).toBe(0x112233);
  });
});
