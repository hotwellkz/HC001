/**
 * Парсинг CSS-цвета (#rrggbb) в число 0xRRGGBB для Pixi и др.
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
