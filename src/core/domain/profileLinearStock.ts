import type { Profile } from "./profile";
import { DEFAULT_WALL_MANUFACTURING } from "./wallManufacturing";

/**
 * Максимальная длина заготовки/сегмента для линейных профильных элементов (балки перекрытия и т.п.), мм.
 * Явное поле `linearStockMaxLengthMm`; при отсутствии — устаревший fallback на `wallManufacturing.maxBoardLengthMm`
 * (если в старых данных его случайно задавали у профиля не-стены) и промышленный дефолт 6000 мм.
 */
export function resolveLinearStockMaxLengthMm(profile: Profile): number {
  const explicit = profile.linearStockMaxLengthMm;
  if (explicit != null && Number.isFinite(explicit) && explicit > 0) {
    return Math.round(explicit);
  }
  const wm = profile.wallManufacturing?.maxBoardLengthMm;
  if (wm != null && Number.isFinite(wm) && wm > 0) {
    return Math.round(wm);
  }
  return DEFAULT_WALL_MANUFACTURING.maxBoardLengthMm;
}
