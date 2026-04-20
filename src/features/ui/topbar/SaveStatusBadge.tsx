import type { SaveStatusKind } from "./useTopBarController";

/**
 * Компактный индикатор состояния проекта в верхней панели.
 * Цветовая дифференциация: cloud-saved нейтральный, dirty/saving акцентный, error красный.
 */
export function SaveStatusBadge({
  kind,
  text,
  title,
  className,
}: {
  readonly kind: SaveStatusKind;
  readonly text: string;
  readonly title?: string;
  readonly className?: string;
}) {
  const variantClass =
    kind === "cloud-saved"
      ? "tb-save-badge--saved"
      : kind === "cloud-dirty"
        ? "tb-save-badge--dirty"
        : kind === "cloud-saving"
          ? "tb-save-badge--saving"
          : kind === "cloud-error"
            ? "tb-save-badge--error"
            : kind === "local"
              ? "tb-save-badge--local"
              : "tb-save-badge--guest";
  const cls = ["tb-save-badge", variantClass, className].filter(Boolean).join(" ");
  return (
    <span className={cls} title={title} aria-live="polite" data-status={kind}>
      <span className="tb-save-badge-dot" aria-hidden />
      <span className="tb-save-badge-text">{text}</span>
    </span>
  );
}
