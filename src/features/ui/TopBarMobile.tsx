import { Menu, Redo2, Undo2 } from "lucide-react";

import { CloudSaveButton } from "@/features/ui/topbar/CloudSaveButton";
import { getSaveStatusLabel } from "@/features/ui/topbar/ProjectIdentityBlock";
import { SaveStatusBadge } from "@/features/ui/topbar/SaveStatusBadge";
import { useTopBarController } from "@/features/ui/topbar/useTopBarController";
import { APP_NAME } from "@/shared/constants";
import { LucideToolIcon } from "@/shared/ui/LucideToolIcon";
import { useAppStore } from "@/store/useAppStore";

import "./top-bar.css";

/**
 * Мобильная шапка: бренд + проект + короткий статус.
 * Основные действия (Проекты, Команда, Файл, Сохранить в облако, Демо, Выйти)
 * собраны в bottom-sheet «Меню» (см. MobileChrome.MainMenuSheet) и не наезжают
 * на инструменты редактора.
 */
export function TopBarMobile() {
  const { state, actions } = useTopBarController();
  const canUndo = useAppStore((s) => s.history.past.length > 0);
  const canRedo = useAppStore((s) => s.history.future.length > 0);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const openMobileSheet = useAppStore((s) => s.openMobileSheet);

  const cloudSaveDisabled = state.mode === "guest" ? false : !state.canCloudPersist;
  const cloudSaveLoading = state.statusKind === "cloud-saving";
  const projectName = (state.projectName ?? "").trim() || "Новый проект";
  const compactStatusText = getSaveStatusLabel(state.statusKind, "compact");
  const fullStatusTitle = state.statusTitle ?? getSaveStatusLabel(state.statusKind, "full");

  return (
    <header className="shell-top shell-top--mobile">
      <div className="shell-top-mobile-row">
        <button
          type="button"
          className="tb-mobile-icon-btn"
          aria-label="Открыть меню"
          title="Меню"
          onClick={() => openMobileSheet("mainMenu")}
        >
          <LucideToolIcon icon={Menu} className="tb-keys-icon" />
        </button>

        <div className="tb-mobile-title" title={`${APP_NAME} — ${projectName}`}>
          <span className="tb-mobile-brand">{APP_NAME}</span>
          <span className="tb-mobile-project" title={projectName}>
            {projectName}
            {state.dirty ? " *" : ""}
          </span>
          {state.isViewerRole ? <span className="tb-readonly-badge">Только просмотр</span> : null}
        </div>

        <div className="tb-mobile-actions">
          <button
            type="button"
            className="tb-mobile-icon-btn"
            title="Отменить"
            aria-label="Отменить"
            disabled={!canUndo}
            onClick={() => undo()}
          >
            <LucideToolIcon icon={Undo2} className="tb-keys-icon" />
          </button>
          <button
            type="button"
            className="tb-mobile-icon-btn"
            title="Повторить"
            aria-label="Повторить"
            disabled={!canRedo}
            onClick={() => redo()}
          >
            <LucideToolIcon icon={Redo2} className="tb-keys-icon" />
          </button>
          {state.showCloudSaveButton ? (
            <CloudSaveButton
              label={state.cloudSaveLabel}
              title={state.cloudSaveTitle}
              disabled={cloudSaveDisabled}
              loading={cloudSaveLoading}
              iconOnly
              variant="primary"
              onClick={actions.onCloudSave}
            />
          ) : null}
        </div>
      </div>
      <div className="shell-top-mobile-status-row">
        <SaveStatusBadge
          kind={state.statusKind}
          text={compactStatusText}
          title={fullStatusTitle}
          className="tb-save-badge--mobile"
        />
      </div>
    </header>
  );
}
