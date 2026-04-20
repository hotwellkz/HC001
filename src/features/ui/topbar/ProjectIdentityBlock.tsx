import { APP_NAME } from "@/shared/constants";

import { SaveStatusBadge } from "./SaveStatusBadge";
import type { SaveStatusKind } from "./useTopBarController";

/**
 * Плотность подписи статуса сохранения.
 *  - "full"    — широкие экраны: «Сохранено в облако», «Локальный файл»…
 *  - "compact" — средняя ширина: «Сохранено», «Локально»…
 *  - "micro"   — очень узко: «В облаке», «Локально»…
 *
 * При любой плотности title (tooltip) бейджа всегда содержит полную подпись,
 * чтобы по hover пользователь видел исходный смысл.
 */
export type StatusDensity = "full" | "compact" | "micro";

const STATUS_LABELS: Record<StatusDensity, Record<SaveStatusKind, string>> = {
  full: {
    "cloud-saved": "Сохранено в облако",
    "cloud-dirty": "Есть изменения",
    "cloud-saving": "Сохраняем…",
    "cloud-error": "Ошибка сохранения",
    local: "Локальный файл",
    guest: "Гость",
  },
  compact: {
    "cloud-saved": "Сохранено",
    "cloud-dirty": "Есть изменения",
    "cloud-saving": "Сохраняем…",
    "cloud-error": "Ошибка",
    local: "Локально",
    guest: "Гость",
  },
  micro: {
    "cloud-saved": "В облаке",
    "cloud-dirty": "Изменения",
    "cloud-saving": "Сохраняем…",
    "cloud-error": "Ошибка",
    local: "Локально",
    guest: "Гость",
  },
};

export function getSaveStatusLabel(kind: SaveStatusKind, density: StatusDensity): string {
  return STATUS_LABELS[density][kind];
}

export interface ProjectIdentityBlockProps {
  /** Название бренда. По умолчанию APP_NAME. */
  readonly appName?: string;
  /** Имя текущего проекта. Если пусто — показываем «Новый проект». */
  readonly projectName: string;
  /** В проекте есть несохранённые изменения — показываем «*». */
  readonly dirty: boolean;
  /** Тип статуса сохранения (cloud-saved / cloud-dirty / saving / error / local / guest). */
  readonly statusKind: SaveStatusKind;
  /** Tooltip для статуса (например, текст ошибки). По умолчанию — полная подпись. */
  readonly statusTitle?: string;
  /** Роль «только просмотр» — показать соответствующий бейдж. */
  readonly isViewerRole: boolean;
  /** Плотность подписи статуса. По умолчанию full. */
  readonly statusDensity?: StatusDensity;
  /** Скрыть бейдж «Только просмотр» (например, на узких desktop-экранах). */
  readonly hideViewerBadge?: boolean;
}

/**
 * Левый блок шапки редактора: бренд · имя проекта · бейдж статуса.
 *
 * Layout-инварианты:
 *  - блок может ужиматься (min-width: 0), но имя проекта обрезается ellipsis;
 *  - бейдж статуса не сжимается (flex-shrink: 0) и не наезжает на title;
 *  - на узких экранах блок целиком переносится во вторую строку (flex-wrap),
 *    бренд и имя остаются вместе, бейдж может встать рядом или ниже.
 */
export function ProjectIdentityBlock({
  appName = APP_NAME,
  projectName,
  dirty,
  statusKind,
  statusTitle,
  isViewerRole,
  statusDensity = "full",
  hideViewerBadge = false,
}: ProjectIdentityBlockProps) {
  const trimmed = (projectName ?? "").trim();
  const displayName = trimmed.length > 0 ? trimmed : "Новый проект";
  const titleAttr = `${appName} — ${displayName}${dirty ? " (есть изменения)" : ""}`;
  const statusText = getSaveStatusLabel(statusKind, statusDensity);
  const fullStatusTitle = statusTitle ?? getSaveStatusLabel(statusKind, "full");

  return (
    <div className="editor-project-identity" data-status-density={statusDensity}>
      <span className="editor-project-brand" title={titleAttr}>
        {appName}
      </span>
      <span className="editor-project-separator" aria-hidden>
        ·
      </span>
      <span className="editor-project-title" title={displayName}>
        {displayName}
        {dirty ? (
          <span className="editor-project-dirty" aria-hidden>
            {" *"}
          </span>
        ) : null}
      </span>
      {isViewerRole && !hideViewerBadge ? (
        <span
          className="editor-project-readonly"
          title="У вашей роли только просмотр. Сохранение и редактирование облачного проекта недоступны."
        >
          Только просмотр
        </span>
      ) : null}
      <SaveStatusBadge
        kind={statusKind}
        text={statusText}
        title={fullStatusTitle}
        className="editor-project-status"
      />
    </div>
  );
}
