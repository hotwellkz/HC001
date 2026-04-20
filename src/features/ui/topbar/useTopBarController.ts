import { useNavigate, useSearchParams } from "react-router-dom";

import { signOutEverywhere } from "@/features/auth/authActions";
import { useAuth } from "@/features/auth/AuthProvider";
import { canEditCloudProjects } from "@/features/company/companyTeamService";
import { projectCommands } from "@/features/project/commands";
import { useAppStore } from "@/store/useAppStore";

/**
 * Состояние и действия верхней панели — общая шина для desktop и mobile.
 *
 * Разделяет проект на 3 режима:
 *  - "cloud"  — открыт облачный проект, работает автосохранение;
 *  - "local"  — открыт локальный .sipproj (есть auth + companyId), можно импортировать в облако;
 *  - "guest"  — пользователь не вошёл / нет companyId — облачные действия зовут в /login.
 *
 * Тексты статусов соответствуют требованиям дизайна:
 *  - «Сохранено в облаке» / «Есть изменения» / «Сохраняем…» / «Ошибка сохранения»
 *  - «Локальный проект»
 *  - «Гость»
 */
export type ProjectMode = "cloud" | "local" | "guest";

export type SaveStatusKind = "cloud-saved" | "cloud-dirty" | "cloud-saving" | "cloud-error" | "local" | "guest";

export interface TopBarState {
  readonly projectName: string;
  readonly dirty: boolean;
  readonly mode: ProjectMode;
  readonly statusKind: SaveStatusKind;
  readonly statusText: string;
  readonly statusTitle: string | undefined;
  readonly isViewerRole: boolean;
  readonly canCloudPersist: boolean;
  readonly canShowCloudControls: boolean;
  readonly showCloudSaveButton: boolean;
  readonly showWorkspaceNav: boolean;
  readonly isAuthenticated: boolean;
  readonly isDemo: boolean;
  readonly cloudSaveLabel: string;
  readonly cloudSaveTitle: string;
}

export interface TopBarActions {
  readonly onCloudSave: () => void;
  readonly onLogout: () => void;
  readonly goToLogin: () => void;
  readonly goToProjects: () => void;
  readonly goToTeam: () => void;
  readonly newProject: () => void;
  readonly openLocalFile: () => void;
  readonly downloadLocalFile: () => void;
  readonly openDemo: () => void;
}

export function useTopBarController(): { state: TopBarState; actions: TopBarActions } {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const { user, profile, isAuthenticated, activeCompanyMember } = useAuth();

  const cloudWorkspace = useAppStore((s) => s.cloudWorkspace);
  const cloudManualSavePhase = useAppStore((s) => s.cloudManualSavePhase);
  const cloudSaveError = useAppStore((s) => s.cloudSaveError);
  const projectName = useAppStore((s) => s.currentProject.meta.name);
  const dirty = useAppStore((s) => s.dirty);

  const effectiveUid = user?.uid ?? profile?.id ?? null;
  const companyIdForCloud = profile?.activeCompanyId ?? null;
  const showWorkspaceNav = isAuthenticated && !isDemo;
  const canShowCloudControls = isAuthenticated && !isDemo && !!companyIdForCloud;
  const canCloudPersist = canEditCloudProjects(activeCompanyMember?.role);
  const isViewerRole = canShowCloudControls && activeCompanyMember?.role === "viewer";

  let mode: ProjectMode;
  if (cloudWorkspace) {
    mode = "cloud";
  } else if (canShowCloudControls) {
    mode = "local";
  } else {
    mode = "guest";
  }

  let statusKind: SaveStatusKind;
  let statusText: string;
  let statusTitle: string | undefined;
  if (mode === "cloud") {
    if (cloudManualSavePhase === "saving") {
      statusKind = "cloud-saving";
      statusText = "Сохраняем…";
    } else if (cloudManualSavePhase === "error") {
      statusKind = "cloud-error";
      statusText = "Ошибка сохранения";
      statusTitle = cloudSaveError ?? statusText;
    } else if (dirty) {
      statusKind = "cloud-dirty";
      statusText = "Есть изменения";
    } else {
      statusKind = "cloud-saved";
      statusText = "Сохранено в облаке";
    }
  } else if (mode === "local") {
    statusKind = "local";
    statusText = "Локальный проект";
    statusTitle = "Проект открыт локально и пока не сохранён в облаке.";
  } else {
    statusKind = "guest";
    statusText = "Гость";
    statusTitle = "Войдите, чтобы сохранять проекты в облаке.";
  }

  // Кнопка «Сохранить в облако» появляется только когда она реально полезна:
  //   - облачный проект с несохранёнными изменениями / ошибкой сохранения / в процессе;
  //   - локальный проект (импорт в облако) — у авторизованного с companyId;
  //   - гость — переводим на /login (полезно даже без изменений).
  const showCloudSaveButton =
    mode === "guest"
      ? false // в desktop-кнопку не выносим, есть «Войти»; в File menu — отдельным пунктом
      : mode === "local"
        ? true
        : dirty || cloudManualSavePhase === "saving" || cloudManualSavePhase === "error";

  const cloudSaveLabel = (() => {
    if (cloudManualSavePhase === "saving") return "Сохраняем…";
    return "Сохранить в облако";
  })();
  const cloudSaveTitle = !canCloudPersist
    ? "У вас роль просмотра. Сохранение недоступно."
    : mode === "cloud"
      ? "Сохранить сейчас в облако"
      : mode === "local"
        ? "Сохранить локальный проект как новый облачный"
        : "Войдите, чтобы сохранять в облаке";

  const onCloudSave = () => {
    if (mode === "guest") {
      navigate("/login");
      return;
    }
    if (!effectiveUid || !canCloudPersist || !companyIdForCloud) {
      return;
    }
    if (cloudWorkspace) {
      void useAppStore.getState().saveCurrentProjectToCloud(effectiveUid, companyIdForCloud);
      return;
    }
    useAppStore.getState().openCloudExportModal();
  };

  const onLogout = () => {
    void signOutEverywhere().then(() => navigate("/"));
  };

  const goToLogin = () => navigate("/login");
  const goToProjects = () => navigate("/app/projects");
  const goToTeam = () => navigate("/app/team");
  const newProject = () => projectCommands.createNew();
  const openLocalFile = () => void projectCommands.open();
  const downloadLocalFile = () => void projectCommands.save();
  const openDemo = () => projectCommands.bootstrapDemo();

  return {
    state: {
      projectName,
      dirty,
      mode,
      statusKind,
      statusText,
      statusTitle,
      isViewerRole: !!isViewerRole,
      canCloudPersist,
      canShowCloudControls,
      showCloudSaveButton,
      showWorkspaceNav,
      isAuthenticated,
      isDemo,
      cloudSaveLabel,
      cloudSaveTitle,
    },
    actions: {
      onCloudSave,
      onLogout,
      goToLogin,
      goToProjects,
      goToTeam,
      newProject,
      openLocalFile,
      downloadLocalFile,
      openDemo,
    },
  };
}
