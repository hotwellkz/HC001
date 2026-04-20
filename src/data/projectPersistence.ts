import type { Project } from "@/core/domain/project";
import { createEmptyProject } from "@/core/domain/projectFactory";
import { projectToWire } from "@/core/io/projectWire";
import { tryGetFirestoreDb } from "@/firebase/app";
import { isFirebaseConfigured } from "@/firebase/config";
import { useAppStore } from "@/store/useAppStore";
import { initialProjectHistory } from "@/store/projectHistory";

import {
  createProjectInDb,
  getMostRecentProjectId,
  loadProjectById,
  updateProjectSnapshot,
} from "./projectFirestoreRepository";
import { getLastOpenedProjectId, setLastOpenedProjectId } from "./lastOpenedProjectId";

const DEBOUNCE_MS = 800;
/** Дебаунс автосохранения для облачных проектов: пользователь должен «отстояться». */
const CLOUD_AUTOSAVE_DEBOUNCE_MS = 1800;

let initStarted = false;
let autosaveSubscribed = false;
/** Пропуск автосохранения при первичной гидрации из Firestore. */
let isPersistenceHydrating = false;
/**
 * Внешний флаг гидрации облачного проекта (включает EditorAppView пока идёт загрузка
 * project.json из Firestore/Storage). Запрещает любые автосейвы, чтобы не записать
 * пустой стартовый currentProject поверх реального содержимого.
 */
let isCloudHydrating = false;

export function setCloudHydrating(v: boolean): void {
  isCloudHydrating = v;
  if (v) {
    if (cloudDebounceTimer) {
      clearTimeout(cloudDebounceTimer);
      cloudDebounceTimer = null;
    }
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let cloudDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let cloudSaveInFlight = false;
let cloudPendingResave = false;

function scheduleAutosave(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flushAutosave();
  }, DEBOUNCE_MS);
}

async function flushAutosave(): Promise<void> {
  if (isPersistenceHydrating) {
    return;
  }
  const db = tryGetFirestoreDb();
  const { persistenceReady, firestoreEnabled, currentProject, cloudWorkspace } = useAppStore.getState();
  if (!db || !persistenceReady || !firestoreEnabled || cloudWorkspace != null) {
    return;
  }
  const savedWire = projectToWire(currentProject);
  try {
    useAppStore.setState({ persistenceStatus: "saving" });
    await updateProjectSnapshot(db, currentProject);
    const now = useAppStore.getState().currentProject;
    const same = JSON.stringify(projectToWire(now)) === JSON.stringify(savedWire);
    useAppStore.setState({
      persistenceStatus: "saved",
      ...(same ? { dirty: false } : {}),
      lastError: null,
    });
  } catch (e) {
    console.error("[Firestore autosave]", e);
    useAppStore.setState({
      persistenceStatus: "error",
      lastError: e instanceof Error ? `Firestore: ${e.message}` : "Ошибка сохранения в Firestore",
    });
  }
}

function scheduleCloudAutosave(): void {
  if (cloudDebounceTimer) {
    clearTimeout(cloudDebounceTimer);
  }
  cloudDebounceTimer = setTimeout(() => {
    cloudDebounceTimer = null;
    void flushCloudAutosave();
  }, CLOUD_AUTOSAVE_DEBOUNCE_MS);
}

async function flushCloudAutosave(): Promise<void> {
  if (isCloudHydrating || isPersistenceHydrating) {
    return;
  }
  if (cloudSaveInFlight) {
    cloudPendingResave = true;
    return;
  }
  const state = useAppStore.getState();
  const ws = state.cloudWorkspace;
  if (!ws || !state.persistenceReady) {
    return;
  }
  if (!ws.canSave) {
    return;
  }
  if (!state.dirty) {
    return;
  }
  const project = state.currentProject;
  if (project.meta.id !== ws.projectId) {
    if (import.meta.env.DEV) {
      console.warn("[cloud autosave] project id != workspace id, пропускаем", {
        project: project.meta.id,
        workspace: ws.projectId,
      });
    }
    return;
  }
  cloudSaveInFlight = true;
  useAppStore.setState({ cloudManualSavePhase: "saving", cloudSaveError: null });

  try {
    const { saveProject: saveCloud } = await import("@/features/workspace/projectCloudService");
    const meta = await saveCloud(ws.companyId, ws.projectId, ws.userId, project, ws.companyId);
    const next = useAppStore.getState();
    const stillSame = next.currentProject === project;
    useAppStore.setState({
      cloudManualSavePhase: "idle",
      cloudSaveError: null,
      cloudLastSavedAt: meta.updatedAt,
      ...(stillSame ? { dirty: false } : {}),
    });
    if (import.meta.env.DEV) {
      console.debug("[cloud autosave] saved", { projectId: ws.projectId, updatedAt: meta.updatedAt });
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("[cloud autosave] failed", e);
    }
    const msg = e instanceof Error ? e.message : "Ошибка автосохранения в облако";
    useAppStore.setState({ cloudManualSavePhase: "error", cloudSaveError: msg });
  } finally {
    cloudSaveInFlight = false;
    if (cloudPendingResave) {
      cloudPendingResave = false;
      scheduleCloudAutosave();
    }
  }
}

function subscribeAutosave(): void {
  if (autosaveSubscribed) {
    return;
  }
  autosaveSubscribed = true;
  useAppStore.subscribe((state, prev) => {
    if (isPersistenceHydrating || isCloudHydrating) {
      return;
    }
    if (!state.persistenceReady) {
      return;
    }
    if (state.currentProject === prev.currentProject) {
      return;
    }
    if (state.cloudWorkspace != null) {
      if (!state.dirty) {
        return;
      }
      scheduleCloudAutosave();
      return;
    }
    if (!state.firestoreEnabled) {
      return;
    }
    scheduleAutosave();
  });
}

export type InitProjectPersistenceOptions = {
  /** Не подменять текущий проект из legacy-коллекции `projects` (для /app?projectId или демо). */
  readonly skipHydrate?: boolean;
};

/**
 * Стартовая загрузка: lastOpened → последний документ → новый проект в Firestore.
 */
export async function initProjectPersistence(opts?: InitProjectPersistenceOptions): Promise<void> {
  if (initStarted) {
    return;
  }
  initStarted = true;

  if (opts?.skipHydrate) {
    if (!isFirebaseConfigured()) {
      console.warn("[SIP] Firebase не настроен: задайте VITE_FIREBASE_* в .env — проект только в памяти до обновления страницы.");
      useAppStore.setState({
        persistenceReady: true,
        firestoreEnabled: false,
        persistenceStatus: "idle",
        lastError: null,
      });
    } else {
      const dbSkip = tryGetFirestoreDb();
      useAppStore.setState({
        persistenceReady: true,
        firestoreEnabled: !!dbSkip,
        persistenceStatus: "idle",
        lastError: null,
      });
    }
    subscribeAutosave();
    return;
  }

  if (!isFirebaseConfigured()) {
    console.warn("[SIP] Firebase не настроен: задайте VITE_FIREBASE_* в .env — проект только в памяти до обновления страницы.");
    useAppStore.setState({
      persistenceReady: true,
      firestoreEnabled: false,
      persistenceStatus: "idle",
      lastError: null,
    });
    subscribeAutosave();
    return;
  }

  const db = tryGetFirestoreDb();
  if (!db) {
    useAppStore.setState({
      persistenceReady: true,
      firestoreEnabled: false,
      persistenceStatus: "error",
      lastError: "Не удалось инициализировать Firestore.",
    });
    subscribeAutosave();
    return;
  }

  try {
    useAppStore.setState({ persistenceStatus: "loading" });
    isPersistenceHydrating = true;

    let project: Project | null = null;
    const lastId = getLastOpenedProjectId();
    if (lastId) {
      try {
        project = await loadProjectById(db, lastId);
      } catch (e) {
        console.warn("[Firestore] Не удалось загрузить lastOpenedProjectId:", e);
      }
    }
    if (!project) {
      const recentId = await getMostRecentProjectId(db);
      if (recentId) {
        try {
          project = await loadProjectById(db, recentId);
          if (project) {
            setLastOpenedProjectId(recentId);
          }
        } catch (e) {
          console.warn("[Firestore] Не удалось загрузить последний проект:", e);
        }
      }
    }
    if (!project) {
      project = createEmptyProject();
      await createProjectInDb(db, project);
      setLastOpenedProjectId(project.meta.id);
    } else {
      setLastOpenedProjectId(project.meta.id);
    }

    useAppStore.setState({
      currentProject: project,
      viewport2d: project.viewState.viewport2d,
      viewport3d: project.viewState.viewport3d,
      activeTab: project.viewState.activeTab,
      selectedEntityIds: [],
      dirty: false,
      history: initialProjectHistory,
      wallPlacementHistoryBaseline: null,
      pendingOpeningPlacementHistoryBaseline: null,
      wallMoveCopyHistoryBaseline: null,
      lengthChangeHistoryBaseline: null,
      pendingWindowPlacement: null,
      pendingDoorPlacement: null,
      lastWindowPlacementParams: null,
      lastDoorPlacementParams: null,
      persistenceReady: true,
      firestoreEnabled: true,
      persistenceStatus: "saved",
      lastError: null,
    });
  } catch (e) {
    console.error("[Firestore] Ошибка начальной загрузки:", e);
    const fallback = createEmptyProject();
    useAppStore.setState({
      currentProject: fallback,
      viewport2d: fallback.viewState.viewport2d,
      viewport3d: fallback.viewState.viewport3d,
      activeTab: fallback.viewState.activeTab,
      selectedEntityIds: [],
      dirty: false,
      history: initialProjectHistory,
      wallPlacementHistoryBaseline: null,
      pendingOpeningPlacementHistoryBaseline: null,
      wallMoveCopyHistoryBaseline: null,
      lengthChangeHistoryBaseline: null,
      pendingWindowPlacement: null,
      pendingDoorPlacement: null,
      lastWindowPlacementParams: null,
      lastDoorPlacementParams: null,
      persistenceReady: true,
      firestoreEnabled: true,
      persistenceStatus: "error",
      lastError: e instanceof Error ? `Firestore: ${e.message}` : "Ошибка загрузки проекта",
    });
  } finally {
    queueMicrotask(() => {
      isPersistenceHydrating = false;
    });
    subscribeAutosave();
  }
}
