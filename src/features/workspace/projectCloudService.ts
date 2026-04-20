/**
 * Облачные проекты компании: Firestore meta + Storage (или встроенный JSON в Firestore) / mock localStorage.
 */

import {
  type Firestore,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { deleteObject, getBytes, ref, uploadString } from "firebase/storage";

import type { Project } from "@/core/domain/project";
import { newEntityId } from "@/core/domain/ids";
import { createEmptyProject } from "@/core/domain/projectFactory";
import type { ProjectMeta } from "@/core/company/orgTypes";
import { tryGetFirestoreDb } from "@/firebase/app";
import { tryGetFirebaseStorage } from "@/firebase/storageClient";

import {
  buildCloudProjectFile,
  cloudProjectFileJsonString,
  parseCloudProjectFileJson,
  tryParseProjectFromUnknownJson,
} from "./cloudProjectPayload";

const MOCK_PREFIX = "housekit.projects.v1.";
const CLOUD_OP_TIMEOUT_MS = 15_000;

function assertCompany(companyId: string, activeCompanyId: string | undefined | null): void {
  if (!activeCompanyId || activeCompanyId !== companyId) {
    throw new Error("Нет доступа к проектам этой компании.");
  }
}

function useFirebase(): boolean {
  return tryGetFirestoreDb() != null;
}

function devLog(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.debug("[projects]", ...args);
  }
}

function describeFirebaseError(err: unknown): string {
  if (err && typeof err === "object") {
    const anyErr = err as { code?: string; message?: string };
    if (typeof anyErr.code === "string") {
      if (anyErr.code === "permission-denied") {
        return "Нет прав на создание проекта (Firestore: permission-denied). Проверьте роль и rules.";
      }
      if (anyErr.code === "unavailable" || anyErr.code === "deadline-exceeded") {
        return "Сервис облачных проектов недоступен. Проверьте интернет и попробуйте снова.";
      }
      if (anyErr.code.startsWith("storage/")) {
        return `Ошибка Firebase Storage: ${anyErr.code}. Storage не подключен — отключите VITE_FIREBASE_USE_STORAGE.`;
      }
      return `Ошибка Firebase: ${anyErr.code}.`;
    }
    if (typeof anyErr.message === "string" && anyErr.message.length > 0) {
      return anyErr.message;
    }
  }
  return "Не удалось выполнить операцию.";
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let to: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race<T>([
      p,
      new Promise<T>((_, reject) => {
        to = setTimeout(() => {
          reject(new Error(`Таймаут операции «${label}» (${Math.round(ms / 1000)}с). Проверьте интернет, права доступа или настройки Firebase.`));
        }, ms);
      }),
    ]);
  } finally {
    if (to !== undefined) {
      clearTimeout(to);
    }
  }
}

// ——— Mock ———

type MockEntry = { readonly meta: ProjectMeta; readonly json: string };

function mockRead(companyId: string): MockEntry[] {
  try {
    const raw = localStorage.getItem(MOCK_PREFIX + companyId);
    if (!raw) {
      return [];
    }
    const p = JSON.parse(raw) as { projects?: MockEntry[] };
    return Array.isArray(p.projects) ? p.projects : [];
  } catch {
    return [];
  }
}

function mockWrite(companyId: string, projects: MockEntry[]): void {
  localStorage.setItem(MOCK_PREFIX + companyId, JSON.stringify({ projects }));
}

// ——— Public API ———

export async function listProjects(companyId: string, activeCompanyId: string | undefined | null): Promise<ProjectMeta[]> {
  assertCompany(companyId, activeCompanyId);
  if (!useFirebase()) {
    return mockRead(companyId)
      .map((e) => e.meta)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  const db = tryGetFirestoreDb() as Firestore;
  try {
    const snap = await withTimeout(
      getDocs(collection(db, "companies", companyId, "projects")),
      CLOUD_OP_TIMEOUT_MS,
      "загрузка списка проектов",
    );
    const list = snap.docs.map((d) => d.data() as ProjectMeta);
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("[projects] list failed", err);
    }
    throw new Error(describeFirebaseError(err));
  }
}

async function persistNewCloudProject(
  companyId: string,
  userId: string,
  project: Project,
): Promise<ProjectMeta> {
  const projectId = project.meta.id;
  const now = project.meta.updatedAt ?? new Date().toISOString();

  const file = buildCloudProjectFile(project, userId);
  const json = cloudProjectFileJsonString(file);

  const meta: ProjectMeta = {
    id: projectId,
    companyId,
    name: project.meta.name,
    createdBy: userId,
    updatedBy: userId,
    createdAt: project.meta.createdAt ?? now,
    updatedAt: now,
    schemaVersion: 1,
  };

  if (!useFirebase()) {
    const storagePath = `companies/${companyId}/projects/${projectId}/project.json`;
    const fullMeta = { ...meta, storagePath };
    mockWrite(companyId, [...mockRead(companyId), { meta: fullMeta, json }]);
    return fullMeta;
  }

  const db = tryGetFirestoreDb() as Firestore;
  const storage = tryGetFirebaseStorage();
  const storagePath = `companies/${companyId}/projects/${projectId}/project.json`;

  devLog("create start", { companyId, projectId, userId, useStorage: !!storage, jsonBytes: json.length });

  try {
    if (storage) {
      await withTimeout(
        uploadString(ref(storage, storagePath), json, "raw", { contentType: "application/json" }),
        CLOUD_OP_TIMEOUT_MS,
        "загрузка project.json в Storage",
      );
      await withTimeout(
        setDoc(doc(db, "companies", companyId, "projects", projectId), {
          ...meta,
          storagePath,
        }),
        CLOUD_OP_TIMEOUT_MS,
        "запись метаданных проекта",
      );
      devLog("create success (storage)", projectId);
      return { ...meta, storagePath };
    }

    await withTimeout(
      setDoc(doc(db, "companies", companyId, "projects", projectId), {
        ...meta,
        payloadJson: json,
      }),
      CLOUD_OP_TIMEOUT_MS,
      "создание проекта в Firestore",
    );
    devLog("create success (firestore)", projectId);
    return meta;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("[projects] create failed", err);
    }
    throw new Error(describeFirebaseError(err));
  }
}

export async function createProject(
  companyId: string,
  userId: string,
  name: string,
  activeCompanyId: string | undefined | null,
): Promise<ProjectMeta> {
  assertCompany(companyId, activeCompanyId);
  const projectId = newEntityId();
  const now = new Date().toISOString();
  const base = createEmptyProject();
  const project: Project = {
    ...base,
    meta: {
      ...base.meta,
      id: projectId,
      name: name.trim() || "Новый проект",
      createdAt: now,
      updatedAt: now,
    },
  };
  return persistNewCloudProject(companyId, userId, project);
}

/**
 * Импорт текущего (локально открытого) проекта в облако компании как нового документа.
 * Возвращает обновлённый Project (с новым meta.id/createdAt/updatedAt) и облачную мету.
 */
export async function createCloudProjectFromCurrent(
  companyId: string,
  userId: string,
  name: string,
  sourceProject: Project,
  activeCompanyId: string | undefined | null,
): Promise<{ readonly meta: ProjectMeta; readonly project: Project }> {
  assertCompany(companyId, activeCompanyId);
  const projectId = newEntityId();
  const now = new Date().toISOString();
  const cleanName = name.trim() || sourceProject.meta.name?.trim() || "Новый проект";
  const project: Project = {
    ...sourceProject,
    meta: {
      ...sourceProject.meta,
      id: projectId,
      name: cleanName,
      createdAt: now,
      updatedAt: now,
    },
  };
  const meta = await persistNewCloudProject(companyId, userId, project);
  return { meta, project };
}

export async function loadProject(
  companyId: string,
  projectId: string,
  activeCompanyId: string | undefined | null,
): Promise<{ meta: ProjectMeta; project: Project }> {
  assertCompany(companyId, activeCompanyId);

  if (!useFirebase()) {
    const row = mockRead(companyId).find((e) => e.meta.id === projectId);
    if (!row) {
      throw new Error("Проект не найден или у вас нет доступа.");
    }
    const project = tryParseProjectFromUnknownJson(row.json);
    return { meta: row.meta, project };
  }

  const db = tryGetFirestoreDb() as Firestore;
  const mref = doc(db, "companies", companyId, "projects", projectId);
  try {
    const ms = await withTimeout(getDoc(mref), CLOUD_OP_TIMEOUT_MS, "чтение проекта");
    if (!ms.exists()) {
      throw new Error("Проект не найден или у вас нет доступа.");
    }
    const meta = ms.data() as ProjectMeta & { payloadJson?: string };
    let json: string;
    const storage = tryGetFirebaseStorage();
    if (meta.storagePath && storage) {
      const bytes = await withTimeout(
        getBytes(ref(storage, meta.storagePath)),
        CLOUD_OP_TIMEOUT_MS,
        "загрузка project.json из Storage",
      );
      json = new TextDecoder("utf-8").decode(bytes);
    } else if (meta.payloadJson != null && meta.payloadJson.length > 0) {
      json = meta.payloadJson;
    } else {
      throw new Error("Проект не найден или у вас нет доступа.");
    }
    const project = tryParseProjectFromUnknownJson(json);
    return { meta, project };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("[projects] load failed", err);
    }
    if (err instanceof Error && err.message.startsWith("Проект не найден")) {
      throw err;
    }
    throw new Error(describeFirebaseError(err));
  }
}

export async function saveProject(
  companyId: string,
  projectId: string,
  userId: string,
  project: Project,
  activeCompanyId: string | undefined | null,
): Promise<ProjectMeta> {
  assertCompany(companyId, activeCompanyId);
  if (project.meta.id !== projectId) {
    throw new Error("Идентификатор проекта не совпадает с облачным.");
  }

  const now = new Date().toISOString();
  const touched: Project = {
    ...project,
    meta: { ...project.meta, updatedAt: now },
  };
  const file = buildCloudProjectFile(touched, userId);
  const json = cloudProjectFileJsonString(file);

  if (!useFirebase()) {
    const rows = mockRead(companyId);
    const idx = rows.findIndex((e) => e.meta.id === projectId);
    if (idx < 0) {
      throw new Error("Проект не найден.");
    }
    const prev = rows[idx]!;
    const meta: ProjectMeta = {
      ...prev.meta,
      name: touched.meta.name,
      updatedAt: now,
      updatedBy: userId,
    };
    const next = [...rows];
    next[idx] = { meta, json };
    mockWrite(companyId, next);
    return meta;
  }

  const db = tryGetFirestoreDb() as Firestore;
  const mref = doc(db, "companies", companyId, "projects", projectId);
  try {
    const ms = await withTimeout(getDoc(mref), CLOUD_OP_TIMEOUT_MS, "чтение проекта");
    if (!ms.exists()) {
      throw new Error("Проект не найден.");
    }
    const prevMeta = ms.data() as ProjectMeta & { payloadJson?: string };
    const storage = tryGetFirebaseStorage();

    if (prevMeta.storagePath && storage) {
      await withTimeout(
        uploadString(ref(storage, prevMeta.storagePath), json, "raw", { contentType: "application/json" }),
        CLOUD_OP_TIMEOUT_MS,
        "загрузка project.json в Storage",
      );
      const nextMeta: ProjectMeta = {
        ...prevMeta,
        name: touched.meta.name,
        updatedAt: now,
        updatedBy: userId,
      };
      await withTimeout(
        updateDoc(mref, {
          name: nextMeta.name,
          updatedAt: nextMeta.updatedAt,
          updatedBy: nextMeta.updatedBy,
          payloadJson: deleteField(),
        }),
        CLOUD_OP_TIMEOUT_MS,
        "обновление метаданных",
      );
      return nextMeta;
    }

    const nextMeta: ProjectMeta = {
      ...prevMeta,
      name: touched.meta.name,
      updatedAt: now,
      updatedBy: userId,
    };
    await withTimeout(
      updateDoc(mref, {
        ...nextMeta,
        payloadJson: json,
      }),
      CLOUD_OP_TIMEOUT_MS,
      "сохранение проекта",
    );
    return nextMeta;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("[projects] save failed", err);
    }
    if (err instanceof Error && err.message === "Проект не найден.") {
      throw err;
    }
    throw new Error(describeFirebaseError(err));
  }
}

export async function renameProject(
  companyId: string,
  projectId: string,
  name: string,
  activeCompanyId: string | undefined | null,
): Promise<void> {
  assertCompany(companyId, activeCompanyId);
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Введите название проекта.");
  }

  if (!useFirebase()) {
    const rows = mockRead(companyId);
    const idx = rows.findIndex((e) => e.meta.id === projectId);
    if (idx < 0) {
      return;
    }
    const row = rows[idx]!;
    const project = tryParseProjectFromUnknownJson(row.json);
    const nextProject: Project = {
      ...project,
      meta: { ...project.meta, name: trimmed, updatedAt: new Date().toISOString() },
    };
    const file = buildCloudProjectFile(nextProject, row.meta.updatedBy);
    const json = cloudProjectFileJsonString(file);
    const meta: ProjectMeta = { ...row.meta, name: trimmed, updatedAt: nextProject.meta.updatedAt };
    const copy = [...rows];
    copy[idx] = { meta, json };
    mockWrite(companyId, copy);
    return;
  }

  const db = tryGetFirestoreDb() as Firestore;
  const mref = doc(db, "companies", companyId, "projects", projectId);
  const ms = await getDoc(mref);
  if (!ms.exists()) {
    return;
  }
  const prevMeta = ms.data() as ProjectMeta & { payloadJson?: string };
  let project: Project;
  if (prevMeta.storagePath && tryGetFirebaseStorage()) {
    const bytes = await getBytes(ref(tryGetFirebaseStorage()!, prevMeta.storagePath));
    const json = new TextDecoder("utf-8").decode(bytes);
    project = parseCloudProjectFileJson(json);
  } else if (prevMeta.payloadJson) {
    project = parseCloudProjectFileJson(prevMeta.payloadJson);
  } else {
    return;
  }
  const nextProject: Project = {
    ...project,
    meta: { ...project.meta, name: trimmed, updatedAt: new Date().toISOString() },
  };
  const file = buildCloudProjectFile(nextProject, prevMeta.updatedBy);
  const json = cloudProjectFileJsonString(file);
  const storage = tryGetFirebaseStorage();
  if (prevMeta.storagePath && storage) {
    await uploadString(ref(storage, prevMeta.storagePath), json, "raw", { contentType: "application/json" });
    await updateDoc(mref, { name: trimmed, updatedAt: nextProject.meta.updatedAt });
  } else {
    await updateDoc(mref, {
      name: trimmed,
      updatedAt: nextProject.meta.updatedAt,
      payloadJson: json,
    });
  }
}

export async function deleteProject(
  companyId: string,
  projectId: string,
  activeCompanyId: string | undefined | null,
): Promise<void> {
  assertCompany(companyId, activeCompanyId);

  if (!useFirebase()) {
    mockWrite(
      companyId,
      mockRead(companyId).filter((e) => e.meta.id !== projectId),
    );
    return;
  }

  const db = tryGetFirestoreDb() as Firestore;
  const mref = doc(db, "companies", companyId, "projects", projectId);
  const ms = await getDoc(mref);
  if (ms.exists()) {
    const data = ms.data() as ProjectMeta & { payloadJson?: string };
    const storage = tryGetFirebaseStorage();
    if (data.storagePath && storage) {
      try {
        await deleteObject(ref(storage, data.storagePath));
      } catch {
        /* ignore */
      }
    }
    await deleteDoc(mref);
  }
}
