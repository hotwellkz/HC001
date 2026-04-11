/** Отступ меню от якоря (кнопки). */
export const ANCHORED_POPOVER_GAP_PX = 6;

/** Поля от краёв viewport при клампе позиции. */
export const ANCHORED_POPOVER_VIEWPORT_MARGIN_PX = 8;

/**
 * Позиция fixed-popover: по умолчанию ниже якоря, выравнивание по правому краю кнопки;
 * при нехватке места снизу — выше; затем кламп в пределах viewport.
 */
export function computeAnchoredPopoverPosition(
  anchor: DOMRectReadOnly,
  menuWidth: number,
  menuHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): { left: number; top: number } {
  const m = ANCHORED_POPOVER_VIEWPORT_MARGIN_PX;
  const gap = ANCHORED_POPOVER_GAP_PX;

  let left = anchor.right - menuWidth;
  let top = anchor.bottom + gap;

  if (top + menuHeight > viewportHeight - m) {
    top = anchor.top - gap - menuHeight;
  }

  const maxLeft = Math.max(m, viewportWidth - m - menuWidth);
  const maxTop = Math.max(m, viewportHeight - m - menuHeight);
  left = Math.min(Math.max(left, m), maxLeft);
  top = Math.min(Math.max(top, m), maxTop);

  return { left, top };
}
