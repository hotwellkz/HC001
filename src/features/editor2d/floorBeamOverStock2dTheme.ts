import { cssColorToPixiNumber } from "@/shared/cssColor";

/**
 * Семантические цвета «балка длиннее max заготовки» из theme.css (light/dark).
 * Pixi 2D читает актуальную тему с document.documentElement.
 */
export interface FloorBeamOverStockPixiPaint {
  readonly fillRgb: number;
  readonly strokeRgb: number;
  readonly fillAlphaActive: number;
  readonly fillAlphaContext: number;
  readonly strokeAlphaActive: number;
  readonly strokeAlphaContext: number;
}

function parseAlphaVar(cs: CSSStyleDeclaration, name: string, fallback: number): number {
  const v = parseFloat(cs.getPropertyValue(name).trim());
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : fallback;
}

export function readFloorBeamOverStockPaintFromTheme(): FloorBeamOverStockPixiPaint {
  const el = document.documentElement;
  const cs = getComputedStyle(el);
  const stroke =
    cs.getPropertyValue("--color-drawing-floor-beam-over-stock-stroke").trim() || "#e4a8b0";
  const fill = cs.getPropertyValue("--color-drawing-floor-beam-over-stock-fill").trim() || stroke;
  return {
    strokeRgb: cssColorToPixiNumber(stroke),
    fillRgb: cssColorToPixiNumber(fill),
    fillAlphaActive: parseAlphaVar(cs, "--floor-beam-over-stock-fill-alpha-active", 0.14),
    fillAlphaContext: parseAlphaVar(cs, "--floor-beam-over-stock-fill-alpha-context", 0.09),
    strokeAlphaActive: parseAlphaVar(cs, "--floor-beam-over-stock-stroke-alpha-active", 0.78),
    strokeAlphaContext: parseAlphaVar(cs, "--floor-beam-over-stock-stroke-alpha-context", 0.4),
  };
}
