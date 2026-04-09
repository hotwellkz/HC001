import type { LumberPiece, SipPanelRegion } from "./wallCalculation";

/** Марка стены для подписей (как в проекте), без изменения доменных полей. */
export function wallMarkLabelForDisplay(wallMark: string | undefined | null, fallbackIdSlice: string): string {
  const t = wallMark?.trim();
  return t && t.length > 0 ? t : fallbackIdSlice;
}

/**
 * SIP-панель для UI: короткая марка `П1`, `П2`, … (без префикса стены).
 * `wallMark` не используется — оставлен для совместимости вызовов; внутренний `pieceMark` в домене не меняется.
 * `zeroBasedIndex` — порядковый индекс панели слева направо (0 = первая по оси стены).
 */
export function formatSipPanelDisplayMark(_wallMark: string, zeroBasedIndex: number): string {
  return `П${zeroBasedIndex + 1}`;
}

/**
 * Доска расчёта для UI: короткая марка `Д1`, `Д2`, … (без префикса стены).
 * `wallMark` не используется — оставлен для совместимости вызовов.
 * `displayIndexOneBased` — сквозная нумерация по всем доскам стены в порядке отображения.
 */
export function formatLumberDisplayMark(_wallMark: string, displayIndexOneBased: number): string {
  return `Д${displayIndexOneBased}`;
}

/**
 * Полная пользовательская марка доски для таблиц/спецификации: `{wall}-Д-{n}`.
 * Для подписи только номером на чертеже см. порядковый индекс, не эту строку.
 */
export function formatLumberFullDisplayMark(wallMark: string, displayIndexOneBased: number): string {
  const w = wallMark.trim() || "WALL";
  return `${w}-Д-${displayIndexOneBased}`;
}

/** Порядок досок в таблицах/подписях: как в расчёте (стабильный порядок построения). */
export function lumberPiecesSortedForDisplay(pieces: readonly LumberPiece[]): LumberPiece[] {
  return [...pieces].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return a.sortKey - b.sortKey;
  });
}

export function lumberDisplayIndexByPieceId(pieces: readonly LumberPiece[]): ReadonlyMap<string, number> {
  const sorted = lumberPiecesSortedForDisplay(pieces);
  const m = new Map<string, number>();
  sorted.forEach((p, i) => m.set(p.id, i + 1));
  return m;
}

/** SIP: слева направо вдоль стены; при равных координатах — по доменному index. */
export function sipRegionsSortedForDisplay(regions: readonly SipPanelRegion[]): SipPanelRegion[] {
  return [...regions].sort((a, b) => a.startOffsetMm - b.startOffsetMm || a.index - b.index);
}
