import type { Profile } from "./profile";
import type { Project } from "./project";
import type { Wall } from "./wall";

import { segmentLengthMm } from "./wallOps";

/** Нормализация префикса: trim; пустая строка — недопустима при сохранении профиля «стена». */
export function normalizeMarkPrefix(raw: string | undefined): string {
  return String(raw ?? "").trim();
}

/**
 * Префикс для нумерации новых стен: из профиля или запасной из имени.
 * Используется при коммите, если валидация профиля уже прошла.
 */
export function effectiveMarkPrefixForProfile(profile: Profile): string {
  const n = normalizeMarkPrefix(profile.markPrefix);
  if (n) {
    return n;
  }
  const slug = profile.name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9А-Яа-яЁё_-]/g, "")
    .slice(0, 24);
  return slug || "W";
}

/** Максимальный уже занятый номер для префикса в проекте (без пересчёта при удалении). */
export function maxMarkSequenceForPrefix(project: Project, prefix: string): number {
  let max = 0;
  for (const w of project.walls) {
    if (w.markPrefix === prefix && w.markSequenceNumber != null && Number.isFinite(w.markSequenceNumber)) {
      const n = Math.floor(w.markSequenceNumber);
      if (n > max) {
        max = n;
      }
    }
  }
  return max;
}

export interface WallMarkAssignment {
  readonly markPrefix: string;
  readonly markSequenceNumber: number;
  readonly markLabel: string;
}

/**
 * Выдать следующие `count` марок подряд для профиля (по текущему состоянию project, без новых стен).
 */
export function allocateNextWallMarks(project: Project, profile: Profile, count: number): WallMarkAssignment[] {
  if (count < 1) {
    return [];
  }
  const prefix = effectiveMarkPrefixForProfile(profile);
  let seq = maxMarkSequenceForPrefix(project, prefix);
  const out: WallMarkAssignment[] = [];
  for (let i = 0; i < count; i++) {
    seq += 1;
    out.push({
      markPrefix: prefix,
      markSequenceNumber: seq,
      markLabel: `${prefix}_${seq}`,
    });
  }
  return out;
}

/** Минимальная длина стены на экране (px), ниже неё подпись не рисуем. */
export const MIN_WALL_MARK_SCREEN_LENGTH_PX = 36;

export function wallSegmentScreenLengthPx(w: Wall, zoomPixelsPerMm: number): number {
  return segmentLengthMm(w.start, w.end) * zoomPixelsPerMm;
}
