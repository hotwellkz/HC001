import { useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthProvider";
import { canEditCloudProjects } from "@/features/company/companyTeamService";
import { useAppStore } from "@/store/useAppStore";

import "./editorCloudExportModal.css";

/**
 * Модалка «Сохранить проект в облако» для локально открытого проекта.
 * После успеха переводит редактор в облачный режим и заменяет URL на /app?projectId=...
 */
export function EditorCloudExportModal() {
  const navigate = useNavigate();
  const titleId = useId();
  const { user, profile, activeCompanyMember, isAuthenticated } = useAuth();

  const open = useAppStore((s) => s.cloudExportModalOpen);
  const close = useAppStore((s) => s.closeCloudExportModal);
  const cloudWorkspace = useAppStore((s) => s.cloudWorkspace);
  const cloudPhase = useAppStore((s) => s.cloudManualSavePhase);
  const cloudSaveError = useAppStore((s) => s.cloudSaveError);
  const projectName = useAppStore((s) => s.currentProject.meta.name);

  const userId = user?.uid ?? profile?.id ?? null;
  const companyId = profile?.activeCompanyId ?? null;
  const canSave = canEditCloudProjects(activeCompanyMember?.role);

  const initialName = useMemo(() => {
    const trimmed = (projectName ?? "").trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
    return "Новый проект";
  }, [projectName]);

  const [name, setName] = useState(initialName);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setLocalError(null);
    }
  }, [open, initialName]);

  if (!open) {
    return null;
  }

  const busy = cloudPhase === "saving";
  const trimmed = name.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) {
      return;
    }
    setLocalError(null);

    if (!isAuthenticated) {
      setLocalError("Войдите в аккаунт, чтобы сохранять проекты в облако.");
      return;
    }
    if (!companyId) {
      setLocalError("Не найдено рабочее пространство. Создайте компанию или войдите заново.");
      return;
    }
    if (!userId) {
      setLocalError("Сессия не готова, попробуйте через несколько секунд.");
      return;
    }
    if (!canSave) {
      setLocalError("У вашей роли нет прав на сохранение в облако.");
      return;
    }
    if (trimmed.length === 0) {
      setLocalError("Введите название проекта.");
      return;
    }

    if (cloudWorkspace) {
      void useAppStore.getState().saveCurrentProjectToCloud(userId, companyId);
      close();
      return;
    }

    const result = await useAppStore
      .getState()
      .saveCurrentProjectAsNewCloud(trimmed, userId, companyId, canSave);
    if (result) {
      navigate(`/app?projectId=${encodeURIComponent(result.projectId)}`, { replace: true });
      close();
    }
  };

  return (
    <div className="cloud-export-modal-root" role="presentation">
      <button
        type="button"
        className="cloud-export-modal-backdrop"
        aria-label="Закрыть"
        onClick={() => !busy && close()}
      />
      <div
        className="cloud-export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="cloud-export-modal-title">
          {cloudWorkspace ? "Сохранить проект в облако" : "Сохранить проект в облако"}
        </h2>
        <p className="cloud-export-modal-sub">
          {cloudWorkspace
            ? "Текущий облачный проект будет обновлён."
            : "Будет создан новый проект в рабочем пространстве компании."}
        </p>
        <form className="cloud-export-modal-form" onSubmit={(e) => void handleSubmit(e)}>
          <label className="cloud-export-modal-label">
            Название проекта
            <input
              className="cloud-export-modal-input"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              autoFocus
              disabled={busy}
              maxLength={120}
            />
          </label>
          {localError ? (
            <div className="cloud-export-modal-alert" role="alert">
              {localError}
            </div>
          ) : null}
          {!localError && cloudPhase === "error" && cloudSaveError ? (
            <div className="cloud-export-modal-alert" role="alert">
              {cloudSaveError}
            </div>
          ) : null}
          <div className="cloud-export-modal-actions">
            <button
              type="button"
              className="btn"
              onClick={() => close()}
              disabled={busy}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn cloud-export-modal-primary"
              disabled={busy || !canSave || trimmed.length === 0}
              title={!canSave ? "У вас роль просмотра. Сохранение недоступно." : undefined}
            >
              {busy ? "Сохраняем…" : "Сохранить в облако"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
