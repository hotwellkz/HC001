import type { Project } from "./project";
import type { LumberPiece, LumberRole } from "./wallCalculation";

export function getWallLumberPieces(project: Project, wallId: string): readonly LumberPiece[] {
  const out: LumberPiece[] = [];
  for (const c of project.wallCalculations) {
    if (c.wallId !== wallId) {
      continue;
    }
    for (const p of c.lumberPieces) {
      out.push(p);
    }
  }
  return [...out].sort((a, b) => a.sortKey - b.sortKey);
}

export function getProjectLumberPieces(project: Project): readonly LumberPiece[] {
  const out: LumberPiece[] = [];
  for (const c of project.wallCalculations) {
    out.push(...c.lumberPieces);
  }
  return [...out].sort((a, b) => {
    if (a.wallId !== b.wallId) {
      return a.wallId.localeCompare(b.wallId);
    }
    return a.sortKey - b.sortKey;
  });
}

export function sectionKeyForLumber(p: LumberPiece): string {
  return `${Math.round(p.sectionThicknessMm)}x${Math.round(p.sectionDepthMm)}`;
}

export function groupLumberBySection(pieces: readonly LumberPiece[]): Map<string, LumberPiece[]> {
  const m = new Map<string, LumberPiece[]>();
  for (const p of pieces) {
    const k = sectionKeyForLumber(p);
    const arr = m.get(k) ?? [];
    arr.push(p);
    m.set(k, arr);
  }
  return m;
}

export function groupLumberByRole(pieces: readonly LumberPiece[]): Map<LumberRole, LumberPiece[]> {
  const m = new Map<LumberRole, LumberPiece[]>();
  for (const p of pieces) {
    const arr = m.get(p.role) ?? [];
    arr.push(p);
    m.set(p.role, arr);
  }
  return m;
}

export function groupLumberByWall(pieces: readonly LumberPiece[]): Map<string, LumberPiece[]> {
  const m = new Map<string, LumberPiece[]>();
  for (const p of pieces) {
    const arr = m.get(p.wallId) ?? [];
    arr.push(p);
    m.set(p.wallId, arr);
  }
  return m;
}

/** Группировка по сечению и длине (длина в мм, округлённая). */
/** Группировка только по длине (мм, округлённо). */
export function groupLumberByLength(pieces: readonly LumberPiece[]): Map<number, LumberPiece[]> {
  const m = new Map<number, LumberPiece[]>();
  for (const p of pieces) {
    const len = Math.round(p.lengthMm);
    const arr = m.get(len) ?? [];
    arr.push(p);
    m.set(len, arr);
  }
  return m;
}

export function groupLumberBySectionAndLength(
  pieces: readonly LumberPiece[],
): Map<string, LumberPiece[]> {
  const m = new Map<string, LumberPiece[]>();
  for (const p of pieces) {
    const k = `${sectionKeyForLumber(p)}@${Math.round(p.lengthMm)}`;
    const arr = m.get(k) ?? [];
    arr.push(p);
    m.set(k, arr);
  }
  return m;
}

export interface PrecutSummaryRow {
  readonly sectionKey: string;
  readonly lengthMm: number;
  readonly count: number;
  readonly pieceMarks: readonly string[];
  readonly roles: readonly LumberRole[];
}

/**
 * Сводка для будущего раскроя: сечение × длина → количество и марки деталей.
 */
export function buildPreCutSummary(project: Project): readonly PrecutSummaryRow[] {
  const pieces = getProjectLumberPieces(project);
  const bySecLen = groupLumberBySectionAndLength(pieces);
  const rows: PrecutSummaryRow[] = [];
  for (const [, group] of bySecLen) {
    if (group.length === 0) {
      continue;
    }
    const first = group[0]!;
    rows.push({
      sectionKey: sectionKeyForLumber(first),
      lengthMm: Math.round(first.lengthMm),
      count: group.length,
      pieceMarks: group.map((p) => p.pieceMark),
      roles: [...new Set(group.map((p) => p.role))],
    });
  }
  return [...rows].sort((a, b) => {
    if (a.sectionKey !== b.sectionKey) {
      return a.sectionKey.localeCompare(b.sectionKey);
    }
    return b.lengthMm - a.lengthMm;
  });
}
