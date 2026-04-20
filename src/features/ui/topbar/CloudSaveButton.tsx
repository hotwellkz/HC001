import { CloudUpload } from "lucide-react";

import { LucideToolIcon } from "@/shared/ui/LucideToolIcon";

/**
 * Кнопка «Сохранить в облако».
 * Появляется только когда облачное сохранение действительно полезно
 * (см. useTopBarController.showCloudSaveButton). Для viewer disabled.
 */
export function CloudSaveButton({
  label,
  title,
  disabled,
  loading,
  variant = "primary",
  iconOnly,
  onClick,
}: {
  readonly label: string;
  readonly title: string;
  readonly disabled: boolean;
  readonly loading: boolean;
  readonly variant?: "primary" | "ghost";
  readonly iconOnly?: boolean;
  readonly onClick: () => void;
}) {
  const cls = [
    "tb-cloud-save-btn",
    variant === "primary" ? "tb-cloud-save-btn--primary" : "tb-cloud-save-btn--ghost",
    iconOnly ? "tb-cloud-save-btn--icon" : null,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type="button"
      className={cls}
      title={title}
      aria-label={iconOnly ? label : undefined}
      disabled={disabled}
      onClick={onClick}
    >
      <LucideToolIcon icon={CloudUpload} className="tb-cloud-save-icon" />
      {iconOnly ? null : <span className="tb-cloud-save-label">{loading ? "Сохраняем…" : label}</span>}
    </button>
  );
}
