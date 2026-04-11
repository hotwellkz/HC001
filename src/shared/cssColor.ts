/**
 * Парсинг CSS-цвета в число 0xRRGGBB для Pixi (hex, rgb(), rgba()).
 * Значения из theme.css могут быть в любом из этих форматов.
 */
export function cssHexToPixiNumber(css: string): number {
  const s = css.trim();
  if (s.startsWith("#")) {
    const hex = s.slice(1);
    if (hex.length === 6) {
      return parseInt(hex, 16);
    }
    if (hex.length === 3) {
      const r = parseInt(hex[0]! + hex[0]!, 16);
      const g = parseInt(hex[1]! + hex[1]!, 16);
      const b = parseInt(hex[2]! + hex[2]!, 16);
      return (r << 16) | (g << 8) | b;
    }
  }
  return 0x14171b;
}

/**
 * Универсальный парсер для переменных темы (hex / rgb / rgba).
 */
export function cssColorToPixiNumber(css: string): number {
  const s = css.trim();
  if (s.startsWith("#")) {
    return cssHexToPixiNumber(s);
  }
  const m = s.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+\s*)?\)/i,
  );
  if (m) {
    const r = Math.min(255, Math.max(0, Math.round(Number(m[1]))));
    const g = Math.min(255, Math.max(0, Math.round(Number(m[2]))));
    const b = Math.min(255, Math.max(0, Math.round(Number(m[3]))));
    return (r << 16) | (g << 8) | b;
  }
  return cssHexToPixiNumber(s);
}
